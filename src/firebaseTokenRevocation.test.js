const crypto = require("crypto");

const ENV_KEYS = [
  "VERCEL_ENV",
  "FIREBASE_PREVIEW_PROJECT_ID",
  "FIREBASE_PREVIEW_API_KEY",
  "REACT_APP_FIREBASE_PREVIEW_API_KEY",
  "FIREBASE_API_KEY",
  "REACT_APP_FIREBASE_API_KEY",
];

describe("Firebase ID token session status enforcement", () => {
  let originalEnvironment;
  let originalFetch;
  let payments;
  let privateKey;
  let publicJwk;

  beforeEach(() => {
    originalEnvironment = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    originalFetch = global.fetch;
    ENV_KEYS.forEach((key) => delete process.env[key]);
    process.env.VERCEL_ENV = "preview";
    process.env.FIREBASE_PREVIEW_PROJECT_ID = "jjxcapital-preview-test";
    process.env.REACT_APP_FIREBASE_PREVIEW_API_KEY = "preview-web-api-key";

    jest.resetModules();
    jest.clearAllMocks();

    const keyPair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    privateKey = keyPair.privateKey;
    publicJwk = keyPair.publicKey.export({ format: "jwk" });
    publicJwk.kid = "firebase-test-key";

    global.fetch = jest.fn();
    payments = require("../lib/payments");
  });

  afterEach(() => {
    ENV_KEYS.forEach((key) => {
      if (originalEnvironment[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnvironment[key];
    });
    if (originalFetch === undefined) delete global.fetch;
    else global.fetch = originalFetch;
    jest.resetModules();
  });

  function makeToken(authTime = Math.floor(Date.now() / 1000) - 10) {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({
      alg: "RS256",
      typ: "JWT",
      kid: "firebase-test-key",
    })).toString("base64url");
    const claims = Buffer.from(JSON.stringify({
      aud: "jjxcapital-preview-test",
      iss: "https://securetoken.google.com/jjxcapital-preview-test",
      sub: "user-123",
      exp: now + 3600,
      iat: now,
      auth_time: authTime,
    })).toString("base64url");
    const unsignedToken = header + "." + claims;
    const signature = crypto.sign("RSA-SHA256", Buffer.from(unsignedToken), privateKey).toString("base64url");
    return { token: unsignedToken + "." + signature, authTime };
  }

  function mockLookup(account) {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: [publicJwk] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [account] }),
      });
  }

  test("accepts an active account and checks it using the Preview-only API key", async () => {
    const { token, authTime } = makeToken();
    mockLookup({
      localId: "user-123",
      disabled: false,
      validSince: String(authTime - 5),
    });

    const claims = await payments.requireFirebaseUser({
      headers: { authorization: "Bearer " + token },
    });

    expect(claims.sub).toBe("user-123");
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const [lookupUrl, lookupOptions] = global.fetch.mock.calls[1];
    expect(lookupUrl).toContain("key=preview-web-api-key");
    expect(lookupUrl).not.toContain("production");
    expect(JSON.parse(lookupOptions.body)).toEqual({ idToken: token });
  });

  test("rejects a token issued before the account's revocation timestamp", async () => {
    const { token, authTime } = makeToken();
    mockLookup({
      localId: "user-123",
      disabled: false,
      validSince: String(authTime + 1),
    });

    await expect(payments.requireFirebaseUser({
      headers: { authorization: "Bearer " + token },
    })).rejects.toMatchObject({ statusCode: 401 });
  });

  test("rejects a disabled Firebase account", async () => {
    const { token, authTime } = makeToken();
    mockLookup({
      localId: "user-123",
      disabled: true,
      validSince: String(authTime - 5),
    });

    await expect(payments.requireFirebaseUser({
      headers: { authorization: "Bearer " + token },
    })).rejects.toMatchObject({ statusCode: 401 });
  });

  test("fails closed when Firebase cannot confirm the account status", async () => {
    const { token } = makeToken();
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: [publicJwk] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: "INTERNAL_ERROR" } }),
      });

    await expect(payments.requireFirebaseUser({
      headers: { authorization: "Bearer " + token },
    })).rejects.toMatchObject({ statusCode: 503 });
  });

  test("does not fall back to Production API credentials when Preview key is missing", async () => {
    delete process.env.REACT_APP_FIREBASE_PREVIEW_API_KEY;
    process.env.REACT_APP_FIREBASE_API_KEY = "production-browser-key";
    const { token } = makeToken();
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ keys: [publicJwk] }),
    });

    await expect(payments.requireFirebaseUser({
      headers: { authorization: "Bearer " + token },
    })).rejects.toMatchObject({ statusCode: 503 });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("accepts active accounts when Firebase omits default disabled=false and validSince=0 fields", async () => {
    const { token } = makeToken();
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: [publicJwk] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [{ localId: "user-123" }] }),
      });

    const claims = await payments.requireFirebaseUser({
      headers: { authorization: "Bearer " + token },
    });

    expect(claims.sub).toBe("user-123");
  });

  test("rejects malformed explicit account status fields", async () => {
    const { token } = makeToken();
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: [publicJwk] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [{
          localId: "user-123",
          disabled: "false",
          validSince: "0",
        }] }),
      });

    await expect(payments.requireFirebaseUser({
      headers: { authorization: "Bearer " + token },
    })).rejects.toMatchObject({ statusCode: 503 });
  });
});
