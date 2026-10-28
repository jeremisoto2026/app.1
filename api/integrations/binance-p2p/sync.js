const crypto = require("crypto");
const {
  HttpError, sendJson, requirePost, requireFirebaseUser, getDocument,
  listDocumentsMatchingAnyField, commitWrites, createWrite, documentName, toFields, errorResponse,
} = require("../../../lib/payments");
const { decryptCredentials, fetchHistory } = require("../../../lib/binance-p2p");

const integrationPathFor = (uid) => "users/" + uid + "/privateIntegrations/binanceP2P";
const operationsPathFor = (uid) => "users/" + uid + "/operations";
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
  return {
    order_id: orderNumber,
    source: "binance_p2p",
    sourceOrderId: orderNumber,
    sourceStatus: String(row?.orderStatus ?? row?.status ?? ""),
    sourceCommission: Number.isFinite(commission) ? commission : null,
    sourceTakerCommission: Number.isFinite(takerCommission) ? takerCommission : null,
    sourceTakerAmount: Number.isFinite(takerAmount) ? takerAmount : null,
    exchange: "Binance",
    operation_type: tradeType === "BUY" ? "Compra" : "Venta",
    crypto,
    fiat,
    crypto_amount: cryptoAmount,
    fiat_amount: fiatAmount,
    exchange_rate: rate,
    // Preserve Binance fees separately until the exact fee currency/net semantics are confirmed.
    fee: 0,
    fee_currency: "",
    timestamp,
    importedAt: new Date(),
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
async function findExistingOrderIds(uid, candidates) {
  const ids = [...new Set(candidates.map((item) => item.order_id))];
  const existing = new Set();
  for (let i = 0; i < ids.length; i += LOOKUP_CHUNK) {
    const matches = await listDocumentsMatchingAnyField(
      operationsPathFor(uid), "order_id", ids.slice(i, i + LOOKUP_CHUNK)
    );
    matches.forEach((document) => {
      const orderId = String(document.data?.order_id || "");
      if (orderId) existing.add(orderId);
    });
  }
  return existing;
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
    const historyProbe = req.body?.historyProbe === true;
    if (historyProbe && process.env.VERCEL_ENV !== "preview") {
      throw new HttpError(403, "La prueba de historial antiguo solo está disponible en Preview.");
    }

    const now = Date.now();
    const lastAttempt = parseTime(integration.data.lastSyncAttemptAt);
    if (lastAttempt && now - lastAttempt.getTime() < 5000) {
      throw new HttpError(429, "Espera unos segundos antes de volver a sincronizar.");
    }
    const lockExpiry = parseTime(integration.data.syncLockExpiresAt);
    if (integration.data.syncLockId && lockExpiry && lockExpiry.getTime() > now) {
      throw new HttpError(409, "Ya hay una sincronización en curso. Espera a que termine.");
    }

    lockId = crypto.randomUUID();
    await commitWrites([createWrite(integrationPath, {
      syncLockId: lockId,
      syncLockExpiresAt: new Date(now + LOCK_MS),
      lastSyncStatus: "syncing",
      lastSyncAttemptAt: new Date(now),
      lastSyncError: null,
    }, integration.updateTime ? { updateTime: integration.updateTime } : { exists: true })]);
    ownsLock = true;

    const locked = await getDocument(integrationPath);
    if (!locked || locked.data?.syncLockId !== lockId) {
      throw new HttpError(409, "No se pudo reservar la sincronización. Inténtalo de nuevo.");
    }
    const state = locked.data;
    const credentials = decryptCredentials(state.encryptedCredentials);

    if (historyProbe) {
      // Read-only historical diagnostic: scan 181–365 days ago in safe windows under Binance's 30-day interval limit.
      // It deliberately does not import records or change the regular sync cursor.
      const probeNow = Date.now();
      const oldestTimestamp = probeNow - 365 * DAY_MS;
      const newestTimestamp = probeNow - 181 * DAY_MS;
      const windows = [];
      for (let cursor = oldestTimestamp; cursor < newestTimestamp;) {
        const windowEnd = Math.min(cursor + 29 * DAY_MS, newestTimestamp);
        windows.push({ startTimestamp: cursor, endTimestamp: windowEnd });
        cursor = windowEnd;
      }

      const windowResults = await Promise.all(windows.map(async (window) => {
        const [buyResult, sellResult] = await Promise.all([
          fetchSide(credentials, "BUY", window.startTimestamp, window.endTimestamp, 1),
          fetchSide(credentials, "SELL", window.startTimestamp, window.endTimestamp, 1),
        ]);
        const rows = [...buyResult.rows, ...sellResult.rows];
        const completedRows = rows.filter(isCompleted);
        const byOrder = new Map();
        completedRows.forEach((row) => {
          const normalized = normalizeOrder(row);
          if (normalized && !byOrder.has(normalized.sourceOrderId)) {
            byOrder.set(normalized.sourceOrderId, normalized);
          }
        });
        const statusCounts = {};
        rows.forEach((row) => {
          const status = String(row?.orderStatus ?? row?.status ?? "SIN_ESTADO").trim().toUpperCase().slice(0, 40) || "SIN_ESTADO";
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        return {
          start: new Date(window.startTimestamp).toISOString(),
          end: new Date(window.endTimestamp).toISOString(),
          buyRowsReturned: buyResult.rows.length,
          sellRowsReturned: sellResult.rows.length,
          buyReportedTotal: buyResult.total,
          sellReportedTotal: sellResult.total,
          rowsMarkedCompleted: completedRows.length,
          usableCompletedOrders: byOrder.size,
          statusCounts,
          moreBuyPages: buyResult.nextPage !== null,
          moreSellPages: sellResult.nextPage !== null,
        };
      }));

      const aggregateStatusCounts = {};
      windowResults.forEach((window) => Object.entries(window.statusCounts).forEach(([name, count]) => {
        aggregateStatusCounts[name] = (aggregateStatusCounts[name] || 0) + count;
      }));
      const diagnostics = {
        windows: windowResults,
        windowsScanned: windowResults.length,
        buyRowsReturned: windowResults.reduce((sum, window) => sum + window.buyRowsReturned, 0),
        sellRowsReturned: windowResults.reduce((sum, window) => sum + window.sellRowsReturned, 0),
        rowsMarkedCompleted: windowResults.reduce((sum, window) => sum + window.rowsMarkedCompleted, 0),
        usableCompletedOrders: windowResults.reduce((sum, window) => sum + window.usableCompletedOrders, 0),
        statusCounts: aggregateStatusCounts,
        morePages: windowResults.some((window) => window.moreBuyPages || window.moreSellPages),
      };
      console.info("JJXCAPITAL Binance historical probe summary:", JSON.stringify({
        windowsScanned: diagnostics.windowsScanned,
        buyRowsReturned: diagnostics.buyRowsReturned,
        sellRowsReturned: diagnostics.sellRowsReturned,
        rowsMarkedCompleted: diagnostics.rowsMarkedCompleted,
        usableCompletedOrders: diagnostics.usableCompletedOrders,
        statusCounts: diagnostics.statusCounts,
        morePages: diagnostics.morePages,
      }));

      const latest = await getDocument(integrationPath);
      if (!latest || latest.data?.syncLockId !== lockId) {
        throw new HttpError(409, "La conexión cambió durante la prueba. Vuelve a intentarlo.");
      }
      await commitWrites([createWrite(integrationPath, {
        lastSyncStatus: integration.data.lastSyncStatus || "success",
        lastSyncError: integration.data.lastSyncError || null,
        lastSyncAttemptAt: new Date(),
        syncLockId: null,
        syncLockExpiresAt: new Date(0),
      }, latest.updateTime ? { updateTime: latest.updateTime } : { exists: true })]);
      ownsLock = false;

      const rowsReturned = diagnostics.buyRowsReturned + diagnostics.sellRowsReturned;
      const message = rowsReturned
        ? "Prueba histórica completada: Binance devolvió " + rowsReturned + " filas de hace aproximadamente 6–12 meses. No se importó ni guardó ninguna operación."
        : "Prueba histórica completada: Binance no devolvió filas en el período revisado de hace aproximadamente 6–12 meses. No se importó ni guardó ninguna operación.";
      return sendJson(res, 200, {
        success: true,
        historyProbe: true,
        imported: 0,
        skipped: 0,
        completedOrdersFound: diagnostics.usableCompletedOrders,
        diagnostics,
        probeWindow: {
          start: new Date(oldestTimestamp).toISOString(),
          end: new Date(newestTimestamp).toISOString(),
        },
        hasMoreHistory: diagnostics.morePages,
        message,
      });
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
    const connectionFloor = connectedAt ? connectedAt.getTime() : null;

    if (backfill) {
      mode = "backfill";
      const savedBackfillStart = Number(state.backfillStartTimestamp);
      startTimestamp = connectionFloor !== null
        ? Math.max(Number.isFinite(savedBackfillStart) && savedBackfillStart > 0 ? savedBackfillStart : connectionFloor, connectionFloor)
        : (Number(state.backfillStartTimestamp) || (requestNow - 29 * DAY_MS));
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
      const defaultStart = connectionFloor !== null ? connectionFloor : requestNow - 29 * DAY_MS;
      startTimestamp = Math.max(
        connectionFloor !== null ? connectionFloor : 0,
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
    const statusCounts = {};
    sourceRows.forEach((row) => {
      const status = String(row?.orderStatus ?? row?.status ?? "SIN_ESTADO").trim().toUpperCase().slice(0, 40) || "SIN_ESTADO";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    const completedSourceRows = sourceRows.filter(isCompleted);

    const byOrder = new Map();
    completedSourceRows.forEach((row) => {
      const normalized = normalizeOrder(row);
      if (!normalized) return;
      if (!byOrder.has(normalized.sourceOrderId)) byOrder.set(normalized.sourceOrderId, normalized);
    });
    const candidates = [...byOrder.values()];
    const syncDiagnostics = {
      buyRowsReturned: buyResult.rows.length,
      sellRowsReturned: sellResult.rows.length,
      buyReportedTotal: buyResult.total,
      sellReportedTotal: sellResult.total,
      rowsMarkedCompleted: completedSourceRows.length,
      usableCompletedOrders: candidates.length,
      statusCounts,
    };
    console.info("JJXCAPITAL Binance P2P sync summary:", JSON.stringify(syncDiagnostics));
    const existingOrderIds = await findExistingOrderIds(claims.sub, candidates);
    const fresh = candidates.filter((item) => !existingOrderIds.has(item.order_id));
    const writes = fresh.map((operation) => ({
      update: {
        name: documentName(operationsPathFor(claims.sub) + "/" + deterministicId(operation.order_id)),
        fields: toFields(operation),
      },
      currentDocument: { exists: false },
    }));
    if (writes.length) await commitWrites(writes);

    const nextBuyPage = buyResult.nextPage;
    const nextSellPage = sellResult.nextPage;
    const bothDone = nextBuyPage === null && nextSellPage === null;
    const updated = {
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
      diagnostics: syncDiagnostics,
      hasMoreHistory: hasMore,
      initialBackfillComplete: backfill ? bothDone : state.initialBackfillComplete === true,
      lastSyncAt: updated.lastSyncAt || state.lastSyncAt || null,
      message: fresh.length
        ? "Sincronización completada: se han importado " + fresh.length + " operaciones nuevas."
        : "Sincronización completada: no había operaciones completadas nuevas para importar.",
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
