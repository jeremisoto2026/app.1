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
const {
  encryptCredentials,
  verifyCredentials,
} = require("../../../lib/binance-p2p");

const INTEGRATION_PATH = (uid) => "users/" + uid + "/privateIntegrations/binanceP2P";

module.exports = async function connectBinanceP2P(req, res) {
  if (!requirePost(req, res)) return;
  try {
    const claims = await requireFirebaseUser(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const credentials = {
      apiKey: String(body.apiKey || "").trim(),
      apiSecret: String(body.apiSecret || "").trim(),
    };

    // Validate server-side encryption configuration before making an external request.
    const encryptedCredentials = encryptCredentials(credentials);
    const guardPath = "users/" + claims.sub + "/privateIntegrations/binanceP2PConnectGuard";
    const guard = await getDocument(guardPath);
    const lastAttempt = guard?.data?.lastAttemptAt ? new Date(guard.data.lastAttemptAt).getTime() : 0;
    if (Number.isFinite(lastAttempt) && lastAttempt > 0 && Date.now() - lastAttempt < 5000) {
      throw new HttpError(429, "Espera unos segundos antes de volver a verificar las credenciales.");
    }
    await commitWrites([createWrite(guardPath, { lastAttemptAt: new Date() }, guard?.updateTime
      ? { updateTime: guard.updateTime }
      : { exists: false })]);
    await verifyCredentials(credentials);

    const path = INTEGRATION_PATH(claims.sub);
    const existing = await getDocument(path);
    const now = new Date();
    const isNewConnection = !existing?.data?.encryptedCredentials;
    const firstBackfillStart = now.getTime() - 29 * 24 * 60 * 60 * 1000;
    const firstBackfillEnd = now.getTime();
    const fields = {
      encryptedCredentials,
      connectionStatus: "connected",
      apiKeyHint: credentials.apiKey.slice(-4),
      connectedAt: existing?.data?.connectedAt || now,
      lastVerifiedAt: now,
      ...(isNewConnection ? {
        initialBackfillComplete: false,
        backfillStartTimestamp: firstBackfillStart,
        backfillEndTimestamp: firstBackfillEnd,
        nextBuyPage: 1,
        nextSellPage: 1,
        lastImportedCount: 0,
      } : {}),
    };
    await commitWrites([createWrite(path, fields, existing?.updateTime
      ? { updateTime: existing.updateTime }
      : { exists: false })]);

    return sendJson(res, 200, {
      connected: true,
      apiKeyHint: credentials.apiKey.slice(-4),
      message: "La conexión de solo lectura con Binance se ha verificado correctamente.",
    });
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(res, error);
    console.error("Binance P2P connect failed:", error?.message || "unknown_error");
    return sendJson(res, 500, { error: "No se pudo guardar la conexión de Binance de forma segura." });
  }
};
