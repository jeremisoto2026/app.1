jest.mock("../lib/payments", () => ({
  HttpError: class HttpError extends Error {
    constructor(statusCode, message) { super(message); this.statusCode = statusCode; }
  },
  getDocument: jest.fn(),
  listAllDocuments: jest.fn(),
  listCollectionIds: jest.fn(),
  listRootDocumentsMatchingField: jest.fn(),
  commitWrites: jest.fn(),
  createWrite: jest.fn((path, data, precondition) => ({ path, data, precondition })),
  documentName: jest.fn((path) => "doc:" + path),
  toFields: jest.fn((data) => data),
}));

jest.mock("../lib/payment-reference", () => ({
  getPaymentTransactionReferencePath: jest.fn((provider) =>
    "paymentTransactions/hmac_v1_" + provider + "_" + "b".repeat(64)
  ),
  getLegacyPaymentTransactionPath: jest.fn((provider, reference) =>
    provider === "blockchain_bep20"
      ? "paymentTransactions/bep20_" + String(reference).toLowerCase().slice(2)
      : "paymentTransactions/binance_" + String(reference).replace(/[^a-zA-Z0-9_-]/g, "_")
  ),
  isHmacPaymentTransactionId: jest.fn((id) => String(id || "").startsWith("hmac_v1_")),
}));

const payments = require("../lib/payments");
const paymentReference = require("../lib/payment-reference");
const deletion = require("../lib/account-deletion");

