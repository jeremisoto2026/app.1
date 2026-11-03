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
} = require("./payments");
const {
  encryptCredentials,
  decryptCredentials,
  verifyCredentials,
  fetchOrderHistory,
  normalizeCompletedOrder,
} = require("./bybit-p2p");

function getBybitStoragePaths(uid, environment = process.env.VERCEL_ENV) {
  const preview = environment !== "production";
  return {
    preview,
    integrationPath: "users/" + uid + "/" +
      (preview ? "previewIntegrations" : "privateIntegrations") + "/bybitP2P",
    operationsPath: "users/" + uid + "/" +
      (preview ? "previewOperations" : "operations"),
  };
}
const isPreviewEnvironment = () => getBybitStoragePaths("").preview;
const integrationPathFor = (uid) => getBybitStoragePaths(uid).integrationPath;
const operationsPathFor = (uid) => getBybitStoragePaths(uid).operationsPath;
const guardPathFor = (uid) => "users/" + uid + "/" +
  (isPreviewEnvironment() ? "previewIntegrations" : "privateIntegrations") + "/bybitP2PConnectGuard";
const sessionsPathFor = (uid) => "users/" + uid + "/sessions";
const DAY_MS = 24 * 60 * 60 * 1000;
// Version 3 establishes the import floor at the exact API connection timestamp.
const INITIAL_BACKFILL_VERSION = 3;
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

function getInitialBackfillWindow(state, connectionFloor, now) {
  // Never import orders created before the API credentials were connected.
  // This also safely migrates existing version-2 connections that used a 30-day lookback.
  if (Number(state?.initialBackfillVersion) !== INITIAL_BACKFILL_VERSION) {
    return {
      needsReset: true,
      beginTime: connectionFloor,
      endTime: now,
      page: 1,
    };
  }
  const savedStart = Number(state?.backfillStartTimestamp);
  const savedEnd = Number(state?.backfillEndTimestamp);
  return {
    needsReset: false,
    beginTime: Math.max(
      Number.isFinite(savedStart) && savedStart > 0 ? savedStart : connectionFloor,
      connectionFloor
    ),
    endTime: Number.isFinite(savedEnd) && savedEnd > connectionFloor ? savedEnd : now,
    page: pageStart(state?.nextPage),
  };
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
  const existing = new Map();
  for (let i = 0; i < ids.length; i += LOOKUP_CHUNK) {
    const matches = await listDocumentsMatchingAnyField(
      operationsPathFor(uid),
      "order_id",
      ids.slice(i, i + LOOKUP_CHUNK)
    );
    matches.forEach((document) => {
      const orderId = String(document.data?.order_id || "");
      if (!orderId) return;
      if (!existing.has(orderId)) existing.set(orderId, []);
      existing.get(orderId).push(document);
    });
  }
  return existing;
}

