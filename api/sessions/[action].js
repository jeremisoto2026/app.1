const { sendJson } = require("../../lib/payments");
const sessionActions = require("../../lib/sessions");

module.exports = function sessionsEndpoint(req, res) {
  const action = String(req.query?.action || "");
  if (action === "delete-account") {
    return require("../../lib/account-delete-endpoint")(req, res);
  }
  const handler = sessionActions[action];
  if (!handler) return sendJson(res, 404, { error: "La acción de sesión no existe." });
  return handler(req, res);
};