describe("Account deletion data cleanup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    payments.createWrite.mockImplementation((path, data, precondition) => ({ path, data, precondition }));
    payments.documentName.mockImplementation((path) => "doc:" + path);
    payments.toFields.mockImplementation((data) => data);
    paymentReference.getPaymentTransactionReferencePath.mockImplementation((provider) =>
      "paymentTransactions/hmac_v1_" + provider + "_" + "b".repeat(64)
    );
    paymentReference.getLegacyPaymentTransactionPath.mockImplementation((provider, reference) =>
      provider === "blockchain_bep20"
        ? "paymentTransactions/bep20_" + String(reference).toLowerCase().slice(2)
        : "paymentTransactions/binance_" + String(reference).replace(/[^a-zA-Z0-9_-]/g, "_")
    );
    paymentReference.isHmacPaymentTransactionId.mockImplementation((id) => String(id || "").startsWith("hmac_v1_"));
    payments.commitWrites.mockResolvedValue({});
    payments.getDocument.mockImplementation(async (path) => path === "users/user-a" ? ({
      updateTime: "root-version",
      data: { uid: "user-a", email: "private@example.com", plan: "pro" },
    }) : null);
    payments.listRootDocumentsMatchingField.mockImplementation(async (collection) => {
      if (collection === "paymentTransactions") {
        return [{
          id: "bep20_" + "a".repeat(64),
          updateTime: "transaction-version",
          data: {
            uid: "user-a",
            paymentId: "private-payment-id",
            provider: "blockchain_bep20",
            txHash: "0x" + "a".repeat(64),
            amount: 15.001,
          },
        }];
      }
      if (collection === "paymentOrderIndex") return [{ id: "private-order-index", updateTime: "order-version" }];
      if (collection === "blockchainAmountIndex") return [{ id: "private-amount-index", updateTime: "amount-version" }];
      return [];
    });
    payments.listCollectionIds.mockImplementation(async (path) =>
      path === "users/user-a" ? ["operations", "privateIntegrations"] :
      path === "users/user-a/privateIntegrations/binanceP2P" ? ["secrets"] : []
    );
    payments.listAllDocuments.mockImplementation(async (path) => {
      if (path === "users/user-a/operations") return [{ id: "operation-1", updateTime: "operation-version" }];
      if (path === "users/user-a/privateIntegrations") return [{ id: "binanceP2P", updateTime: "integration-version" }];
      if (path === "users/user-a/privateIntegrations/binanceP2P/secrets") return [{ id: "secret-1", updateTime: "secret-version" }];
      return [];
    });
  });

  test("retains only a minimal pseudonymized payment reference", () => {
    const result = deletion.pseudonymizedTransactionFields({
      id: "bep20_" + "b".repeat(64),
      data: {
        uid: "user-a",
        paymentId: "payment-a",
        txHash: "0x" + "b".repeat(64),
        amount: 15.001,
        provider: "blockchain_bep20",
      },
    });

    expect(result).toMatchObject({
      provider: "blockchain_bep20",
      pseudonymized: true,
      retentionPurpose: "duplicate_payment_prevention",
    });
    expect(result).not.toHaveProperty("uid");
    expect(result).not.toHaveProperty("paymentId");
    expect(result).not.toHaveProperty("txHash");
    expect(result).not.toHaveProperty("amount");
  });

  test("removes payment indexes and recursively deletes all user documents", async () => {
    const summary = await deletion.deleteUserAccountData("user-a");

    expect(summary).toEqual({
      pseudonymizedPaymentTransactions: 1,
      deletedPaymentOrderIndexes: 1,
      deletedBlockchainAmountIndexes: 1,
      deletedUserDocuments: 4,
    });

    const markerWrite = payments.createWrite.mock.calls.find(([path]) =>
      path.startsWith("paymentTransactions/hmac_v1_blockchain_bep20_")
    );
    expect(markerWrite).toBeDefined();
    expect(markerWrite[0]).not.toContain("a".repeat(64));
    expect(markerWrite[1]).toMatchObject({
      provider: "blockchain_bep20",
      pseudonymized: true,
      retentionPurpose: "duplicate_payment_prevention",
    });
    expect(markerWrite[1]).not.toHaveProperty("uid");
    expect(markerWrite[1]).not.toHaveProperty("paymentId");
    expect(markerWrite[1]).not.toHaveProperty("txHash");
    expect(markerWrite[1]).not.toHaveProperty("transactionId");
    const allWrites = payments.commitWrites.mock.calls.flatMap(([writes]) => writes);
    expect(payments.listRootDocumentsMatchingField).toHaveBeenCalledWith("paymentOrderIndex", "uid", "user-a");
    expect(payments.listRootDocumentsMatchingField).toHaveBeenCalledWith("blockchainAmountIndex", "uid", "user-a");
    expect(allWrites.some((write) => write.delete === "doc:paymentTransactions/bep20_" + "a".repeat(64))).toBe(true);
    expect(allWrites.some((write) => write.path === markerWrite[0])).toBe(true);
    expect(allWrites.some((write) => write.delete === "doc:paymentOrderIndex/private-order-index")).toBe(true);
    expect(allWrites.some((write) => write.delete === "doc:blockchainAmountIndex/private-amount-index")).toBe(true);
    expect(allWrites.some((write) => write.delete === "doc:users/user-a/privateIntegrations/binanceP2P/secrets/secret-1")).toBe(true);
    expect(allWrites.some((write) => write.delete === "doc:users/user-a")).toBe(true);
    expect(payments.listRootDocumentsMatchingField).toHaveBeenCalledWith("paymentTransactions", "uid", "user-a");
  });

  test("migrates legacy Binance Pay references without retaining the raw transaction ID", async () => {
    payments.listRootDocumentsMatchingField.mockResolvedValueOnce([{
      id: "binance_txn-123",
      updateTime: "binance-version",
      data: {
        uid: "user-a",
        paymentId: "private-payment-id",
        provider: "binance_pay",
        transactionId: "txn-123",
        amount: 15,
      },
    }]);

    const count = await deletion.pseudonymizePaymentTransactions("user-a");

    expect(count).toBe(1);
    expect(paymentReference.getPaymentTransactionReferencePath).toHaveBeenCalledWith("binance_pay", "txn-123");
    const markerWrite = payments.createWrite.mock.calls[0];
    expect(markerWrite[0]).toBe("paymentTransactions/hmac_v1_binance_pay_" + "b".repeat(64));
    expect(markerWrite[1]).toMatchObject({
      provider: "binance_pay",
      pseudonymized: true,
      retentionPurpose: "duplicate_payment_prevention",
    });
    expect(markerWrite[1]).not.toHaveProperty("uid");
    expect(markerWrite[1]).not.toHaveProperty("paymentId");
    expect(markerWrite[1]).not.toHaveProperty("transactionId");

    const writes = payments.commitWrites.mock.calls.flatMap(([batch]) => batch);
    expect(writes.some((write) => write.delete === "doc:paymentTransactions/binance_txn-123")).toBe(true);
    expect(writes.some((write) => write.path === markerWrite[0])).toBe(true);
  });

  test("stops migration when a historical payment ID does not match its legacy document ID", async () => {
    payments.listRootDocumentsMatchingField.mockResolvedValueOnce([{
      id: "binance_wrong-id",
      updateTime: "binance-version",
      data: { uid: "user-a", provider: "binance_pay", transactionId: "txn-123" },
    }]);

    await expect(deletion.pseudonymizePaymentTransactions("user-a"))
      .rejects.toMatchObject({ statusCode: 503 });
    expect(payments.commitWrites).not.toHaveBeenCalled();
  });
  test("fails closed when account hierarchy exceeds the safe document cap", async () => {
    payments.listAllDocuments.mockImplementation(async () =>
      Array.from({ length: 10001 }, (_, index) => ({ id: "doc-" + index }))
    );

    await expect(deletion.deleteUserAccountData("user-a")).rejects.toMatchObject({ statusCode: 503 });
    expect(payments.commitWrites).toHaveBeenCalledTimes(3);
    // Global payment references/indexes may be sanitized, but no user document is deleted.
    const writes = payments.commitWrites.mock.calls.flatMap(([batch]) => batch);
    expect(writes.some((write) => write.delete?.startsWith("doc:users/"))).toBe(false);
    expect(payments.createWrite).toHaveBeenCalledWith(
      expect.stringContaining("paymentTransactions/hmac_v1_blockchain_bep20_"),
      expect.objectContaining({ pseudonymized: true, retentionPurpose: "duplicate_payment_prevention" }),
      { exists: false }
    );
  });

  test("creates and renews deletion locks, but rejects a concurrent active lease", async () => {
    payments.getDocument.mockResolvedValueOnce(null);
    await deletion.acquireAccountDeletionLock("user-a", new Date("2026-11-05T10:00:00Z"));
    expect(payments.createWrite).toHaveBeenCalledWith(
      "accountDeletionLocks/user-a",
      expect.objectContaining({ status: "in_progress" }),
      { exists: false }
    );

    payments.getDocument.mockResolvedValueOnce({
      updateTime: "lock-version",
      data: { leaseExpiresAt: new Date("2026-11-05T10:20:00Z") },
    });
    await expect(deletion.acquireAccountDeletionLock("user-a", new Date("2026-11-05T10:10:00Z")))
      .rejects.toMatchObject({ statusCode: 409 });
  });
});
