const crypto = require("crypto");
const { verifyGitHubActionsOidcToken } = require("../lib/github-actions-oidc");

const keyPair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = {
  ...keyPair.publicKey.export({ format: "jwk" }),
  kid: "test-github-key",
  alg: "RS256",
  use: "sig",
};

function createToken(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({
    alg: "RS256",
    typ: "JWT",
    kid: publicJwk.kid,
  })).toString("base64url");
  const claims = {
    iss: "https://token.actions.githubusercontent.com",
    aud: "jjxcapital-binance-p2p-sync",
    sub: "repo:jeremisoto2026/app.1:ref:refs/heads/main",
    iat: now,
    nbf: now - 1,
    exp: now + 300,
    repository: "jeremisoto2026/app.1",
    repository_id: "1058212998",
    repository_owner: "jeremisoto2026",
    repository_owner_id: "232186349",
    ref: "refs/heads/main",
    workflow_ref: "jeremisoto2026/app.1/.github/workflows/binance-p2p-background-sync.yml@refs/heads/main",
    event_name: "schedule",
    ...overrides,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const unsigned = header + "." + payload;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), keyPair.privateKey).toString("base64url");
  return unsigned + "." + signature;
}

describe("GitHub Actions OIDC verification", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [publicJwk] }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("accepts a correctly signed token from the scheduled JJXCAPITAL workflow", async () => {
    const claims = await verifyGitHubActionsOidcToken(createToken());
    expect(claims.repository_id).toBe("1058212998");
    expect(claims.workflow_ref).toContain("binance-p2p-background-sync.yml");
  });

  test("rejects tokens from another repository even when signed by a valid key", async () => {
    await expect(verifyGitHubActionsOidcToken(
      createToken({ repository: "someone-else/fork" })
    )).rejects.toMatchObject({ statusCode: 403 });
  });

  test("rejects tokens from an unapproved workflow file", async () => {
    await expect(verifyGitHubActionsOidcToken(
      createToken({ workflow_ref: "jeremisoto2026/app.1/.github/workflows/other.yml@refs/heads/main" })
    )).rejects.toMatchObject({ statusCode: 403 });
  });

  test("rejects a tampered token signature", async () => {
    const token = createToken();
    const parts = token.split(".");
    parts[1] = Buffer.from(JSON.stringify({
      iss: "https://token.actions.githubusercontent.com",
      aud: "jjxcapital-binance-p2p-sync",
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
      repository: "jeremisoto2026/app.1",
      repository_id: "1058212998",
      repository_owner_id: "232186349",
      ref: "refs/heads/main",
      workflow_ref: "jeremisoto2026/app.1/.github/workflows/binance-p2p-background-sync.yml@refs/heads/main",
      event_name: "schedule",
    })).toString("base64url");
    await expect(verifyGitHubActionsOidcToken(parts.join(".")))
      .rejects.toMatchObject({ statusCode: 401 });
  });
});
