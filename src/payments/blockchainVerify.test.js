const RECEIVER_ADDRESS = "0x4c64b783f1babc0a2fe62f174873f415393c2269";
const TOKEN_CONTRACT = "0x55d398326f99059ff775485246999027b3197955";
const PAYMENT_ID = "a".repeat(32);
const TX_HASH = "0x" + "b".repeat(64);
const UID = "payment-test-user";

jest.mock("../../lib/payments", () => {
  class HttpError extends Error {
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
    }
  }

  return {
    HttpError,
    sendJson: jest.fn((res, statusCode, payload) => {
      res.status(statusCode);
      res.setHeader("Cache-Control", "no-store");
      return res.json(payload);
    }),
    requirePost: jest.fn((req, res) => {
      if (req.method === "POST") return true;
      res.status(405);
      res.setHeader("Allow", "POST");
      res.json({ error: "Método no permitido." });
      return false;
    }),
    requireFirebaseUser: jest.fn(async () => ({ sub: "payment-test-user" })),
    getDocument: jest.fn(),
    activateProWithPayment: jest.fn(),
    assertPaymentConfiguration: jest.fn(),
    BSC_USDT_CONTRACT: "0x55d398326f99059ff775485246999027b3197955",
    TRANSFER_TOPIC: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    USDT_DECIMALS: 18,
    REQUIRED_BSC_CONFIRMATIONS: 12,
    rpc: jest.fn(),
    errorResponse: jest.fn((res, error) => {
      res.status(error.statusCode || 500);
      return res.json({ error: error.message || "Error de prueba" });
    }),
  };
});

const payments = jest.requireMock("../../lib/payments");
const verifyBlockchainPayment = require("../../api/payments/blockchain/verify");

function makeResponse() {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader() {
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
  };
  return response;
}

describe("POST /api/payments/blockchain/verify", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const now = Date.now();
    const amountUnits8 = 1500123456; // 15.00123456 USDT: a unique invoice amount.
    const amount = amountUnits8 / 100000000;
    const blockTimestamp = Math.floor((now - 10000) / 1000);
    const recipientTopic = "0x" + RECEIVER_ADDRESS.slice(2).padStart(64, "0");
    const receivedUnits = BigInt(amountUnits8) * (10n ** 10n);

    payments.getDocument.mockImplementation(async (path) => {
      if (path === `users/${UID}/payments/${PAYMENT_ID}`) {
        return {
          updateTime: "2026-01-01T00:00:00.000Z",
          data: {
            uid: UID,
            provider: "blockchain_bep20",
            status: "pending",
            createdAt: new Date(now - 60000).toISOString(),
            expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
            recipient: RECEIVER_ADDRESS,
            tokenContract: TOKEN_CONTRACT,
            amount,
            amountUnits8,
            chainId: 56,
          },
        };
      }
      if (path === `paymentTransactions/bep20_${TX_HASH.slice(2)}`) return null;
      if (path === `users/${UID}`) return { data: { plan: "free" }, updateTime: "2026-01-01T00:00:00.000Z" };
      return null;
    });

    payments.rpc.mockImplementation(async (method) => {
      if (method === "eth_getTransactionReceipt") {
        return {
          transactionHash: TX_HASH,
          status: "0x1",
          blockNumber: "0x64",
          logs: [{
            address: TOKEN_CONTRACT,
            topics: [payments.TRANSFER_TOPIC, "0x" + "0".repeat(64), recipientTopic],
            data: "0x" + receivedUnits.toString(16),
          }],
        };
      }
      if (method === "eth_getBlockByNumber") return { timestamp: "0x" + blockTimestamp.toString(16) };
      if (method === "eth_chainId") return "0x38";
      if (method === "eth_blockNumber") return "0x70"; // 13 confirmations for block 0x64.
      throw new Error("Método RPC inesperado: " + method);
    });

    payments.activateProWithPayment.mockResolvedValue({
      expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  test("confirms a valid, exact-amount BEP20 transfer and requests server-side Pro activation", async () => {
    const req = {
      method: "POST",
      headers: { authorization: "Bearer mocked-firebase-token" },
      body: { paymentId: PAYMENT_ID, txHash: TX_HASH },
    };
    const res = makeResponse();

    await verifyBlockchainPayment(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      plan: "pro",
      network: "BNB Smart Chain (BEP20)",
      txHash: TX_HASH,
    });
    expect(payments.activateProWithPayment).toHaveBeenCalledTimes(1);
    expect(payments.activateProWithPayment).toHaveBeenCalledWith(expect.objectContaining({
      uid: UID,
      paymentPath: `users/${UID}/payments/${PAYMENT_ID}`,
      transactionPath: `paymentTransactions/bep20_${TX_HASH.slice(2)}`,
      paymentUpdate: expect.objectContaining({
        status: "paid",
        txHash: TX_HASH,
        provider: "blockchain_bep20",
        paymentId: PAYMENT_ID,
      }),
      transactionData: expect.objectContaining({
        uid: UID,
        paymentId: PAYMENT_ID,
        txHash: TX_HASH,
        amount: 15.00123456,
        currency: "USDT",
        recipient: RECEIVER_ADDRESS,
      }),
    }));
  });
});
