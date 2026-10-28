const {
  HttpError, sendJson, requirePost, requireFirebaseUser, getDocument,
  hasDocumentsMatchingField, commitWrites, createWrite, documentName, errorResponse,
} = require("../../lib/payments");

module.exports = async function deleteSession(req, res) {
  if (!requirePost(req, res)) return;
  try {
    const claims = await requireFirebaseUser(req);
    const sessionId = String(req.body?.sessionId || "").trim();
    if (!/^[a-f0-9]{32}$/i.test(sessionId)) throw new HttpError(400, "La sesión no es válida.");

    const userPath = "users/" + claims.sub;
    const sessionPath = userPath + "/sessions/" + sessionId;
    const session = await getDocument(sessionPath);
    if (!session) throw new HttpError(404, "No se encontró el arbitraje.");

    if (await hasDocumentsMatchingField(userPath + "/operations", "sessionId", sessionId)) {
      throw new HttpError(409, "Este arbitraje ya tiene operaciones y no se puede eliminar.");
    }

    const writes = [{
      delete: documentName(sessionPath),
      currentDocument: session.updateTime ? { updateTime: session.updateTime } : { exists: true },
    }];
    const fiat = String(session.data?.fiat || "").toUpperCase();
    const crypto = String(session.data?.crypto || "").toUpperCase();
    if (fiat && crypto) {
      const pairPath = userPath + "/sessionPairs/" + fiat + "_" + crypto;
      const pairIndex = await getDocument(pairPath);
      if (pairIndex?.data?.activeSessionId === sessionId) {
        writes.push(createWrite(pairPath, { activeSessionId: null, fiat, crypto },
          pairIndex.updateTime ? { updateTime: pairIndex.updateTime } : { exists: true }));
      }
    }
    await commitWrites(writes);
    return sendJson(res, 200, { success: true, deletedSessionId: sessionId });
  } catch (error) {
    return errorResponse(res, error);
  }
};
