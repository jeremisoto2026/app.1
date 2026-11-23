jest.mock("../lib/payments", () => {
  class HttpError extends Error {
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  return {
    HttpError,
    sendJson: jest.fn((res, statusCode, payload) => {
      res.status(statusCode).setHeader("Cache-Control", "no-store");
      return res.json(payload);
    }),
    getDocument: jest.fn(),
    listConnectedBinanceP2PIntegrations: jest.fn(),
    commitWrites: jest.fn(),
    createWrite: jest.fn((path, data, precondition) => ({ path, data, precondition })),
    errorResponse: jest.fn((res, error) => {
      res.status(error.statusCode || 500).setHeader("Cache-Control", "no-store");
      return res.json({ error: error.message });
    }),
  };
});

jest.mock("../lib/github-actions-oidc", () => ({
  verifyGitHubActionsOidcToken: jest.fn(),
}));

jest.mock("../api/integrations/binance-p2p/sync", () => ({
  syncUser: jest.fn(),
}));

const payments = require("../lib/payments");
const oidc = require("../lib/github-actions-oidc");
const sync = require("../api/integrations/binance-p2p/sync");
const { createBinanceP2PScheduler } = require("../lib/binance-p2p-scheduler");
const cron = createBinanceP2PScheduler({ syncUser: sync.syncUser });

function makeResponse() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    setHeader() { return this; },
    json(body) { this.body = body; return this; },
  };
}

