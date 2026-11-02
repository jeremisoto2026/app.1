const {
  HttpError,
  sendJson,
  requirePost,
  requireFirebaseUser,
  getDocument,
  commitWrites,
  createWrite,
  errorResponse,
} = require("../../../lib/payments");
const { encryptCredentials, verifyCredentials } = require("../../../lib/bybit-p2p");

const integrationPathFor = (uid) => "users/" + uid + "/previewIntegrations/bybitP2P";
const guardPathFor = (uid) => "users/" + uid + "/previewIntegrations/bybitP2PConnectGuard";

module.exports = async function connectBybitP2P(req, res) {
  if (process.env.VERCEL_ENV !== "preview") {
    return sendJson(res, 404, { error: "La conexión Preview de Bybit no está disponible en producción." });
  }
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
    const lastAttempt = guard?.data?.lastAttemptAt
      ? new Date(guard.data.lastAttemptAt).getTime()
      : 0;
    if (Number.isFinite(lastAttempt) && lastAttempt > 0 && Date.now() - lastAttempt < 5000) {
      throw new HttpError(429, "Espera unos segundos antes de volver a verificar las credenciales.");
    }
    await commitWrites([createWrite(guardPath, { lastAttemptAt: new Date() }, guard?.updateTime
      ? { updateTime: guard.updateTime }
      : { exists: false })]);

    // A successful read-only P2P history request validates the key and its P2P permission.
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
      backfillStartTimestamp: now.getTime(),
      backfillEndTimestamp: now.getTime(),
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
      message: "Bybit está conectado en modo de solo lectura. Esta Preview importará operaciones completadas en un historial de pruebas separado.",
    });
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(res, error);
    console.error("Bybit P2P connect failed:", error?.message || "unknown_error");
    return sendJson(res, 500, { error: "No se pudo guardar la conexión de Bybit de forma segura." });
  }
};