function findRelinkableExistingOperations(assignedCandidates, existingOrderDocuments) {
  const relinkable = [];
  for (const operation of assignedCandidates) {
    if (!operation.sessionId) continue;
    const matches = existingOrderDocuments.get(operation.order_id) || [];
    const existing = matches.find((document) =>
      document.data?.source === "bybit_p2p" &&
      !String(document.data?.sessionId || "").trim()
    );
    if (existing) relinkable.push({ existing, operation });
  }
  return relinkable;
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

async function connect(req, res) {
  if (!requirePost(req, res)) return;
  try {
    const claims = await requireFirebaseUser(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const credentials = {
      apiKey: String(body.apiKey || "").trim(),
      apiSecret: String(body.apiSecret || "").trim(),
    };
    const guardPath = guardPathFor(claims.sub);
    const guard = await getDocument(guardPath);
    const lastAttempt = guard?.data?.lastAttemptAt ? new Date(guard.data.lastAttemptAt).getTime() : 0;
    if (Number.isFinite(lastAttempt) && lastAttempt > 0 && Date.now() - lastAttempt < 5000) {
      throw new HttpError(429, "Espera unos segundos antes de volver a verificar las credenciales.");
    }
    await commitWrites([createWrite(guardPath, { lastAttemptAt: new Date() }, guard?.updateTime
      ? { updateTime: guard.updateTime }
      : { exists: false })]);

    await verifyCredentials(credentials);
    const encryptedCredentials = encryptCredentials(credentials);
    const path = integrationPathFor(claims.sub);
    const existing = await getDocument(path);
    const now = new Date();
    const lockExpiry = existing?.data?.syncLockExpiresAt
      ? new Date(existing.data.syncLockExpiresAt).getTime()
      : 0;
    if (existing?.data?.syncLockId && Number.isFinite(lockExpiry) && lockExpiry > now.getTime()) {
      throw new HttpError(409, "Hay una sincronización de Bybit en curso. Espera a que termine antes de actualizar la conexión.");
    }

    await commitWrites([createWrite(path, {
      encryptedCredentials,
      connectionStatus: "connected",
      apiKeyHint: credentials.apiKey.slice(-4),
      connectedAt: now,
      lastVerifiedAt: now,
      initialBackfillComplete: false,
      initialBackfillVersion: INITIAL_BACKFILL_VERSION,
      backfillStartTimestamp: now.getTime(),
      backfillEndTimestamp: null,
      nextPage: 1,
      pendingWindowStart: null,
      pendingWindowEnd: null,
      pendingNextPage: null,
      lastSyncAt: null,
      lastSyncAttemptAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
      lastImportedCount: 0,
      lastSkippedCount: 0,
      syncLockId: null,
      syncLockExpiresAt: new Date(0),
    }, existing?.updateTime ? { updateTime: existing.updateTime } : { exists: false })]);

    return sendJson(res, 200, {
      connected: true,
      apiKeyHint: credentials.apiKey.slice(-4),
      connectedAt: now.toISOString(),
      message: "Bybit está conectado en modo de solo lectura. Solo se importarán órdenes completadas desde el momento de esta conexión.",
    });
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(res, error);
    console.error("Bybit P2P connect failed:", error?.message || "unknown_error");
    return sendJson(res, 500, { error: "No se pudo guardar la conexión de Bybit de forma segura." });
  }
}

function serializeBybitOperation(document) {
  const data = document?.data || {};
  if (data.source !== "bybit_p2p") return null;
  const timestamp = parseTime(data.timestamp);
  const orderId = String(data.order_id || data.sourceOrderId || "").trim();
  const crypto = String(data.crypto || "").trim().toUpperCase();
  const fiat = String(data.fiat || "").trim().toUpperCase();
  const cryptoAmount = Number(data.crypto_amount);
  const fiatAmount = Number(data.fiat_amount);
  const exchangeRate = Number(data.exchange_rate);
  if (!orderId || !crypto || !fiat || !timestamp ||
      !Number.isFinite(cryptoAmount) || !Number.isFinite(fiatAmount) ||
      !Number.isFinite(exchangeRate)) return null;
  return {
    id: String(document.id || orderId),
    orderId,
    operationType: data.operation_type === "Venta" ? "Venta" : "Compra",
    crypto,
    fiat,
    cryptoAmount,
    fiatAmount,
    exchangeRate,
    timestamp: timestamp.toISOString(),
    sessionName: String(data.sessionName || "").slice(0, 120),
    sessionId: data.sessionId ? String(data.sessionId).slice(0, 160) : null,
  };
}

async function status(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Método no permitido." });
  }
  try {
    const claims = await requireFirebaseUser(req);
    const document = await getDocument(integrationPathFor(claims.sub));
    const data = document?.data || {};
    const encryptionConfigured = /^[0-9a-f]{64}$/i.test(
      String(process.env.BYBIT_P2P_ENCRYPTION_KEY || "").trim()
    );
    const payload = {
      connected: Boolean(data.encryptedCredentials && data.connectionStatus === "connected"),
      encryptionConfigured,
      previewMode: isPreviewEnvironment(),
      apiKeyHint: data.apiKeyHint || null,
      connectedAt: data.connectedAt || null,
      lastSyncAt: data.lastSyncAt || null,
      lastImportedCount: Number(data.lastImportedCount) || 0,
      lastSyncStatus: data.lastSyncStatus || null,
      lastSyncErrorCode: data.lastSyncError || null,
      initialBackfillPending: Number(data.initialBackfillVersion) !== INITIAL_BACKFILL_VERSION ||
        data.initialBackfillComplete !== true,
      hasMoreHistory: Number(data.initialBackfillVersion) !== INITIAL_BACKFILL_VERSION ||
        data.initialBackfillComplete !== true ||
        Boolean(data.pendingWindowStart && data.pendingNextPage),
    };

    // Return only sanitized Bybit records for the authenticated user and current environment.
    // Keep the regular status response small and independent from the operations listing.
    const requestUrl = new URL(String(req.url || "/"), "https://jjxcapital.internal");
    if (requestUrl.searchParams.get("view") === "operations") {
      const documents = await listAllDocuments(operationsPathFor(claims.sub), 100, 10);
      const operations = documents
        .map(serializeBybitOperation)
        .filter(Boolean)
        .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
      const requestedLimit = Number(requestUrl.searchParams.get("limit")) || 25;
      const limit = Math.max(1, Math.min(1000, requestedLimit));
      payload.operationsTotal = operations.length;
      payload.operations = operations.slice(0, limit);
    }
    return sendJson(res, 200, payload);
  } catch (error) {
    return errorResponse(res, error);
  }
}

async function disconnect(req, res) {
  if (!requirePost(req, res)) return;
  try {
    const claims = await requireFirebaseUser(req);
    const path = integrationPathFor(claims.sub);
    const existing = await getDocument(path);
    if (existing?.data?.syncLockId) {
      const lockExpiry = existing.data.syncLockExpiresAt
        ? new Date(existing.data.syncLockExpiresAt).getTime()
        : 0;
      if (Number.isFinite(lockExpiry) && lockExpiry > Date.now()) {
        throw new HttpError(409, "Hay una sincronización de Bybit en curso. Espera a que termine antes de desconectar.");
      }
    }
    if (existing) {
      await commitWrites([{
        delete: documentName(path),
        currentDocument: existing.updateTime ? { updateTime: existing.updateTime } : { exists: true },
      }]);
    }
    return sendJson(res, 200, {
      connected: false,
      message: isPreviewEnvironment()
        ? "Bybit se ha desconectado en Preview. Las operaciones de prueba importadas se conservan."
        : "Bybit se ha desconectado. Las operaciones ya importadas se conservan en tu historial.",
    });
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(res, error);
    console.error("Bybit P2P disconnect failed:", error?.message || "unknown_error");
    return sendJson(res, 500, { error: "No se pudo eliminar la conexión de Bybit." });
  }
}

async function sync(req, res) {
  if (!requirePost(req, res)) return;
  if (req.headers?.["x-jjxcapital-scheduler"] === "bybit-p2p") {
    return runBackgroundSync(req, res);
  }

  let integrationPath = "";
  let lockId = "";
  let ownsLock = false;
  try {
    const internalUid = typeof req.internalBybitP2PUserId === "string"
      ? req.internalBybitP2PUserId
      : "";
    if (internalUid && (internalUid.length > 128 || internalUid.includes("/"))) {
      throw new HttpError(400, "El identificador interno de usuario no es válido.");
    }
    const claims = internalUid ? { sub: internalUid } : await requireFirebaseUser(req);
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
    const initialBackfillWindow = getInitialBackfillWindow(state, connectionFloor, now);
    const backfill = initialBackfillWindow.needsReset || state.initialBackfillComplete !== true;
    let beginTime;
    let endTime;
    let page;

    if (backfill) {
      beginTime = initialBackfillWindow.beginTime;
      endTime = initialBackfillWindow.endTime;
      if (endTime <= beginTime) endTime = now;
      page = initialBackfillWindow.page;
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
        operation.timestamp.getTime() >= (backfill ? beginTime : connectionFloor) &&
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

    const existingOrderDocuments = await findExistingOrderDocuments(claims.sub, assignedCandidates);
    const fresh = assignedCandidates.filter((item) => !existingOrderDocuments.has(item.order_id));
    const writes = fresh.map((operation) => ({
      update: {
        name: documentName(operationsPathFor(claims.sub) + "/" + deterministicId(operation.sourceOrderId)),
        fields: toFields(operation),
      },
      currentDocument: { exists: false },
    }));

    // Match Binance behavior: attach a unique compatible session to previously
    // imported Bybit orders that are still unassigned, without changing their
    // financial fields or overwriting an existing session assignment.
    const relinkableExisting = findRelinkableExistingOperations(
      assignedCandidates,
      existingOrderDocuments
    );
    for (const { existing, operation } of relinkableExisting) {
      writes.push(createWrite(operationsPathFor(claims.sub) + "/" + existing.id, {
        sessionId: operation.sessionId,
        sessionName: operation.sessionName,
        arbitrageType: operation.arbitrageType,
      }, existing.updateTime ? { updateTime: existing.updateTime } : { exists: true }));
    }
    const relinkedExisting = relinkableExisting.length;
    if (writes.length) await commitWrites(writes);

    const nextPage = result.nextPage;
    const bothDone = nextPage === null;
    const updated = {
      connectedAt: state.connectedAt || new Date(connectionFloor),
      initialBackfillVersion: INITIAL_BACKFILL_VERSION,
      lastSyncStatus: "success",
      lastSyncError: null,
      lastSyncAttemptAt: new Date(),
      lastImportedCount: fresh.length,
      lastSkippedCount: Math.max(0, candidates.length - fresh.length),
    };

    if (backfill) {
      updated.initialBackfillComplete = bothDone;
      if (bothDone) {
        updated.lastSyncAt = new Date(endTime);
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
      sessionAssignments: { ...sessionAssignments, relinkedExisting },
      hasMoreHistory: !bothDone,
      initialBackfillPending: backfill && !bothDone,
      initialBackfillComplete: backfill ? bothDone : state.initialBackfillComplete === true,
      lastSyncAt: updated.lastSyncAt || state.lastSyncAt || null,
      message: fresh.length
        ? "Sincronización de Bybit completada: se han importado " + fresh.length + " operaciones nuevas." +
          (relinkedExisting ? " También se han vinculado " + relinkedExisting + " operaciones que ya estaban importadas." : "")
        : relinkedExisting
          ? "Sincronización de Bybit completada: se han vinculado " + relinkedExisting + " operaciones que ya estaban importadas."
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
}

async function syncBybitP2PForUser(uid) {
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    setHeader() { return this; },
    json(body) { this.body = body; return this; },
  };
  await sync({
    method: "POST",
    headers: { "x-jjxcapital-scheduler": "internal" },
    internalBybitP2PUserId: String(uid || ""),
  }, response);
  return { statusCode: response.statusCode, body: response.body || null };
}

const { createBybitP2PScheduler } = require("./bybit-p2p-scheduler");
const runBackgroundSync = createBybitP2PScheduler({ syncUser: syncBybitP2PForUser });

module.exports = {
  connect,
  status,
  disconnect,
  sync,
  syncUser: syncBybitP2PForUser,
  runBackgroundSync,
  INITIAL_BACKFILL_VERSION,
  getInitialBackfillWindow,
  serializeBybitOperation,
  getBybitStoragePaths,
};
