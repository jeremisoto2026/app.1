const {
  HttpError,
  getDocument,
  listAllDocuments,
  listCollectionIds,
  listRootDocumentsMatchingField,
  commitWrites,
  createWrite,
  documentName,
  toFields,
} = require("./payments");

const WRITE_BATCH_SIZE = 400;
const MAX_USER_DOCUMENTS = 10000;
const MAX_USER_DEPTH = 20;

function accountDeletionLockPath(uid) {
  return "accountDeletionLocks/" + String(uid || "");
}

function toTimestamp(value) {
  if (value && typeof value.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date ? date.getTime() : Number.NaN;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") return new Date(value).getTime();
  return Number.NaN;
}

async function commitInBatches(writes) {
  for (let index = 0; index < writes.length; index += WRITE_BATCH_SIZE) {
    await commitWrites(writes.slice(index, index + WRITE_BATCH_SIZE));
  }
}

async function acquireAccountDeletionLock(uid, now = new Date()) {
  const lockPath = accountDeletionLockPath(uid);
  const existing = await getDocument(lockPath);
  if (existing) {
    const leaseExpiry = toTimestamp(existing.data?.leaseExpiresAt);
    if (Number.isFinite(leaseExpiry) && leaseExpiry > now.getTime()) {
      throw new HttpError(409, "La eliminación de esta cuenta ya está en curso.");
    }
  }

  const startedAt = existing?.data?.startedAt
    ? new Date(existing.data.startedAt)
    : now;
  await commitWrites([createWrite(lockPath, {
    startedAt,
    lastAttemptAt: now,
    leaseExpiresAt: new Date(now.getTime() + 10 * 60 * 1000),
    status: "in_progress",
  }, existing?.updateTime ? { updateTime: existing.updateTime } : { exists: false })]);

  return { lockPath };
}

async function markAccountDeletionRetryable(uid) {
  const lockPath = accountDeletionLockPath(uid);
  const existing = await getDocument(lockPath);
  if (!existing) return;
  await commitWrites([createWrite(lockPath, {
    status: "pending_retry",
    leaseExpiresAt: new Date(0),
    lastAttemptAt: new Date(),
  }, existing.updateTime ? { updateTime: existing.updateTime } : { exists: true })]);
}

async function releaseAccountDeletionLock(uid) {
  const lockPath = accountDeletionLockPath(uid);
  const existing = await getDocument(lockPath);
  if (!existing) return;
  await commitWrites([{
    delete: documentName(lockPath),
    currentDocument: existing.updateTime
      ? { updateTime: existing.updateTime }
      : { exists: true },
  }]);
}

function anonymizedTransactionFields(document) {
  const id = String(document?.id || "");
  const sourceProvider = String(document?.data?.provider || "").toLowerCase();
  const provider = ["binance_pay", "blockchain_bep20"].includes(sourceProvider)
    ? sourceProvider
    : id.startsWith("bep20_")
      ? "blockchain_bep20"
      : id.startsWith("binance_")
        ? "binance_pay"
        : "other";

  // Keep the unique Firestore document ID (the payment reference) but remove all
  // fields that could link the transaction back to a user or a user payment.
  return {
    provider,
    anonymized: true,
    retentionPurpose: "duplicate_payment_prevention",
    anonymizedAt: new Date(),
  };
}

async function anonymizePaymentTransactions(uid) {
  const transactions = await listRootDocumentsMatchingField("paymentTransactions", "uid", uid);
  const writes = transactions.map((document) => ({
    update: {
      name: documentName("paymentTransactions/" + document.id),
      fields: toFields(anonymizedTransactionFields(document)),
    },
    currentDocument: document.updateTime
      ? { updateTime: document.updateTime }
      : { exists: true },
  }));
  await commitInBatches(writes);
  return transactions.length;
}

async function deleteOwnedRootIndexDocuments(collectionId, uid) {
  const documents = await listRootDocumentsMatchingField(collectionId, "uid", uid);
  const writes = documents.map((document) => ({
    delete: documentName(collectionId + "/" + document.id),
    currentDocument: document.updateTime
      ? { updateTime: document.updateTime }
      : { exists: true },
  }));
  await commitInBatches(writes);
  return documents.length;
}

async function collectUserDescendants(documentPath, collected, depth = 0) {
  if (depth > MAX_USER_DEPTH) {
    throw new HttpError(503, "La estructura de datos de la cuenta supera la profundidad admitida para una eliminación segura.");
  }

  const collectionIds = await listCollectionIds(documentPath, 100, 100);
  for (const collectionId of collectionIds) {
    const collectionPath = documentPath + "/" + collectionId;
    const documents = await listAllDocuments(collectionPath, 100, 100);
    for (const document of documents) {
      if (!document.id) throw new HttpError(503, "Se encontró un registro sin identificador y se detuvo la eliminación por seguridad.");
      const childPath = collectionPath + "/" + document.id;
      await collectUserDescendants(childPath, collected, depth + 1);
      collected.push({
        path: childPath,
        updateTime: document.updateTime || null,
      });
      if (collected.length > MAX_USER_DOCUMENTS) {
        throw new HttpError(503, "La cuenta contiene más de 10.000 registros. Se requiere una eliminación por lotes asistida para evitar una limpieza incompleta.");
      }
    }
  }
}

async function deleteUserFirestoreTree(uid) {
  const userPath = "users/" + uid;
  const documents = [];
  await collectUserDescendants(userPath, documents);
  const rootDocument = await getDocument(userPath);
  if (rootDocument) {
    documents.push({
      path: userPath,
      updateTime: rootDocument.updateTime || null,
    });
  }

  const writes = documents.map((document) => ({
    delete: documentName(document.path),
    currentDocument: document.updateTime
      ? { updateTime: document.updateTime }
      : { exists: true },
  }));
  await commitInBatches(writes);
  return documents.length;
}

async function deleteUserAccountData(uid) {
  if (typeof uid !== "string" || !uid.trim()) {
    throw new HttpError(400, "No se pudo identificar la cuenta que se va a eliminar.");
  }

  const anonymizedPaymentTransactions = await anonymizePaymentTransactions(uid);
  const deletedPaymentOrderIndexes = await deleteOwnedRootIndexDocuments("paymentOrderIndex", uid);
  const deletedBlockchainAmountIndexes = await deleteOwnedRootIndexDocuments("blockchainAmountIndex", uid);
  const deletedUserDocuments = await deleteUserFirestoreTree(uid);

  return {
    anonymizedPaymentTransactions,
    deletedPaymentOrderIndexes,
    deletedBlockchainAmountIndexes,
    deletedUserDocuments,
  };
}

module.exports = {
  accountDeletionLockPath,
  acquireAccountDeletionLock,
  markAccountDeletionRetryable,
  releaseAccountDeletionLock,
  anonymizedTransactionFields,
  anonymizePaymentTransactions,
  deleteOwnedRootIndexDocuments,
  deleteUserFirestoreTree,
  deleteUserAccountData,
};
