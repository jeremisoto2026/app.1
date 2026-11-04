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
    commitWrites: jest.fn(),
    documentName: jest.fn((path) => path),
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

const payments = require("../lib/payments");
const disconnectBinanceP2P = require("../api/integrations/binance-p2p/disconnect");

describe("Binance P2P disconnect endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    payments.requirePost.mockReturnValue(true);
    payments.documentName.mockImplementation((path) => path);
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
    payments.requireFirebaseUser.mockResolvedValue({ sub: "disconnect-test-user" });
    payments.getDocument.mockResolvedValue({
      updateTime: "2026-11-05T12:00:00.000Z",
      data: {
        encryptedCredentials: {
          version: 1,
          algorithm: "aes-256-gcm",
          ciphertext: "encrypted-only",
        },
        connectionStatus: "connected",
        syncLockId: null,
        syncLockExpiresAt: new Date(0),
      },
    });
    payments.commitWrites.mockResolvedValue({});
  });

  test("deletes only the authenticated user's stored Binance credentials", async () => {
    const response = {};

    await disconnectBinanceP2P({ method: "POST", url: "/api/integrations/binance-p2p/disconnect" }, response);

    expect(payments.getDocument).toHaveBeenCalledWith(
      "users/disconnect-test-user/privateIntegrations/binanceP2P"
    );
    expect(payments.commitWrites).toHaveBeenCalledWith([
      expect.objectContaining({
        delete: "users/disconnect-test-user/privateIntegrations/binanceP2P",
      }),
    ]);
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ connected: false });
    expect(JSON.stringify(response.body)).not.toContain("encrypted-only");
  });

  test("refuses to disconnect while a Binance sync lock is active", async () => {
    payments.getDocument.mockResolvedValueOnce({
      updateTime: "2026-11-05T12:00:00.000Z",
      data: {
        encryptedCredentials: { ciphertext: "encrypted-only" },
        syncLockId: "active-sync",
        syncLockExpiresAt: new Date(Date.now() + 60_000),
      },
    });
    const response = {};

    await disconnectBinanceP2P({ method: "POST", url: "/api/integrations/binance-p2p/disconnect" }, response);

    expect(response.statusCode).toBe(409);
    expect(response.body.error).toMatch(/sincronización de Binance en curso/i);
    expect(payments.commitWrites).not.toHaveBeenCalled();
  });

  test("returns a disconnected state when no integration document exists", async () => {
    payments.getDocument.mockResolvedValueOnce(null);
    const response = {};

    await disconnectBinanceP2P({ method: "POST", url: "/api/integrations/binance-p2p/disconnect" }, response);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ connected: false });
    expect(payments.commitWrites).not.toHaveBeenCalled();
  });
});
