const {
  HttpError,
  sendJson,
  requireFirebaseUser,
  listDocuments,
  errorResponse,
} = require("../../lib/payments");

module.exports = async function listPaymentHistory(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Método no permitido." });
  }

  try {
    const claims = await requireFirebaseUser(req);
    const documents = await listDocuments("users/" + claims.sub + "/payments", 50);
    const payments = documents.map((document) => ({
      ...document.data,
      id: document.id,
    })).sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
    return sendJson(res, 200, { payments });
  } catch (error) {
    return errorResponse(res, error);
  }
};
