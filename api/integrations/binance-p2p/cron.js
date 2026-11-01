const crypto = require("crypto");
const {
  HttpError,
  sendJson,
  getDocument,
  listConnectedBinanceP2PIntegrations,
  commitWrites,
  createWrite,
  errorResponse,
} = require("../../../lib/payments");
const { verifyGitHubActionsOidcToken } = require("../../../lib/github-actions-oidc");
const syncBinanceP2P = require("./sync");

const SCHEDULER_STATE_PATH = "systemJobs/binanceP2PBackgroundSync";
const LOCK_MS = 4 * 60 * 1000;
const MAX_USERS_PER_REQUEST = 1;
const QUERY_LIMIT = 25;

async function releaseSchedulerLock(lockId, updates = {}) {
  try {
    const latest = await getDocument(SCHEDULER_STATE_PATH);
    if (!latest || latest.data?.schedulerLockId !== lockId) return;
    await commitWrites([createWrite(SCHEDULER_STATE_PATH, {
      ...updates,
      schedulerLockId: null,
      schedulerLockExpiresAt: new Date(0),
    }, latest.updateTime ? { updateTime: latest.updateTime } : { exists: true })]);
  } catch (error) {
    console.error("Binance P2P scheduler lock release failed:", error?.message || "unknown_error");
  }
}

module.exports = async function runBinanceP2PBackgroundSync(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Método no permitido." });
  }

  let lockId = "";
  let ownsLock = false;
  try {
    const authorization = String(req.headers?.authorization || req.headers?.Authorization || "");
    const tokenMatch = /^Bearer\s+(.+)$/i.exec(authorization);
    if (!tokenMatch) throw new HttpError(401, "Falta la identidad del programador.");

    await verifyGitHubActionsOidcToken(tokenMatch[1]);
    const state = await getDocument(SCHEDULER_STATE_PATH);
    const now = Date.now();
    const lockExpiresAt = state?.data?.schedulerLockExpiresAt
      ? new Date(state.data.schedulerLockExpiresAt).getTime()
      : 0;
    if (state?.data?.schedulerLockId && Number.isFinite(lockExpiresAt) && lockExpiresAt > now) {
      return sendJson(res, 200, {
        success: true,
        skipped: "another_run_is_active",
        processed: 0,
        hasMore: true,
      });
    }

    lockId = crypto.randomBytes(16).toString("hex");
    await commitWrites([createWrite(SCHEDULER_STATE_PATH, {
      schedulerLockId: lockId,
      schedulerLockExpiresAt: new Date(now + LOCK_MS),
    }, state?.updateTime ? { updateTime: state.updateTime } : { exists: false })]);
    ownsLock = true;

    let cursor = state?.data?.lastDocumentName || null;
    let page = await listConnectedBinanceP2PIntegrations({ startAfter: cursor, limit: QUERY_LIMIT });
    if (!page.length && cursor) {
      cursor = null;
      page = await listConnectedBinanceP2PIntegrations({ startAfter: null, limit: QUERY_LIMIT });
    }

    const eligible = page.filter((document) =>
      document.uid &&
      document.data?.connectionStatus === "connected" &&
      document.data?.encryptedCredentials
    );
    const selected = eligible.slice(0, MAX_USERS_PER_REQUEST);
    let hasMore = false;
    let nextCursor = null;

    if (selected.length) {
      const lastSelectedIndex = page.findIndex((document) =>
        document.name === selected[selected.length - 1].name
      );
      hasMore = lastSelectedIndex < page.length - 1 || page.length === QUERY_LIMIT;
      nextCursor = hasMore ? selected[selected.length - 1].name : null;
    } else {
      hasMore = page.length === QUERY_LIMIT;
      nextCursor = hasMore ? page[page.length - 1].name : null;
    }

    let succeeded = 0;
    let failed = 0;
    let imported = 0;
    for (const document of selected) {
      const outcome = await syncBinanceP2P.syncUser(document.uid);
      if (outcome.statusCode >= 200 && outcome.statusCode < 300 && outcome.body?.success) {
        succeeded += 1;
        imported += Number(outcome.body.imported) || 0;
      } else {
        failed += 1;
        console.error("Binance P2P scheduled sync failed for one connected account:",
          outcome.body?.error || "sync_failed");
      }
    }

    const latest = await getDocument(SCHEDULER_STATE_PATH);
    if (!latest || latest.data?.schedulerLockId !== lockId) {
      throw new HttpError(409, "La ejecución programada perdió su bloqueo de seguridad.");
    }
    await commitWrites([createWrite(SCHEDULER_STATE_PATH, {
      lastDocumentName: nextCursor,
      schedulerLastRunAt: new Date(),
      schedulerLastProcessedCount: selected.length,
      schedulerLastSuccessCount: succeeded,
      schedulerLastErrorCount: failed,
      schedulerLastImportedCount: imported,
      schedulerLastStatus: failed ? "partial" : "success",
      schedulerLockId: null,
      schedulerLockExpiresAt: new Date(0),
    }, latest.updateTime ? { updateTime: latest.updateTime } : { exists: true })]);
    ownsLock = false;

    return sendJson(res, 200, {
      success: failed === 0,
      processed: selected.length,
      succeeded,
      failed,
      imported,
      hasMore,
      message: selected.length
        ? "Sincronización programada completada."
        : "No hay cuentas Binance P2P conectadas pendientes de sincronización.",
    });
  } catch (error) {
    if (ownsLock && lockId) {
      await releaseSchedulerLock(lockId, {
        schedulerLastRunAt: new Date(),
        schedulerLastStatus: "error",
      });
    }
    if (error instanceof HttpError) return errorResponse(res, error);
    console.error("Binance P2P background scheduler failed:", error?.stack || error?.message || "unknown_error");
    return sendJson(res, 500, { error: "No se pudo completar la sincronización automática de Binance P2P." });
  }
};
