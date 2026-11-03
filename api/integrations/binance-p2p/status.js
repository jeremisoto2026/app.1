const {
  sendJson,
  requireFirebaseUser,
  getDocument,
  errorResponse,
} = require("../../../lib/payments");

const INTEGRATION_PATH = (uid) => "users/" + uid + "/privateIntegrations/binanceP2P";

module.exports = async function binanceP2PStatus(req, res) {
  // Bybit is routed through this existing function to respect Vercel Hobby's 12-function cap.
  // Requests without provider=bybit keep the original Binance code path untouched.
  try {
    const requestUrl = new URL(String(req.url || "/"), "https://jjxcapital.internal");
    if (requestUrl.searchParams.get("provider") === "bybit") {
      return require("../../../lib/bybit-p2p-api").status(req, res);
    }
  } catch (routeError) {
    return sendJson(res, 400, { error: "La solicitud de integración no es válida." });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Método no permitido." });
  }
  try {
    const claims = await requireFirebaseUser(req);
    const document = await getDocument(INTEGRATION_PATH(claims.sub));
    const data = document?.data || {};
    const encryptionConfigured = /^[0-9a-f]{64}$/i.test(String(process.env.BINANCE_P2P_ENCRYPTION_KEY || "").trim());
    return sendJson(res, 200, {
      connected: Boolean(data.encryptedCredentials && data.connectionStatus === "connected"),
      encryptionConfigured,
      apiKeyHint: data.apiKeyHint || null,
      connectedAt: data.connectedAt || null,
      lastSyncAt: data.lastSyncAt || null,
      lastImportedCount: Number(data.lastImportedCount) || 0,
      lastSyncStatus: data.lastSyncStatus || null,
      lastSyncErrorCode: data.lastSyncError || null,
      orderQuotaBlocked: data.orderQuotaBlocked === true,
      hasMoreHistory: data.initialBackfillComplete !== true ||
        Boolean(data.pendingWindowStart && (data.pendingNextBuyPage || data.pendingNextSellPage)),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};
