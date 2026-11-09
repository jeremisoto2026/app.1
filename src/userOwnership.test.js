jest.mock("../lib/payments", () => {
  class HttpError extends Error {
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
    }
  }

  return {
    HttpError,
    sendJson: jest.fn((res, status, payload) => {
      res.statusCode = status;
      res.body = payload;
      return res;
    }),
    requirePost: jest.fn(() => true),
    requireFirebaseUser: jest.fn(),
    getDocument: jest.fn(),
    listAllDocuments: jest.fn(),
    countDocuments: jest.fn(),
    hasDocumentsMatchingField: jest.fn(),
    listDocumentsMatchingField: jest.fn(),
    listDocuments: jest.fn(),
    commitWrites: jest.fn(),
    createWrite: jest.fn((path, data, precondition) => ({ path, data, precondition })),
    documentName: jest.fn((path) => path),
    toFields: jest.fn((data) => data),
    errorResponse: jest.fn((res, error) => {
      res.statusCode = error.statusCode || 500;
      res.body = { error: error.message };
      return res;
    }),
  };
});

const payments = require("../lib/payments");
const sessionActions = require("../lib/sessions");
const createOperation = require("../api/operations/create");
const recordExport = require("../api/usage/record-export");
const listPaymentHistory = require("../api/payments/history");
const binanceP2PStatus = require("../api/integrations/binance-p2p/status");

const OWNER_UID = "authenticated-owner";
const OTHER_UID = "forged-other-user";
const SESSION_ID = "a".repeat(32);

function response() {
  return {};
}

function expectNoAccessToOtherUser() {
  const serializedCalls = JSON.stringify({
    getDocument: payments.getDocument.mock.calls,
    listAllDocuments: payments.listAllDocuments.mock.calls,
    listDocuments: payments.listDocuments.mock.calls,
    listDocumentsMatchingField: payments.listDocumentsMatchingField.mock.calls,
    commitWrites: payments.commitWrites.mock.calls,
    createWrite: payments.createWrite.mock.calls,
  });
  expect(serializedCalls).not.toContain("users/" + OTHER_UID);
}

