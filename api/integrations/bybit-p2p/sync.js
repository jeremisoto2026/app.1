const crypto = require("crypto");
const {
  HttpError,
  sendJson,
  requirePost,
  requireFirebaseUser,
  getDocument,
  listDocumentsMatchingAnyField,
  listAllDocuments,
  commitWrites,
  createWrite,
  documentName,
  toFields,
  errorResponse,
} = require("../../../lib/payments");
const { decryptCredentials, fetchOrderHistory, normalizeCompletedOrder } = require("../../../lib/bybit-p2p");

const integrationPathFor = (uid) => "users/" + uid + "/previewIntegrations/bybitP2P";
const previewOperationsPathFor = (uid) => "users/" + uid + "/previewOperations";
const sessionsPathFor = (uid) => "users/" + uid + "/sessions";
const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKUP_CHUNK = 30;
const MAX_PAGES_PER_REQUEST = 2;
const LOCK_MS = 5 * 60 * 1000;

function parseTime(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === "number" || (typeof value === "string" && /^\d{10,16}$/.test(value.trim()))) {
    const number = Number(value);
    const date = new Date(number > 0 && number < 100000000000 ? number * 1000 : number);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
}

function deterministicId(orderNumber) {
  return "bybit-p2p-" + crypto.createHash("sha256").update(String(orderNumber)).digest("hex").slice(0, 40);
}

