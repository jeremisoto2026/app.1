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

function unavailableError() {
  const error = new Error("FIREBASE_SESSION_STATUS_UNAVAILABLE");
  error.code = "FIREBASE_SESSION_STATUS_UNAVAILABLE";
  return error;
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
  if (!apiKey || typeof fetchImpl !== "function") throw unavailableError();

  let response;
  try {
    response = await fetchImpl(AUTH_LOOKUP_ENDPOINT + "?key=" + encodeURIComponent(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
  } catch {
    throw unavailableError();
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw unavailableError();
  }

  if (!response.ok) {
    const authCode = String(payload?.error?.message || "").toUpperCase();
    if (["INVALID_ID_TOKEN", "TOKEN_EXPIRED", "USER_DISABLED", "USER_NOT_FOUND"].some((code) => authCode.includes(code))) {
      return { valid: false, reason: "invalid-account-session" };
    }
    throw unavailableError();
  }

  if (!Array.isArray(payload?.users)) throw unavailableError();
  const user = payload.users.find((entry) => entry?.localId === uid);
  if (!user) return { valid: false, reason: "account-not-found" };
  if (typeof user.disabled !== "boolean" || user.validSince === undefined || user.validSince === null) {
    throw unavailableError();
  }
  if (user.disabled) return { valid: false, reason: "account-disabled" };

  const validSince = Number(user.validSince);
  if (!Number.isFinite(validSince) || validSince < 0) throw unavailableError();
  if (authTime < validSince) return { valid: false, reason: "token-revoked" };

  return { valid: true, reason: null };
}

module.exports = {
  getFirebaseWebApiKey,
  inspectFirebaseSessionStatus,
};
