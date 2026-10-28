const crypto = require("crypto");
const {
  HttpError, sendJson, requirePost, requireFirebaseUser, getDocument,
  listDocumentsMatchingAnyField, listAllDocuments, commitWrites, createWrite, documentName, toFields, errorResponse,
} = require("../../../lib/payments");
const { decryptCredentials, fetchHistory } = require("../../../lib/binance-p2p");

const integrationPathFor = (uid) => "users/" + uid + "/privateIntegrations/binanceP2P";
const operationsPathFor = (uid) => "users/" + uid + "/operations";
const sessionsPathFor = (uid) => "users/" + uid + "/sessions";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PAGES_PER_SIDE_PER_REQUEST = 2;
const LOOKUP_CHUNK = 30;
const LOCK_MS = 5 * 60 * 1000;

function num(value) {
  if (typeof value === "string" && !value.trim()) return NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}
function parseTime(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === "number" || (typeof value === "string" && /^\d{10,16}$/.test(value.trim()))) {
    const n = Number(value);
    const date = new Date(n > 0 && n < 100000000000 ? n * 1000 : n);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
}
function isCompleted(row) {
  const status = String(row?.orderStatus ?? row?.status ?? "").trim().toUpperCase();
  return status === "COMPLETED" || status === "4";
}
function normalizeOrder(row) {
  const orderNumber = String(row?.orderNumber ?? row?.orderNo ?? row?.orderId ?? "").trim();
  const tradeType = String(row?.tradeType ?? "").trim().toUpperCase();
  const crypto = String(row?.asset ?? row?.crypto ?? "").trim().toUpperCase();
  const fiat = String(row?.fiat ?? row?.fiatUnit ?? "").trim().toUpperCase();
  const cryptoAmount = num(row?.amount);
  const fiatAmount = num(row?.totalPrice);
  const rawRate = num(row?.unitPrice ?? row?.price);
  const rate = Number.isFinite(rawRate) && rawRate > 0 ? rawRate : fiatAmount / cryptoAmount;
  const timestamp = parseTime(row?.createTime ?? row?.createdAt ?? row?.timestamp);
  if (!orderNumber || orderNumber.length > 160 ||
      (tradeType !== "BUY" && tradeType !== "SELL") ||
      !crypto || !fiat || crypto === fiat ||
      !Number.isFinite(cryptoAmount) || cryptoAmount <= 0 ||
      !Number.isFinite(fiatAmount) || fiatAmount <= 0 ||
      !Number.isFinite(rate) || rate <= 0 || !timestamp) return null;

  const commission = num(row?.commission);
  const takerCommission = num(row?.takerCommission);
  const takerAmount = num(row?.takerAmount);
  const advertisementRole = String(row?.advertisementRole ?? "").trim().toUpperCase();
  const sourceFee = advertisementRole === "TAKER"
    ? (Number.isFinite(takerCommission) ? takerCommission : commission)
    : (Number.isFinite(commission) ? commission : takerCommission);
  const fee = Number.isFinite(sourceFee) && sourceFee > 0 ? sourceFee : 0;
  return {
    order_id: orderNumber,
    source: "binance_p2p",
    sourceOrderId: orderNumber,
    sourceStatus: String(row?.orderStatus ?? row?.status ?? ""),
    sourceCommission: Number.isFinite(commission) ? commission : null,
    sourceTakerCommission: Number.isFinite(takerCommission) ? takerCommission : null,
    sourceTakerAmount: Number.isFinite(takerAmount) ? takerAmount : null,
    sourceAdvertisementNumber: String(row?.advNo ?? row?.advOrderNumber ?? "").trim() || null,
    sourceFiatSymbol: String(row?.fiatSymbol ?? "").trim() || null,
    sourcePayMethodName: String(row?.payMethodName ?? "").trim() || null,
    sourceAdvertisementRole: advertisementRole || null,
    exchange: "Binance",
    operation_type: tradeType === "BUY" ? "Compra" : "Venta",
    crypto,
    fiat,
    crypto_amount: cryptoAmount,
    fiat_amount: fiatAmount,
    exchange_rate: rate,
    // Binance documents this commission in crypto; preserve it without subtracting it twice
    // from the gross amounts already reported by the order-history endpoint.
    fee,
    fee_currency: crypto,
    timestamp,
    importedAt: new Date(),
    sessionId: null,
    sessionName: "Binance P2P · Importado",
    arbitrageType: "Binance P2P",
  };
}
function deterministicId(orderNumber) {
  return "binance-p2p-" + crypto.createHash("sha256").update(orderNumber).digest("hex").slice(0, 40);
}
function pageStart(value, fallback = 1) {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}
function emptyResult() {
  return { rows: [], total: 0, nextPage: null, pagesFetched: 0 };
}
async function fetchSide(credentials, tradeType, startTimestamp, endTimestamp, page) {
  if (page === null) return emptyResult();
  return fetchHistory({
    credentials, tradeType, startTimestamp, endTimestamp,
    pageStart: page, maxPages: MAX_PAGES_PER_SIDE_PER_REQUEST,
  });
}
async function findExistingOrderDocuments(uid, candidates) {
  const ids = [...new Set(candidates.map((item) => item.order_id))];
  const existing = new Map();
  for (let i = 0; i < ids.length; i += LOOKUP_CHUNK) {
    const matches = await listDocumentsMatchingAnyField(
      operationsPathFor(uid), "order_id", ids.slice(i, i + LOOKUP_CHUNK)
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
        sessionName: result.ambiguous ? "Binance P2P · Sesión ambigua" : "Binance P2P · Importado",
        arbitrageType: "Binance P2P",
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
async function releaseLock(path, fields, lockId) {
  try {
    const latest = await getDocument(path);
    if (!latest || latest.data?.syncLockId !== lockId) return;
    await commitWrites([createWrite(path, {
      ...fields, syncLockId: null, syncLockExpiresAt: new Date(0),
    }, latest.updateTime ? { updateTime: latest.updateTime } : { exists: true })]);
  } catch (error) {
    console.error("Binance P2P sync lock release failed:", error?.message || "unknown_error");
  }
}

module.exports = async function syncBinanceP2P(req, res) {
  if (!requirePost(req, res)) return;
  let integrationPath = "";
  let lockId = "";
  let ownsLock = false;
  let errorFields = {};

  try {
    const claims = await requireFirebaseUser(req);
    integrationPath = integrationPathFor(claims.sub);
    const integration = await getDocument(integrationPath);
    if (!integration?.data?.encryptedCredentials || integration.data.connectionStatus !== "connected") {
      throw new HttpError(409, "Conecta primero tu cuenta de Binance P2P en Perfil.");
    }
    const requestNow = Date.now();
    let startTimestamp;
    let endTimestamp;
    let buyPage;
    let sellPage;
    let mode;
    let pendingWindow = false;
    const backfill = state.initialBackfillComplete !== true;

    const connectedAt = parseTime(state.connectedAt);
    const connectionFloor = connectedAt ? connectedAt.getTime() : requestNow - 1000;

    if (backfill) {
      mode = "backfill";
      const savedBackfillStart = Number(state.backfillStartTimestamp);
      startTimestamp = Math.max(
        Number.isFinite(savedBackfillStart) && savedBackfillStart > 0 ? savedBackfillStart : connectionFloor,
        connectionFloor
      );
      endTimestamp = Number(state.backfillEndTimestamp) || requestNow;
      // Older stored setups may have saved the end at connection time; in that case
      // use the current request time. The lower bound still prevents pre-connection imports.
      if (endTimestamp <= startTimestamp) endTimestamp = requestNow;
      buyPage = pageStart(state.nextBuyPage, 1);
      sellPage = pageStart(state.nextSellPage, 1);
    } else if (state.pendingWindowStart && state.pendingWindowEnd) {
      mode = "incremental";
      pendingWindow = true;
      startTimestamp = Number(state.pendingWindowStart);
      endTimestamp = Number(state.pendingWindowEnd);
      buyPage = pageStart(state.pendingNextBuyPage, null);
      sellPage = pageStart(state.pendingNextSellPage, null);
    } else {
      mode = "incremental";
      const previousSync = parseTime(state.lastSyncAt);
      const defaultStart = connectionFloor;
      startTimestamp = Math.max(
        connectionFloor,
        requestNow - 29 * DAY_MS,
        previousSync ? previousSync.getTime() - 10 * 60 * 1000 : defaultStart
      );
      endTimestamp = requestNow;
      buyPage = 1;
      sellPage = 1;
    }

    if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp) ||
        endTimestamp <= startTimestamp || endTimestamp - startTimestamp > 30 * DAY_MS) {
      throw new HttpError(503, "El intervalo de sincronización no es válido. Desconecta y vuelve a conectar Binance.");
    }

    const [buyResult, sellResult] = await Promise.all([
      fetchSide(credentials, "BUY", startTimestamp, endTimestamp, buyPage),
      fetchSide(credentials, "SELL", startTimestamp, endTimestamp, sellPage),
    ]);

    const sourceRows = [...buyResult.rows, ...sellResult.rows];
    const completedSourceRows = sourceRows.filter(isCompleted);

    const byOrder = new Map();
    completedSourceRows.forEach((row) => {
      const normalized = normalizeOrder(row);
      if (!normalized) return;
      if (!byOrder.has(normalized.sourceOrderId)) byOrder.set(normalized.sourceOrderId, normalized);
    });
    const candidates = [...byOrder.values()];
    const sessionDocuments = candidates.length
      ? await listAllDocuments(sessionsPathFor(claims.sub), 100, 10)
      : [];
    const assignmentResults = candidates.map((operation) => withSessionAssignment(operation, sessionDocuments));
    const assignedCandidates = assignmentResults.map((result) => result.operation);
    const sessionAssignments = assignmentResults.reduce((counts, result) => {
      counts[result.status] += 1;
      return counts;
    }, { matched: 0, unmatched: 0, ambiguous: 0 });

    const existingOrderDocuments = await findExistingOrderDocuments(claims.sub, assignedCandidates);
    const fresh = assignedCandidates.filter((item) => !existingOrderDocuments.has(item.order_id));
    const writes = fresh.map((operation) => ({
      update: {
        name: documentName(operationsPathFor(claims.sub) + "/" + deterministicId(operation.order_id)),
        fields: toFields(operation),
      },
      currentDocument: { exists: false },
    }));

    // If a previous version imported this Binance order without a session, attach it now
    // only when the session match is unique and the record is an existing Binance import.
    let relinkedExisting = 0;
    for (const operation of assignedCandidates) {
      if (!operation.sessionId) continue;
      const matches = existingOrderDocuments.get(operation.order_id) || [];
      const existing = matches.find((item) =>
        item.data?.source === "binance_p2p" && !item.data?.sessionId
      );
      if (!existing) continue;
      writes.push(createWrite(operationsPathFor(claims.sub) + "/" + existing.id, {
        sessionId: operation.sessionId,
        sessionName: operation.sessionName,
        arbitrageType: operation.arbitrageType,
      }, existing.updateTime ? { updateTime: existing.updateTime } : { exists: true }));
      relinkedExisting += 1;
    }
    if (writes.length) await commitWrites(writes);

    const nextBuyPage = buyResult.nextPage;
    const nextSellPage = sellResult.nextPage;
    const bothDone = nextBuyPage === null && nextSellPage === null;
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
      updated.nextBuyPage = nextBuyPage;
      updated.nextSellPage = nextSellPage;
      if (bothDone) {
        updated.lastSyncAt = new Date();
        updated.backfillStartTimestamp = null;
        updated.backfillEndTimestamp = null;
        updated.nextBuyPage = null;
        updated.nextSellPage = null;
      } else {
        updated.backfillStartTimestamp = startTimestamp;
        updated.backfillEndTimestamp = endTimestamp;
      }
    } else if (pendingWindow) {
      if (bothDone) {
        updated.lastSyncAt = new Date(endTimestamp);
        updated.pendingWindowStart = null;
        updated.pendingWindowEnd = null;
        updated.pendingNextBuyPage = null;
        updated.pendingNextSellPage = null;
      } else {
        updated.pendingWindowStart = startTimestamp;
        updated.pendingWindowEnd = endTimestamp;
        updated.pendingNextBuyPage = nextBuyPage;
        updated.pendingNextSellPage = nextSellPage;
      }
    } else if (bothDone) {
      updated.lastSyncAt = new Date(endTimestamp);
      updated.pendingWindowStart = null;
      updated.pendingWindowEnd = null;
      updated.pendingNextBuyPage = null;
      updated.pendingNextSellPage = null;
    } else {
      updated.pendingWindowStart = startTimestamp;
      updated.pendingWindowEnd = endTimestamp;
      updated.pendingNextBuyPage = nextBuyPage;
      updated.pendingNextSellPage = nextSellPage;
    }

    const latest = await getDocument(integrationPath);
    if (!latest || latest.data?.syncLockId !== lockId) {
      throw new HttpError(409, "La conexión cambió durante la sincronización. Vuelve a intentarlo.");
    }
    errorFields = updated;
    await commitWrites([createWrite(integrationPath, {
      ...updated, syncLockId: null, syncLockExpiresAt: new Date(0),
    }, latest.updateTime ? { updateTime: latest.updateTime } : { exists: true })]);
    ownsLock = false;

    const hasMore = !bothDone;
    return sendJson(res, 200, {
      success: true,
      imported: fresh.length,
      skipped: Math.max(0, candidates.length - fresh.length),
      completedOrdersFound: candidates.length,
      sessionAssignments: { ...sessionAssignments, relinkedExisting },
      hasMoreHistory: hasMore,
      initialBackfillComplete: backfill ? bothDone : state.initialBackfillComplete === true,
      lastSyncAt: updated.lastSyncAt || state.lastSyncAt || null,
      message: fresh.length
        ? "Sincronización completada: se han importado " + fresh.length + " operaciones nuevas. Vinculadas automáticamente a una sesión: " + sessionAssignments.matched + "."
        : "Sincronización completada: no había operaciones completadas nuevas para importar." +
          (relinkedExisting ? " Se han vinculado " + relinkedExisting + " operaciones importadas previamente a su sesión." : ""),
    });
  } catch (error) {
    if (ownsLock && integrationPath && lockId) {
      await releaseLock(integrationPath, {
        ...errorFields,
        lastSyncStatus: "error",
        lastSyncError: error instanceof HttpError ? String(error.statusCode) : "internal_error",
        lastSyncAttemptAt: new Date(),
      }, lockId);
    }
    if (error instanceof HttpError) return errorResponse(res, error);
    console.error("Binance P2P sync failed:", error?.message || "unknown_error");
    return sendJson(res, 500, { error: "No se pudo sincronizar el historial P2P. Inténtalo de nuevo." });
  }
};

