const {
  HttpError,
  sendJson,
  requirePost,
  requireFirebaseUser,
  getDocument,
  commitWrites,
  documentName,
  errorResponse,
} = require("../../../lib/payments");

const INTEGRATION_PATH = (uid) => "users/" + uid + "/privateIntegrations/binanceP2P";

module.exports = async function disconnectBinanceP2P(req, res) {
  if (!requirePost(req, res)) return;
  try {
    const claims = await requireFirebaseUser(req);
    const path = INTEGRATION_PATH(claims.sub);
    const existing = await getDocument(path);
    if (existing) {
      await commitWrites([{
        delete: documentName(path),
        currentDocument: existing.updateTime ? { updateTime: existing.updateTime } : { exists: true },
      }]);
    }
    return sendJson(res, 200, { connected: false, message: "La conexión de Binance se ha eliminado." });
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(res, error);
    console.error("Binance P2P disconnect failed:", error?.message || "unknown_error");
    return sendJson(res, 500, { error: "No se pudo eliminar la conexión de Binance." });
  }
};
