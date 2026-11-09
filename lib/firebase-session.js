const { isPreviewFirebaseEnvironment } = require("./firebase-environment");

// This public Web API key is the same fallback used by the browser Firebase config.
// It is not a secret; Preview never falls back to this Production key.
const PRODUCTION_FIREBASE_WEB_API_KEY = "AIzaSyBMHC2YuUO3mwHQORDDGZaQ84-k4tmJGjY";
const AUTH_LOOKUP_ENDPOINT = "https://identitytoolkit.googleapis.com/v1/accounts:lookup";

function getFirebaseWebApiKey(env = process.env) {
  if (isPreviewFirebaseEnvironment(env)) {
    return String(
      env.FIREBASE_PREVIEW_API_KEY ||
      env.REACT_APP_FIREBASE_PREVIEW_API_KEY ||
      ""
    ).trim();
  }

  return String(
    env.FIREBASE_API_KEY ||
    env.REACT_APP_FIREBASE_API_KEY ||
    PRODUCTION_FIREBASE_WEB_API_KEY
  ).trim();
}

function unavailableError(diagnosticCode = "UNCLASSIFIED") {
  const error = new Error("FIREBASE_SESSION_STATUS_UNAVAILABLE");
  error.code = "FIREBASE_SESSION_STATUS_UNAVAILABLE";
  error.diagnosticCode = String(diagnosticCode || "UNCLASSIFIED")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .slice(0, 80);
  return error;
}

function getFirebaseAuthErrorCode(payload) {
  const message = String(payload?.error?.message || "").toUpperCase();
  const candidates = message.match(/[A-Z][A-Z0-9_]{2,48}/g) || [];
  const knownCodes = new Set([
    "API_KEY_INVALID",
    "API_KEY_SERVICE_BLOCKED",
    "API_KEY_HTTP_REFERRER_BLOCKED",
    "API_KEY_IP_ADDRESS_BLOCKED",
    "API_KEY_ANDROID_APP_BLOCKED",
    "API_KEY_IOS_APP_BLOCKED",
    "SERVICE_DISABLED",
    "PERMISSION_DENIED",
    "BILLING_NOT_ENABLED",
    "PROJECT_DELETED",
    "QUOTA_EXCEEDED",
    "RESOURCE_EXHAUSTED",
    "INVALID_ARGUMENT",
    "UNAUTHENTICATED",
    "OPERATION_NOT_ALLOWED",
    "INVALID_ID_TOKEN",
    "TOKEN_EXPIRED",
    "USER_DISABLED",
    "USER_NOT_FOUND",
  ]);
  return candidates.find((candidate) => knownCodes.has(candidate)) ||
    String(payload?.error?.status || "UNCLASSIFIED")
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_")
      .slice(0, 48);
}

/**
 * Checks the current Firebase account record after the ID token's signature
 * has already been validated. No cache is used so a newly disabled account or
 * revoked refresh-token family takes effect on the next protected API request.
 */
async function inspectFirebaseSessionStatus({
  idToken,
  uid,
  authTime,
  env = process.env,
  fetchImpl = global.fetch,
} = {}) {
  if (!idToken || typeof uid !== "string" || !uid || !Number.isFinite(authTime)) {
    return { valid: false, reason: "invalid-token" };
  }

  const apiKey = getFirebaseWebApiKey(env);
  if (!apiKey || typeof fetchImpl !== "function") {
    throw unavailableError(!apiKey ? "API_KEY_MISSING" : "FETCH_UNAVAILABLE");
  }

  let response;
  try {
    response = await fetchImpl(AUTH_LOOKUP_ENDPOINT + "?key=" + encodeURIComponent(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
  } catch (error) {
    const networkCode = error?.cause?.code || error?.name || "UNKNOWN";
    throw unavailableError("NETWORK_" + String(networkCode)
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_")
      .slice(0, 48));
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw unavailableError("INVALID_JSON_HTTP_" + (Number(response.status) || 0));
  }

  if (!response.ok) {
    const authCode = String(payload?.error?.message || "").toUpperCase();
    if (["INVALID_ID_TOKEN", "TOKEN_EXPIRED", "USER_DISABLED", "USER_NOT_FOUND"].some((code) => authCode.includes(code))) {
      return { valid: false, reason: "invalid-account-session" };
    }
    throw unavailableError("HTTP_" + response.status + "_" + getFirebaseAuthErrorCode(payload));
  }

  if (!Array.isArray(payload?.users)) throw unavailableError("UNEXPECTED_RESPONSE_SHAPE");
  const user = payload.users.find((entry) => entry?.localId === uid);
  if (!user) return { valid: false, reason: "account-not-found" };
  // Identity Toolkit omits protobuf default values in JSON responses:
  // disabled=false and validSince=0 may therefore be absent for an active account.
  // Treat only those omitted defaults as their documented zero values, while
  // rejecting explicitly malformed fields.
  if (user.disabled !== undefined && typeof user.disabled !== "boolean") {
    throw unavailableError("ACCOUNT_DISABLED_FIELD_INVALID");
  }
  if (user.disabled === true) return { valid: false, reason: "account-disabled" };

  if (user.validSince === null) throw unavailableError("VALID_SINCE_INVALID");
  const validSince = user.validSince === undefined ? 0 : Number(user.validSince);
  if (!Number.isFinite(validSince) || validSince < 0) {
    throw unavailableError("VALID_SINCE_INVALID");
  }
  if (authTime < validSince) return { valid: false, reason: "token-revoked" };

  return { valid: true, reason: null };
}

async function deleteFirebaseAuthAccount({
  idToken,
  env = process.env,
  fetchImpl = global.fetch,
} = {}) {
  if (!idToken || typeof fetchImpl !== "function") throw unavailableError();
  const apiKey = getFirebaseWebApiKey(env);
  if (!apiKey) throw unavailableError();

  let response;
  try {
    response = await fetchImpl(
      "https://identitytoolkit.googleapis.com/v1/accounts:delete?key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
  } catch {
    throw unavailableError();
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    throw unavailableError();
  }

  if (response.ok) return { deleted: true, alreadyDeleted: false };

  const code = String(payload?.error?.message || "UNKNOWN_AUTH_ERROR").toUpperCase();
  if (code.includes("USER_NOT_FOUND")) {
    return { deleted: true, alreadyDeleted: true };
  }

  const error = new Error(
    code.includes("CREDENTIAL_TOO_OLD_LOGIN_AGAIN")
      ? "Vuelve a confirmar tu identidad antes de eliminar la cuenta."
      : code.includes("INVALID_ID_TOKEN")
        ? "La sesión ya no es válida. Inicia sesión de nuevo."
        : "Firebase no pudo completar la eliminación de la cuenta. Inténtalo de nuevo."
  );
  error.code = code;
  error.statusCode = code.includes("CREDENTIAL_TOO_OLD_LOGIN_AGAIN") ||
      code.includes("INVALID_ID_TOKEN") || code.includes("USER_DISABLED")
    ? 401
    : 503;
  throw error;
}

module.exports = {
  getFirebaseWebApiKey,
  inspectFirebaseSessionStatus,
  deleteFirebaseAuthAccount,
};
