const { sendJson } = require("../../lib/payments");
const sessionActions = require("../../lib/sessions");

module.exports = function sessionsEndpoint(req, res) {
  const action = String(req.query?.action || "");
  const handler = Object.prototype.hasOwnProperty.call(sessionActions, action) ? sessionActions[action] : null;
  if (!handler) return sendJson(res, 404, { error: "La acción de sesión no existe." });
  return handler(req, res);
};