describe("Binance P2P background scheduler endpoint", () => {
  let storedState;
  let originalSchedulerSecret;
  let originalPreviewSchedulerSecret;
  let originalVercelEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalSchedulerSecret = process.env.BINANCE_P2P_SCHEDULER_SECRET;
    originalPreviewSchedulerSecret = process.env.BINANCE_P2P_PREVIEW_SCHEDULER_SECRET;
    originalVercelEnv = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "production";
    delete process.env.BINANCE_P2P_SCHEDULER_SECRET;
    delete process.env.BINANCE_P2P_PREVIEW_SCHEDULER_SECRET;
    payments.sendJson.mockImplementation((res, statusCode, payload) => {
      res.status(statusCode).setHeader("Cache-Control", "no-store");
      return res.json(payload);
    });
    payments.errorResponse.mockImplementation((res, error) => {
      res.status(error.statusCode || 500).setHeader("Cache-Control", "no-store");
      return res.json({ error: error.message });
    });
    payments.createWrite.mockImplementation((path, data, precondition) => ({
      path, data, precondition,
    }));
    storedState = null;
    oidc.verifyGitHubActionsOidcToken.mockResolvedValue({ repository: "jeremisoto2026/app.1" });
    payments.getDocument.mockImplementation(async () => storedState
      ? { updateTime: "2026-11-01T00:00:00.000Z", data: { ...storedState } }
      : null);
    payments.commitWrites.mockImplementation(async (writes) => {
      for (const write of writes) storedState = { ...(storedState || {}), ...write.data };
      return {};
    });
    payments.listConnectedBinanceP2PIntegrations.mockResolvedValue([
      {
        name: "projects/p/databases/(default)/documents/users/user-a/privateIntegrations/binanceP2P",
        uid: "user-a",
        data: { connectionStatus: "connected", encryptedCredentials: { ciphertext: "a" } },
      },
      {
        name: "projects/p/databases/(default)/documents/users/user-b/privateIntegrations/binanceP2P",
        uid: "user-b",
        data: { connectionStatus: "connected", encryptedCredentials: { ciphertext: "b" } },
      },
    ]);
    sync.syncUser.mockResolvedValue({
      statusCode: 200,
      body: { success: true, imported: 1 },
    });
  });

  afterEach(() => {
    if (originalSchedulerSecret === undefined) {
      delete process.env.BINANCE_P2P_SCHEDULER_SECRET;
    } else {
      process.env.BINANCE_P2P_SCHEDULER_SECRET = originalSchedulerSecret;
    }
    if (originalPreviewSchedulerSecret === undefined) {
      delete process.env.BINANCE_P2P_PREVIEW_SCHEDULER_SECRET;
    } else {
      process.env.BINANCE_P2P_PREVIEW_SCHEDULER_SECRET = originalPreviewSchedulerSecret;
    }
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnv;
  });

  test("syncs connected users using the verified scheduler identity", async () => {
    const response = makeResponse();
    await cron({
      method: "POST",
      headers: { authorization: "Bearer github-oidc-token" },
    }, response);

    expect(oidc.verifyGitHubActionsOidcToken).toHaveBeenCalledWith("github-oidc-token");
    expect(sync.syncUser).toHaveBeenCalledTimes(1);
    expect(sync.syncUser).toHaveBeenCalledWith("user-a");
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      processed: 1,
      succeeded: 1,
      imported: 1,
      hasMore: true,
    });
    expect(storedState.lastDocumentName).toContain("/users/user-a/");
    expect(storedState.schedulerLockId).toBeNull();
  });

  test("advances the Firestore cursor so the next batch processes the next user", async () => {
    const firstResponse = makeResponse();
    await cron({
      method: "POST",
      headers: { authorization: "Bearer github-oidc-token" },
    }, firstResponse);

    payments.listConnectedBinanceP2PIntegrations.mockResolvedValue([
      {
        name: "projects/p/databases/(default)/documents/users/user-b/privateIntegrations/binanceP2P",
        uid: "user-b",
        data: { connectionStatus: "connected", encryptedCredentials: { ciphertext: "b" } },
      },
    ]);
    sync.syncUser.mockClear();

    const secondResponse = makeResponse();
    await cron({
      method: "POST",
      headers: { authorization: "Bearer github-oidc-token" },
    }, secondResponse);

    expect(sync.syncUser).toHaveBeenCalledTimes(1);
    expect(sync.syncUser).toHaveBeenCalledWith("user-b");
    expect(secondResponse.body).toMatchObject({
      success: true,
      processed: 1,
      imported: 1,
      hasMore: false,
    });
    expect(storedState.lastDocumentName).toBeNull();
  });

  test("accepts the dedicated Cloudflare scheduler secret without weakening GitHub OIDC checks", async () => {
    const secret = "c".repeat(64);
    process.env.BINANCE_P2P_SCHEDULER_SECRET = secret;
    const response = makeResponse();

    await cron({
      method: "POST",
      headers: { "x-jjxcapital-scheduler-token": secret },
    }, response);

    expect(oidc.verifyGitHubActionsOidcToken).not.toHaveBeenCalled();
    expect(sync.syncUser).toHaveBeenCalledWith("user-a");
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test("uses only the dedicated Preview scheduler secret", async () => {
    process.env.VERCEL_ENV = "preview";
    const previewSecret = "v".repeat(64);
    process.env.BINANCE_P2P_PREVIEW_SCHEDULER_SECRET = previewSecret;
    process.env.BINANCE_P2P_SCHEDULER_SECRET = "p".repeat(64);
    const response = makeResponse();

    await cron({ method: "POST", headers: { "x-jjxcapital-scheduler-token": previewSecret } }, response);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(oidc.verifyGitHubActionsOidcToken).not.toHaveBeenCalled();
    expect(sync.syncUser).toHaveBeenCalledWith("user-a");
  });

  test("rejects the Production scheduler secret in Preview when no Preview secret exists", async () => {
    process.env.VERCEL_ENV = "preview";
    const productionSecret = "p".repeat(64);
    process.env.BINANCE_P2P_SCHEDULER_SECRET = productionSecret;
    delete process.env.BINANCE_P2P_PREVIEW_SCHEDULER_SECRET;
    const response = makeResponse();

    await cron({ method: "POST", headers: { "x-jjxcapital-scheduler-token": productionSecret } }, response);

    expect(response.statusCode).toBe(401);
    expect(sync.syncUser).not.toHaveBeenCalled();
    expect(payments.getDocument).not.toHaveBeenCalled();
  });

  test("rejects an incorrect Cloudflare scheduler secret before accessing Firestore", async () => {
    process.env.BINANCE_P2P_SCHEDULER_SECRET = "d".repeat(64);
    const response = makeResponse();

    await cron({
      method: "POST",
      headers: { "x-jjxcapital-scheduler-token": "wrong-secret" },
    }, response);

    expect(response.statusCode).toBe(401);
    expect(sync.syncUser).not.toHaveBeenCalled();
    expect(payments.getDocument).not.toHaveBeenCalled();
  });

  test("does not start a second global scheduler while a lock is active", async () => {
    storedState = {
      schedulerLockId: "another-run",
      schedulerLockExpiresAt: new Date(Date.now() + 60_000),
    };
    const response = makeResponse();
    await cron({
      method: "POST",
      headers: { authorization: "Bearer github-oidc-token" },
    }, response);

    expect(sync.syncUser).not.toHaveBeenCalled();
    expect(payments.commitWrites).not.toHaveBeenCalled();
    expect(response.body).toMatchObject({
      success: true,
      skipped: "another_run_is_active",
      processed: 0,
    });
  });

  test("rejects requests without a valid GitHub OIDC token or external secret", async () => {
    oidc.verifyGitHubActionsOidcToken.mockRejectedValue(
      new payments.HttpError(401, "Token no válido")
    );
    const response = makeResponse();
    await cron({ method: "POST", headers: { authorization: "Bearer invalid-token" } }, response);

    expect(response.statusCode).toBe(401);
    expect(sync.syncUser).not.toHaveBeenCalled();
    expect(payments.getDocument).not.toHaveBeenCalled();
  });
});
