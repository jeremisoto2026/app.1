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
const {
  getPaymentTransactionReferencePath,
  isHmacPaymentTransactionId,
} = require("./payment-reference");

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

function pseudonymizedTransactionFields(document) {
  const id = String(document?.id || "");
  const sourceProvider = String(document?.data?.provider || "").toLowerCase();
  const provider = ["binance_pay", "blockchain_bep20"].includes(sourceProvider)
    ? sourceProvider
    : id.startsWith("hmac_v1_blockchain_bep20_") || id.startsWith("bep20_")
      ? "blockchain_bep20"
      : id.startsWith("hmac_v1_binance_pay_") || id.startsWith("binance_")
        ? "binance_pay"
        : "other";

  return {
    provider,
    pseudonymized: true,
    retentionPurpose: "duplicate_payment_prevention",
    pseudonymizedAt: new Date(),
  };
}

function getLegacyPaymentReference(document) {
  const id = String(document?.id || "");
  const data = document?.data || {};
  const sourceProvider = String(data.provider || "").toLowerCase();
  const provider = ["binance_pay", "blockchain_bep20"].includes(sourceProvider)
    ? sourceProvider
    : id.startsWith("bep20_")
      ? "blockchain_bep20"
      : id.startsWith("binance_")
        ? "binance_pay"
        : "";

  if (provider === "blockchain_bep20") {
    const idMatch = /^bep20_([a-f0-9]{64})$/i.exec(id);
    const reference = String(data.txHash || (idMatch ? "0x" + idMatch[1] : "")).trim();
    if (!/^0x[a-f0-9]{64}$/i.test(reference)) {
      throw new HttpError(503, "No se pudo recuperar la referencia BEP20 histórica; la eliminación se detuvo para no perder el bloqueo de duplicados.");
    }
    return { provider, reference: reference.toLowerCase() };
  }

  if (provider === "binance_pay") {
    const reference = String(data.transactionId || "").trim();
    if (!reference) {
      throw new HttpError(503, "No se pudo recuperar la referencia histórica de Binance Pay; la eliminación se detuvo para no perder el bloqueo de duplicados.");
    }
    return { provider, reference };
  }

  throw new HttpError(503, "Se encontró un proveedor de pago histórico no reconocido; la eliminación se detuvo para proteger el índice contra duplicados.");
}

async function pseudonymizePaymentTransactions(uid) {
  const transactions = await listRootDocumentsMatchingField("paymentTransactions", "uid", uid);
  const writes = [];

  for (const document of transactions) {
    const fields = pseudonymizedTransactionFields(document);
    const documentPath = "paymentTransactions/" + document.id;

    if (isHmacPaymentTransactionId(document.id)) {
      writes.push({
        update: {
          name: documentName(documentPath),
          fields: toFields(fields),
        },
        currentDocument: document.updateTime
          ? { updateTime: document.updateTime }
          : { exists: true },
      });
      continue;
    }

    const { provider, reference } = getLegacyPaymentReference(document);
    const hmacPath = getPaymentTransactionReferencePath(provider, reference);
    const existingHmacMarker = await getDocument(hmacPath);

    // Create the HMAC marker before removing the raw-ID document.
    // The exists:false precondition protects against a concurrent claim.
    if (!existingHmacMarker) {
      writes.push(createWrite(hmacPath, fields, { exists: false }));
    }
    writes.push({
      delete: documentName(documentPath),
      currentDocument: document.updateTime
        ? { updateTime: document.updateTime }
        : { exists: true },
    });
  }

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

  const pseudonymizedPaymentTransactions = await pseudonymizePaymentTransactions(uid);
  const deletedPaymentOrderIndexes = await deleteOwnedRootIndexDocuments("paymentOrderIndex", uid);
  const deletedBlockchainAmountIndexes = await deleteOwnedRootIndexDocuments("blockchainAmountIndex", uid);
  const deletedUserDocuments = await deleteUserFirestoreTree(uid);

  return {
    pseudonymizedPaymentTransactions,
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
  pseudonymizedTransactionFields,
  getLegacyPaymentReference,
  pseudonymizePaymentTransactions,
  deleteOwnedRootIndexDocuments,
  deleteUserFirestoreTree,
  deleteUserAccountData,
};
