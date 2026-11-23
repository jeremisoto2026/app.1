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
  // Bybit is routed through this existing function to respect Vercel Hobby's 12-function cap.
  // Requests without provider=bybit keep the original Binance code path untouched.
  try {
    const requestUrl = new URL(String(req.url || "/"), "https://jjxcapital.internal");
    if (requestUrl.searchParams.get("provider") === "bybit") {
      return require("../../../lib/bybit-p2p-api").disconnect(req, res);
    }
  } catch (routeError) {
    return sendJson(res, 400, { error: "La solicitud de integración no es válida." });
  }

  if (!requirePost(req, res)) return;
  try {
    const claims = await requireFirebaseUser(req);
    const path = INTEGRATION_PATH(claims.sub);
    const existing = await getDocument(path);
    if (existing?.data?.syncLockId) {
      const lockExpiry = existing.data.syncLockExpiresAt
        ? new Date(existing.data.syncLockExpiresAt).getTime()
        : 0;
      if (Number.isFinite(lockExpiry) && lockExpiry > Date.now()) {
        throw new HttpError(409, "Hay una sincronización de Binance en curso. Espera a que termine antes de desconectar.");
      }
    }
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