function pageStart(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

function matchSessionForOrder(operation, sessionDocuments) {
  const operationTime = operation.timestamp instanceof Date
    ? operation.timestamp.getTime()
    : parseTime(operation.timestamp)?.getTime();
  if (!Number.isFinite(operationTime)) return { session: null, ambiguous: false };

  const matching = sessionDocuments.filter((document) => {
    const session = document.data || {};
    if (String(session.crypto || "").trim().toUpperCase() !== operation.crypto ||
        String(session.fiat || "").trim().toUpperCase() !== operation.fiat) return false;
    const createdAt = parseTime(session.createdAt);
    if (!createdAt || operationTime < createdAt.getTime()) return false;
    const closedAt = parseTime(session.closedAt);
    if (closedAt) return operationTime < closedAt.getTime();
    return session.status === "active";
  });

  if (matching.length !== 1) return { session: null, ambiguous: matching.length > 1 };
  return { session: matching[0], ambiguous: false };
}

function withSessionAssignment(operation, sessionDocuments) {
  const result = matchSessionForOrder(operation, sessionDocuments);
  if (!result.session) {
    return {
      operation: {
        ...operation,
        sessionId: null,
        sessionName: result.ambiguous ? "Bybit P2P · Sesión ambigua" : "Bybit P2P · Importado",
        arbitrageType: "Bybit P2P",
      },
      status: result.ambiguous ? "ambiguous" : "unmatched",
    };
  }
  const session = result.session.data || {};
  return {
    operation: {
      ...operation,
      sessionId: result.session.id,
      sessionName: String(session.name || "Sesión de arbitraje"),
      arbitrageType: String(session.strategy || "Comercio P2P"),
    },
    status: "matched",
  };
}

async function findExistingOrderDocuments(uid, candidates) {
  const ids = [...new Set(candidates.map((item) => item.order_id))];
  const existing = new Set();
  for (let i = 0; i < ids.length; i += LOOKUP_CHUNK) {
    const matches = await listDocumentsMatchingAnyField(
      previewOperationsPathFor(uid),
      "order_id",
      ids.slice(i, i + LOOKUP_CHUNK)
    );
    matches.forEach((document) => {
      const orderId = String(document.data?.order_id || "");
      if (orderId) existing.add(orderId);
    });
  }
  return existing;
}

async function releaseLock(path, lockId, errorCode) {
  try {
    const latest = await getDocument(path);
    if (!latest || latest.data?.syncLockId !== lockId) return;
    await commitWrites([createWrite(path, {
      syncLockId: null,
      syncLockExpiresAt: new Date(0),
      lastSyncStatus: "error",
      lastSyncError: errorCode || "internal_error",
      lastSyncAttemptAt: new Date(),
    }, latest.updateTime ? { updateTime: latest.updateTime } : { exists: true })]);
  } catch (error) {
    console.error("Bybit P2P sync lock release failed:", error?.message || "unknown_error");
  }
}

module.exports = async function syncBybitP2P(req, res) {
  if (process.env.VERCEL_ENV !== "preview") {
    return sendJson(res, 404, { error: "La sincronización Preview de Bybit no está disponible en producción." });
  }
  if (!requirePost(req, res)) return;

  let integrationPath = "";
  let lockId = "";
  let ownsLock = false;

  try {
    const claims = await requireFirebaseUser(req);
    integrationPath = integrationPathFor(claims.sub);
    const integration = await getDocument(integrationPath);
    const state = integration?.data || {};
    if (!state.encryptedCredentials || state.connectionStatus !== "connected") {
      throw new HttpError(409, "Conecta primero tu cuenta de Bybit en Mi perfil.");
    }

    const now = Date.now();
    const lockExpiry = state.syncLockExpiresAt ? new Date(state.syncLockExpiresAt).getTime() : 0;
    if (state.syncLockId && Number.isFinite(lockExpiry) && lockExpiry > now) {
      throw new HttpError(409, "Ya hay una sincronización de Bybit en curso. Espera unos segundos.");
    }

    const credentials = decryptCredentials(state.encryptedCredentials);
    lockId = crypto.randomBytes(16).toString("hex");
    await commitWrites([createWrite(integrationPath, {
      syncLockId: lockId,
      syncLockExpiresAt: new Date(now + LOCK_MS),
    }, integration.updateTime ? { updateTime: integration.updateTime } : { exists: true })]);
    ownsLock = true;

    const connectedAt = parseTime(state.connectedAt);
    const connectionFloor = connectedAt ? connectedAt.getTime() : now - 1000;
    const backfill = state.initialBackfillComplete !== true;
    let beginTime;
    let endTime;
    let page;

    if (backfill) {
      beginTime = Math.max(Number(state.backfillStartTimestamp) || connectionFloor, connectionFloor);
      endTime = Number(state.backfillEndTimestamp) || now;
      if (endTime <= beginTime) endTime = now;
      page = pageStart(state.nextPage);
    } else if (state.pendingWindowStart && state.pendingWindowEnd) {
      beginTime = Number(state.pendingWindowStart);
      endTime = Number(state.pendingWindowEnd);
      page = pageStart(state.pendingNextPage);
    } else {
      const previousSync = parseTime(state.lastSyncAt);
      beginTime = Math.max(
        connectionFloor,
        now - 179 * DAY_MS,
        previousSync ? previousSync.getTime() - 10 * 60 * 1000 : connectionFloor
      );
      endTime = now;
      page = 1;
    }

    if (!Number.isFinite(beginTime) || !Number.isFinite(endTime) ||
        endTime <= beginTime || endTime - beginTime > 180 * DAY_MS) {
      throw new HttpError(503, "El intervalo de sincronización de Bybit no es válido. Vuelve a conectar la API.");
    }

    const result = await fetchOrderHistory({
      credentials,
      beginTime,
      endTime,
      pageStart: page,
      maxPages: MAX_PAGES_PER_REQUEST,
    });

    const candidates = result.rows
      .filter((row) => Number(row?.status) === 50)
      .map(normalizeCompletedOrder)
      .filter((operation) => operation &&
        operation.timestamp.getTime() >= connectionFloor &&
        operation.timestamp.getTime() <= endTime);

    const sessionDocuments = candidates.length
      ? await listAllDocuments(sessionsPathFor(claims.sub), 100, 10)
      : [];
    const assignmentResults = candidates.map((operation) =>
      withSessionAssignment(operation, sessionDocuments)
    );
    const assignedCandidates = assignmentResults.map((item) => item.operation);
    const sessionAssignments = assignmentResults.reduce((counts, item) => {
      counts[item.status] += 1;
      return counts;
    }, { matched: 0, unmatched: 0, ambiguous: 0 });

    const existingOrderIds = await findExistingOrderDocuments(claims.sub, assignedCandidates);
    const fresh = assignedCandidates.filter((item) => !existingOrderIds.has(item.order_id));
    const writes = fresh.map((operation) => ({
      update: {
        name: documentName(previewOperationsPathFor(claims.sub) + "/" + deterministicId(operation.sourceOrderId)),
        fields: toFields(operation),
      },
      currentDocument: { exists: false },
    }));
    if (writes.length) await commitWrites(writes);

    const nextPage = result.nextPage;
    const bothDone = nextPage === null;
    const updated = {
      connectedAt: state.connectedAt || new Date(connectionFloor),
      lastSyncStatus: "success",
      lastSyncError: null,
      lastSyncAttemptAt: new Date(),
      lastImportedCount: fresh.length,
      lastSkippedCount: Math.max(0, candidates.length - fresh.length),
    };

    if (backfill) {
      updated.initialBackfillComplete = bothDone;
      if (bothDone) {
        updated.lastSyncAt = new Date();
        updated.backfillStartTimestamp = null;
        updated.backfillEndTimestamp = null;
        updated.nextPage = null;
      } else {
        updated.backfillStartTimestamp = beginTime;
        updated.backfillEndTimestamp = endTime;
        updated.nextPage = nextPage;
      }
    } else if (state.pendingWindowStart && state.pendingWindowEnd) {
      if (bothDone) {
        updated.lastSyncAt = new Date(endTime);
        updated.pendingWindowStart = null;
        updated.pendingWindowEnd = null;
        updated.pendingNextPage = null;
      } else {
        updated.pendingWindowStart = beginTime;
        updated.pendingWindowEnd = endTime;
        updated.pendingNextPage = nextPage;
      }
    } else if (bothDone) {
      updated.lastSyncAt = new Date(endTime);
      updated.pendingWindowStart = null;
      updated.pendingWindowEnd = null;
      updated.pendingNextPage = null;
    } else {
      updated.pendingWindowStart = beginTime;
      updated.pendingWindowEnd = endTime;
      updated.pendingNextPage = nextPage;
    }

    const latest = await getDocument(integrationPath);
    if (!latest || latest.data?.syncLockId !== lockId) {
      throw new HttpError(409, "La conexión de Bybit cambió durante la sincronización. Vuelve a intentarlo.");
    }
    await commitWrites([createWrite(integrationPath, {
      ...updated,
      syncLockId: null,
      syncLockExpiresAt: new Date(0),
    }, latest.updateTime ? { updateTime: latest.updateTime } : { exists: true })]);
    ownsLock = false;

    return sendJson(res, 200, {
      success: true,
      imported: fresh.length,
      skipped: Math.max(0, candidates.length - fresh.length),
      completedOrdersFound: candidates.length,
      sessionAssignments: sessionAssignments,
      hasMoreHistory: !bothDone,
      initialBackfillComplete: backfill ? bothDone : state.initialBackfillComplete === true,
      lastSyncAt: updated.lastSyncAt || state.lastSyncAt || null,
      message: fresh.length
        ? "Sincronización de Bybit completada: se han importado " + fresh.length + " operaciones nuevas."
        : "Sincronización de Bybit completada: no había operaciones completadas nuevas para importar.",
    });
  } catch (error) {
    if (ownsLock && integrationPath && lockId) {
      await releaseLock(integrationPath, lockId,
        error instanceof HttpError ? String(error.statusCode) : "internal_error");
    }
    if (error instanceof HttpError) return errorResponse(res, error);
    console.error("Bybit P2P sync failed:", error?.stack || error?.message || "unknown_error");
    return sendJson(res, 500, { error: "No se pudo sincronizar el historial P2P de Bybit." });
  }
};
