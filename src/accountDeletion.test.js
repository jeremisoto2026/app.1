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

const payments = require("../lib/payments");
const deletion = require("../lib/account-deletion");

describe("Account deletion data cleanup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    payments.createWrite.mockImplementation((path, data, precondition) => ({ path, data, precondition }));
    payments.documentName.mockImplementation((path) => "doc:" + path);
    payments.toFields.mockImplementation((data) => data);
    payments.commitWrites.mockResolvedValue({});
    payments.getDocument.mockResolvedValue({
      updateTime: "root-version",
      data: { uid: "user-a", email: "private@example.com", plan: "pro" },
    });
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

  test("retains only a minimal anonymous payment reference", () => {
    const result = deletion.anonymizedTransactionFields({
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
      anonymized: true,
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
      anonymizedPaymentTransactions: 1,
      deletedPaymentOrderIndexes: 1,
      deletedBlockchainAmountIndexes: 1,
      deletedUserDocuments: 4,
    });

    expect(payments.toFields).toHaveBeenCalledWith(expect.objectContaining({
      provider: "blockchain_bep20",
      anonymized: true,
      retentionPurpose: "duplicate_payment_prevention",
    }));
    const anonymizedFields = payments.toFields.mock.calls
      .map(([fields]) => fields)
      .find((fields) => fields?.anonymized === true);
    expect(anonymizedFields).toBeDefined();
    expect(anonymizedFields).not.toHaveProperty("uid");
    expect(anonymizedFields).not.toHaveProperty("paymentId");
    const allWrites = payments.commitWrites.mock.calls.flatMap(([writes]) => writes);
    expect(payments.listRootDocumentsMatchingField).toHaveBeenCalledWith("paymentOrderIndex", "uid", "user-a");
    expect(payments.listRootDocumentsMatchingField).toHaveBeenCalledWith("blockchainAmountIndex", "uid", "user-a");
    expect(allWrites.some((write) => write.delete === "doc:paymentOrderIndex/private-order-index")).toBe(true);
    expect(allWrites.some((write) => write.delete === "doc:blockchainAmountIndex/private-amount-index")).toBe(true);
    expect(allWrites.some((write) => write.delete === "doc:users/user-a/privateIntegrations/binanceP2P/secrets/secret-1")).toBe(true);
    expect(allWrites.some((write) => write.delete === "doc:users/user-a")).toBe(true);
    expect(payments.listRootDocumentsMatchingField).toHaveBeenCalledWith("paymentTransactions", "uid", "user-a");
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
    expect(payments.toFields).toHaveBeenCalledWith(expect.objectContaining({
      anonymized: true,
      retentionPurpose: "duplicate_payment_prevention",
    }));
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