describe("Server-side user ownership boundaries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    payments.requirePost.mockReturnValue(true);
    payments.requireFirebaseUser.mockResolvedValue({ sub: OWNER_UID });
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
    payments.documentName.mockImplementation((path) => path);
    payments.createWrite.mockImplementation((path, data, precondition) => ({
      path, data, precondition,
    }));
    payments.toFields.mockImplementation((data) => data);
    payments.commitWrites.mockResolvedValue({});
    payments.listAllDocuments.mockResolvedValue([]);
    payments.countDocuments.mockResolvedValue(0);
    payments.hasDocumentsMatchingField.mockResolvedValue(false);
    payments.listDocumentsMatchingField.mockResolvedValue([]);
    payments.listDocuments.mockResolvedValue([]);
  });

  test("creates an arbitrage session only under the authenticated UID", async () => {
    payments.getDocument
      .mockResolvedValueOnce({
        data: { plan: "free", arbitragesUsed: 0 },
        updateTime: "profile-version",
      })
      .mockResolvedValueOnce(null);

    const res = response();
    await sessionActions.create({
      method: "POST",
      body: {
        uid: OTHER_UID,
        userId: OTHER_UID,
        name: "Owned session",
        strategy: "Comercio P2P",
        fiat: "EUR",
        crypto: "USDT",
        initialCapitalType: "fiat",
      },
    }, res);

    expect(payments.getDocument.mock.calls).toEqual([
      ["users/" + OWNER_UID],
      ["users/" + OWNER_UID + "/sessionPairs/EUR_USDT"],
    ]);
    expect(payments.commitWrites).toHaveBeenCalledTimes(1);
    const writes = payments.commitWrites.mock.calls[0][0];
    expect(writes.some((write) => String(write.update?.name || write.path || "").includes(
      "users/" + OWNER_UID + "/sessions/"
    ))).toBe(true);
    expectNoAccessToOtherUser();
    expect(res.statusCode).toBe(201);
  });

  test("cannot close another user's session by supplying their UID and session ID", async () => {
    payments.getDocument.mockResolvedValueOnce(null);
    const res = response();

    await sessionActions.status({
      method: "POST",
      body: { uid: OTHER_UID, userId: OTHER_UID, sessionId: SESSION_ID, status: "closed" },
    }, res);

    expect(payments.getDocument).toHaveBeenCalledWith(
      "users/" + OWNER_UID + "/sessions/" + SESSION_ID
    );
    expect(res.statusCode).toBe(404);
    expect(payments.commitWrites).not.toHaveBeenCalled();
    expectNoAccessToOtherUser();
  });

  test("cannot delete another user's session by supplying their UID and session ID", async () => {
    payments.getDocument.mockResolvedValueOnce(null);
    const res = response();

    await sessionActions.delete({
      method: "POST",
      body: { uid: OTHER_UID, userId: OTHER_UID, sessionId: SESSION_ID },
    }, res);

    expect(payments.getDocument).toHaveBeenCalledWith(
      "users/" + OWNER_UID + "/sessions/" + SESSION_ID
    );
    expect(res.statusCode).toBe(404);
    expect(payments.commitWrites).not.toHaveBeenCalled();
    expectNoAccessToOtherUser();
  });

  test("cannot register an operation against another user's session", async () => {
    payments.getDocument
      .mockResolvedValueOnce({
        data: { plan: "free", registeredOrdersUsed: 0 },
        updateTime: "profile-version",
      })
      .mockResolvedValueOnce(null);

    const res = response();
    await createOperation({
      method: "POST",
      body: {
        uid: OTHER_UID,
        userId: OTHER_UID,
        operationData: {
          uid: OTHER_UID,
          exchange: "Binance",
          operation_type: "Compra",
          crypto: "USDT",
          fiat: "EUR",
          sessionId: SESSION_ID,
          amount: 100,
          exchange_rate: 1,
          fee: 0,
          order_id: "FORGED-ORDER",
        },
      },
    }, res);

    expect(payments.getDocument.mock.calls).toEqual([
      ["users/" + OWNER_UID],
      ["users/" + OWNER_UID + "/sessions/" + SESSION_ID],
    ]);
    expect(res.statusCode).toBe(409);
    expect(payments.commitWrites).not.toHaveBeenCalled();
    expectNoAccessToOtherUser();
  });

  test("records export usage only against the authenticated user's profile", async () => {
    payments.getDocument.mockResolvedValueOnce({
      data: { plan: "free", exportsUsed: 3 },
      updateTime: "profile-version",
    });

    const res = response();
    await recordExport({
      method: "POST",
      body: { uid: OTHER_UID, userId: OTHER_UID },
    }, res);

    expect(payments.getDocument).toHaveBeenCalledWith("users/" + OWNER_UID);
    expect(payments.commitWrites).toHaveBeenCalledWith([
      expect.objectContaining({
        path: "users/" + OWNER_UID,
        data: expect.objectContaining({ exportsUsed: 4 }),
      }),
    ]);
    expect(res.statusCode).toBe(200);
    expect(res.body.exportsUsed).toBe(4);
    expectNoAccessToOtherUser();
  });

  test("lists only the authenticated user's payment history even with a forged UID query", async () => {
    payments.listDocuments.mockResolvedValueOnce([
      { id: "payment-1", data: { uid: OWNER_UID, provider: "blockchain_bep20", status: "pending" } },
    ]);

    const res = response();
    await listPaymentHistory({
      method: "GET",
      query: { uid: OTHER_UID },
    }, res);

    expect(payments.listDocuments).toHaveBeenCalledWith(
      "users/" + OWNER_UID + "/payments",
      50
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.payments).toHaveLength(1);
    expect(res.body.payments[0].uid).toBe(OWNER_UID);
    expectNoAccessToOtherUser();
  });

  test("returns only the authenticated user's Binance connection status", async () => {
    payments.getDocument.mockResolvedValueOnce({
      data: {
        encryptedCredentials: { ciphertext: "redacted-test-only" },
        connectionStatus: "connected",
        apiKeyHint: "1234",
      },
    });

    const res = response();
    await binanceP2PStatus({
      method: "GET",
      url: "/api/integrations/binance-p2p/status?uid=" + OTHER_UID,
    }, res);

    expect(payments.getDocument).toHaveBeenCalledWith(
      "users/" + OWNER_UID + "/privateIntegrations/binanceP2P"
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain("redacted-test-only");
    expectNoAccessToOtherUser();
  });
});
