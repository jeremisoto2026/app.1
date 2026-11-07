jest.mock("../lib/payments", () => {
  class HttpError extends Error {
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
    }
  }

  return {
    HttpError,
    requirePost: jest.fn(() => true),
    requireFirebaseUser: jest.fn(),
    getDocument: jest.fn(),
    countDocuments: jest.fn(),
    listDocumentsMatchingAnyField: jest.fn(),
    listAllDocuments: jest.fn(),
    commitWrites: jest.fn(),
    createWrite: jest.fn((path, data, precondition) => ({ path, data, precondition })),
    documentName: jest.fn((path) => path),
    toFields: jest.fn((data) => data),
    sendJson: jest.fn((res, status, payload) => {
      res.statusCode = status;
      res.body = payload;
      return res;
    }),
    errorResponse: jest.fn((res, error) => {
      res.statusCode = error.statusCode || 500;
      res.body = { error: error.message };
      return res;
    }),
  };
});

jest.mock("../lib/binance-p2p", () => ({
  decryptCredentials: jest.fn(),
  fetchHistory: jest.fn(),
}));

const payments = require("../lib/payments");
const binance = require("../lib/binance-p2p");
const syncBinanceP2P = require("../api/integrations/binance-p2p/sync");

describe("Binance P2P sync endpoint", () => {
  let integrationState;
  let acquiredLockId;

  beforeEach(() => {
    jest.clearAllMocks();
    payments.requirePost.mockImplementation(() => true);
    payments.createWrite.mockImplementation((path, data, precondition) => ({
      path, data, precondition,
    }));
    payments.sendJson.mockImplementation((res, status, payload) => {
      res.statusCode = status;
      res.body = payload;
      return res;
    });
    payments.errorResponse.mockImplementation((res, error) => {
      res.statusCode = error.statusCode || 500;
      res.body = { error: error.message };
      return res;
    });
    acquiredLockId = null;
    const now = Date.now();
    integrationState = {
      encryptedCredentials: { version: 1, algorithm: "aes-256-gcm", iv: "iv", tag: "tag", ciphertext: "ciphertext" },
      connectionStatus: "connected",
      connectedAt: new Date(now - 60_000),
      initialBackfillComplete: true,
      lastSyncAt: new Date(now - 60_000),
      syncLockId: null,
      syncLockExpiresAt: new Date(0),
    };

    payments.requireFirebaseUser.mockResolvedValue({ sub: "test-user" });
    payments.getDocument.mockImplementation(async () => ({
      updateTime: "2026-11-01T15:00:00.000000Z",
      data: {
        ...integrationState,
        syncLockId: acquiredLockId || integrationState.syncLockId,
      },
    }));
    payments.commitWrites.mockImplementation(async (writes) => {
      const lockWrite = writes.find((write) => write.data?.syncLockId);
      if (lockWrite) acquiredLockId = lockWrite.data.syncLockId;
      return {};
    });
    payments.countDocuments.mockResolvedValue(0);
    payments.listDocumentsMatchingAnyField.mockResolvedValue([]);
    payments.listAllDocuments.mockResolvedValue([]);
    binance.decryptCredentials.mockReturnValue({
      apiKey: "read-only-api-key",
      apiSecret: "read-only-api-secret",
    });
    binance.fetchHistory.mockResolvedValue({
      rows: [],
      total: 0,
      nextPage: null,
      pagesFetched: 1,
    });
  });

  test("restores sync state, decrypts credentials, acquires a lock and completes an empty history sync", async () => {
    const response = {};
    await syncBinanceP2P({ method: "POST", headers: {}, body: {} }, response);

    expect(binance.decryptCredentials).toHaveBeenCalledWith(integrationState.encryptedCredentials);
    expect(binance.fetchHistory).toHaveBeenCalledTimes(2);
    expect(payments.commitWrites).toHaveBeenCalledTimes(2);
    expect(acquiredLockId).toMatch(/^[0-9a-f]{32}$/);
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      imported: 0,
      completedOrdersFound: 0,
      hasMoreHistory: false,
    });
    expect(payments.commitWrites.mock.calls[1][0][0].data.syncLockId).toBeNull();
  });


  test("blocks repeated sync attempts during the per-user 15-second cooldown", async () => {
    integrationState.lastSyncAttemptAt = new Date(Date.now() - 5000);
    const response = {};

    await syncBinanceP2P({ method: "POST", headers: {}, body: {} }, response);

    expect(response.statusCode).toBe(429);
    expect(response.body.error).toMatch(/sincronización hace muy poco/i);
    expect(binance.decryptCredentials).not.toHaveBeenCalled();
    expect(binance.fetchHistory).not.toHaveBeenCalled();
    expect(payments.commitWrites).not.toHaveBeenCalled();
  });

  test("pauses imports at the 300-order free limit without calling Binance", async () => {
    payments.countDocuments.mockResolvedValue(300);
    const response = {};

    await syncBinanceP2P({ method: "POST", headers: {}, body: {} }, response);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      imported: 0,
      quotaReached: true,
      orderQuotaBlocked: true,
    });
    expect(binance.decryptCredentials).not.toHaveBeenCalled();
    expect(binance.fetchHistory).not.toHaveBeenCalled();
    expect(payments.commitWrites).toHaveBeenCalledWith([
      expect.objectContaining({
        path: "users/test-user/privateIntegrations/binanceP2P",
        data: expect.objectContaining({
          orderQuotaBlocked: true,
          lastSyncStatus: "quota",
        }),
      }),
    ]);
  });

  test("rejects a second sync while the existing lock is still active", async () => {
    integrationState.syncLockId = "another-sync";
    integrationState.syncLockExpiresAt = new Date(Date.now() + 60_000);
    const response = {};

    await syncBinanceP2P({ method: "POST", headers: {}, body: {} }, response);

    expect(response.statusCode).toBe(409);
    expect(response.body.error).toMatch(/sincronización de Binance en curso/i);
    expect(binance.decryptCredentials).not.toHaveBeenCalled();
    expect(payments.commitWrites).not.toHaveBeenCalled();
  });
});
