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

const integrationPathFor = (uid) => "users/" + uid + "/previewIntegrations/bybitP2P";

module.exports = async function disconnectBybitP2P(req, res) {
  if (process.env.VERCEL_ENV !== "preview") {
    return sendJson(res, 404, { error: "La conexión Preview de Bybit no está disponible en producción." });
  }
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
      message: "Bybit se ha desconectado en Preview. Las operaciones de prueba importadas se conservan.",
    });
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(res, error);
    console.error("Bybit P2P disconnect failed:", error?.message || "unknown_error");
    return sendJson(res, 500, { error: "No se pudo eliminar la conexión de Bybit." });
  }
};
