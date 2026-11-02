const {
  sendJson,
  requireFirebaseUser,
  getDocument,
  errorResponse,
} = require("../../../lib/payments");

const integrationPathFor = (uid) => "users/" + uid + "/previewIntegrations/bybitP2P";

module.exports = async function bybitP2PStatus(req, res) {
  if (process.env.VERCEL_ENV !== "preview") {
    return sendJson(res, 404, { error: "La conexión Preview de Bybit no está disponible en producción." });
  }
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
    return sendJson(res, 200, {
      connected: Boolean(data.encryptedCredentials && data.connectionStatus === "connected"),
      encryptionConfigured,
      previewMode: true,
      apiKeyHint: data.apiKeyHint || null,
      connectedAt: data.connectedAt || null,
      lastSyncAt: data.lastSyncAt || null,
      lastImportedCount: Number(data.lastImportedCount) || 0,
      lastSyncStatus: data.lastSyncStatus || null,
      lastSyncErrorCode: data.lastSyncError || null,
      hasMoreHistory: data.initialBackfillComplete !== true ||
        Boolean(data.pendingWindowStart && data.pendingNextPage),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};
