const {
  HttpError, sendJson, requirePost, requireFirebaseUser, getDocument,
  listAllDocuments, commitWrites, createWrite, errorResponse,
} = require("../../lib/payments");

module.exports = async function updateSessionStatus(req, res) {
  if (!requirePost(req, res)) return;
  try {
    const claims = await requireFirebaseUser(req);
    const sessionId = String(req.body?.sessionId || "").trim();
    const status = String(req.body?.status || "");
    if (!/^[a-f0-9]{32}$/i.test(sessionId) || !["active", "closed"].includes(status)) {
      throw new HttpError(400, "La sesión o el estado no son válidos.");
    }

    const userPath = "users/" + claims.sub;
    const sessionPath = userPath + "/sessions/" + sessionId;
    const pairPath = userPath + "/sessionPairs/";
    const [target, sessions] = await Promise.all([
      getDocument(sessionPath),
      status === "active" ? listAllDocuments(userPath + "/sessions", 100, 10) : Promise.resolve([]),
    ]);
    if (!target) throw new HttpError(404, "No se encontró el arbitraje.");
    const current = target.data || {};
    const fiat = String(current.fiat || "").toUpperCase();
    const crypto = String(current.crypto || "").toUpperCase();
    if (!fiat || !crypto) throw new HttpError(409, "El arbitraje no tiene un par de monedas válido.");
    const pairIndexPath = pairPath + fiat + "_" + crypto;
    const pairIndex = await getDocument(pairIndexPath);

    if (status === "active") {
      const duplicate = sessions.find((item) => item.id !== sessionId &&
        item.data?.status === "active" &&
        String(item.data?.fiat || "").trim().toUpperCase() === fiat &&
        String(item.data?.crypto || "").trim().toUpperCase() === crypto);
      if (duplicate) {
        throw new HttpError(409, "Ya tienes un arbitraje activo para " + current.fiat + " / " + current.crypto + ". Abre la sesión " + (duplicate.data?.name || "existente") + " o termínala antes de reabrir esta.");
      }
      if (pairIndex?.data?.activeSessionId && pairIndex.data.activeSessionId !== sessionId) {
        throw new HttpError(409, "Ya existe otra sesión activa para " + fiat + " / " + crypto + ". Termínala antes de reabrir esta.");
      }
    }

    const updatedAt = new Date();
    const writes = [createWrite(sessionPath, {
        status,
        closedAt: status === "closed" ? updatedAt : null,
      }, target.updateTime ? { updateTime: target.updateTime } : { exists: true })];
    if (status === "active" || !pairIndex?.data?.activeSessionId || pairIndex.data.activeSessionId === sessionId) {
      writes.push(createWrite(pairIndexPath, {
        activeSessionId: status === "active" ? sessionId : null,
        fiat,
        crypto,
      }, pairIndex?.updateTime ? { updateTime: pairIndex.updateTime } : { exists: false }));
    }
    await commitWrites(writes);

    return sendJson(res, 200, { success: true, session: { id: sessionId, status, closedAt: status === "closed" ? updatedAt.toISOString() : null } });
  } catch (error) {
    return errorResponse(res, error);
  }
};
