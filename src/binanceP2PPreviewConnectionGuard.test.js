jest.mock("../lib/payments", () => ({
  HttpError: class HttpError extends Error {
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
    }
  },
  sendJson: jest.fn((res, status, payload) => {
    res.statusCode = status;
    res.body = payload;
    return res;
  }),
  requirePost: jest.fn(() => true),
  requireFirebaseUser: jest.fn(),
  getDocument: jest.fn(),
  commitWrites: jest.fn(),
  createWrite: jest.fn(),
  errorResponse: jest.fn(),
}));

jest.mock("../lib/binance-p2p", () => ({
  encryptCredentials: jest.fn(),
  verifyCredentials: jest.fn(),
}));

jest.mock("../lib/bybit-p2p-api", () => ({
  connect: jest.fn(),
}));

const payments = require("../lib/payments");
const bybit = require("../lib/bybit-p2p-api");
const connectIntegration = require("../api/integrations/binance-p2p/connect");

const originalVercelEnv = process.env.VERCEL_ENV;

describe("P2P API connection guard in Preview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VERCEL_ENV = "preview";
  });

  afterAll(() => {
    if (originalVercelEnv === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = originalVercelEnv;
    }
  });

  test("rejects Binance credentials before authentication or storage", async () => {
    const response = {};
    await connectIntegration({
      method: "POST",
      url: "/api/integrations/binance-p2p/connect",
      body: { apiKey: "test-key", apiSecret: "test-secret" },
    }, response);

    expect(response.statusCode).toBe(403);
    expect(response.body.error).toMatch(/deshabilitadas en Preview/i);
    expect(payments.requireFirebaseUser).not.toHaveBeenCalled();
    expect(payments.commitWrites).not.toHaveBeenCalled();
  });

  test("rejects Bybit credentials before forwarding to the provider handler", async () => {
    const response = {};
    await connectIntegration({
      method: "POST",
      url: "/api/integrations/binance-p2p/connect?provider=bybit",
      body: { apiKey: "test-key", apiSecret: "test-secret" },
    }, response);

    expect(response.statusCode).toBe(403);
    expect(response.body.error).toMatch(/deshabilitadas en Preview/i);
    expect(bybit.connect).not.toHaveBeenCalled();
    expect(payments.requireFirebaseUser).not.toHaveBeenCalled();
    expect(payments.commitWrites).not.toHaveBeenCalled();
  });
});
