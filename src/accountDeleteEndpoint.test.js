jest.mock("../lib/payments", () => ({
  HttpError: class HttpError extends Error {
    constructor(statusCode, message) { super(message); this.statusCode = statusCode; }
  },
  sendJson: jest.fn((res, status, payload) => {
    res.statusCode = status;
    res.body = payload;
    return res;
  }),
  requirePost: jest.fn(() => true),
  requireFirebaseUser: jest.fn(),
  errorResponse: jest.fn((res, error) => {
    res.statusCode = error.statusCode || 500;
    res.body = { error: error.message };
    return res;
  }),
}));

jest.mock("../lib/account-deletion", () => ({
  acquireAccountDeletionLock: jest.fn(),
  markAccountDeletionRetryable: jest.fn(),
  releaseAccountDeletionLock: jest.fn(),
  deleteUserAccountData: jest.fn(),
}));

jest.mock("../lib/firebase-session", () => ({
  deleteFirebaseAuthAccount: jest.fn(),
}));

const payments = require("../lib/payments");
const deletion = require("../lib/account-deletion");
const firebaseSession = require("../lib/firebase-session");
const deleteAccount = require("../lib/account-delete-endpoint");

describe("Account deletion endpoint", () => {
  const now = Math.floor(Date.now() / 1000);
  let originalLockFlag;

  beforeAll(() => {
    originalLockFlag = process.env.FIRESTORE_ACCOUNT_DELETION_LOCKS_ACTIVE;
  });

  afterAll(() => {
    if (originalLockFlag === undefined) delete process.env.FIRESTORE_ACCOUNT_DELETION_LOCKS_ACTIVE;
    else process.env.FIRESTORE_ACCOUNT_DELETION_LOCKS_ACTIVE = originalLockFlag;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FIRESTORE_ACCOUNT_DELETION_LOCKS_ACTIVE = "true";
    payments.requirePost.mockImplementation(() => true);
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
    payments.requireFirebaseUser.mockResolvedValue({ sub: "authenticated-user", auth_time: now });
    deletion.acquireAccountDeletionLock.mockResolvedValue({});
    deletion.deleteUserAccountData.mockResolvedValue({
      anonymizedPaymentTransactions: 2,
      deletedPaymentOrderIndexes: 1,
      deletedBlockchainAmountIndexes: 1,
      deletedUserDocuments: 8,
    });
    firebaseSession.deleteFirebaseAuthAccount.mockResolvedValue({ deleted: true });
    deletion.releaseAccountDeletionLock.mockResolvedValue({});
    deletion.markAccountDeletionRetryable.mockResolvedValue({});
  });

  test("keeps deletion disabled until lock-aware Firestore rules are enabled", async () => {
    process.env.FIRESTORE_ACCOUNT_DELETION_LOCKS_ACTIVE = "false";
    const res = {};
    await deleteAccount({
      method: "POST",
      headers: { authorization: "Bearer test-id-token" },
      body: { confirmation: "DELETE_MY_ACCOUNT" },
    }, res);

    expect(res.statusCode).toBe(503);
    expect(payments.requireFirebaseUser).not.toHaveBeenCalled();
    expect(deletion.acquireAccountDeletionLock).not.toHaveBeenCalled();
    expect(deletion.deleteUserAccountData).not.toHaveBeenCalled();
  });

  test("requires explicit confirmation before changing any data", async () => {
    const res = {};
    await deleteAccount({
      method: "POST",
      headers: { authorization: "Bearer test-id-token" },
      body: {},
    }, res);

    expect(res.statusCode).toBe(400);
    expect(deletion.acquireAccountDeletionLock).not.toHaveBeenCalled();
    expect(deletion.deleteUserAccountData).not.toHaveBeenCalled();
    expect(firebaseSession.deleteFirebaseAuthAccount).not.toHaveBeenCalled();
  });

  test("requires a recent authentication event", async () => {
    payments.requireFirebaseUser.mockResolvedValueOnce({
      sub: "authenticated-user",
      auth_time: now - 3600,
    });
    const res = {};
    await deleteAccount({
      method: "POST",
      headers: { authorization: "Bearer test-id-token" },
      body: { confirmation: "DELETE_MY_ACCOUNT" },
    }, res);

    expect(res.statusCode).toBe(401);
    expect(deletion.acquireAccountDeletionLock).not.toHaveBeenCalled();
  });

  test("uses the verified UID and anonymizes data before deleting Firebase Auth", async () => {
    const order = [];
    deletion.acquireAccountDeletionLock.mockImplementation(async (uid) => order.push("lock:" + uid));
    deletion.deleteUserAccountData.mockImplementation(async (uid) => {
      order.push("cleanup:" + uid);
      return { anonymizedPaymentTransactions: 2 };
    });
    firebaseSession.deleteFirebaseAuthAccount.mockImplementation(async ({ idToken }) => {
      order.push("auth:" + idToken);
      return { deleted: true };
    });
    deletion.releaseAccountDeletionLock.mockImplementation(async (uid) => order.push("unlock:" + uid));

    const res = {};
    await deleteAccount({
      method: "POST",
      headers: { authorization: "Bearer valid-id-token" },
      body: {
        confirmation: "DELETE_MY_ACCOUNT",
        uid: "forged-user",
        userId: "forged-user",
      },
    }, res);

    expect(order).toEqual([
      "lock:authenticated-user",
      "cleanup:authenticated-user",
      "auth:valid-id-token",
      "unlock:authenticated-user",
    ]);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      deleted: true,
      retainedAnonymizedPaymentReferences: 2,
    });
  });

  test("leaves a retryable lock and does not delete Auth if data cleanup fails", async () => {
    deletion.deleteUserAccountData.mockRejectedValueOnce(new Error("Firestore unavailable"));
    const res = {};
    await deleteAccount({
      method: "POST",
      headers: { authorization: "Bearer valid-id-token" },
      body: { confirmation: "DELETE_MY_ACCOUNT" },
    }, res);

    expect(deletion.markAccountDeletionRetryable).toHaveBeenCalledWith("authenticated-user");
    expect(firebaseSession.deleteFirebaseAuthAccount).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
  });

  test("does not remove the lock when Firebase Auth deletion needs fresh credentials", async () => {
    firebaseSession.deleteFirebaseAuthAccount.mockRejectedValueOnce(Object.assign(
      new Error("Vuelve a confirmar tu identidad antes de eliminar la cuenta."),
      { statusCode: 401 }
    ));
    const res = {};
    await deleteAccount({
      method: "POST",
      headers: { authorization: "Bearer valid-id-token" },
      body: { confirmation: "DELETE_MY_ACCOUNT" },
    }, res);

    expect(deletion.markAccountDeletionRetryable).toHaveBeenCalledWith("authenticated-user");
    expect(deletion.releaseAccountDeletionLock).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});
