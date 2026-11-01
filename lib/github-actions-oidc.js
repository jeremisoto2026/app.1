const crypto = require("crypto");
const { HttpError } = require("./payments");

const ISSUER = "https://token.actions.githubusercontent.com";
const JWKS_URL = ISSUER + "/.well-known/jwks";
const EXPECTED_AUDIENCE = "jjxcapital-binance-p2p-sync";
const EXPECTED_REPOSITORY = "jeremisoto2026/app.1";
const EXPECTED_REPOSITORY_ID = "1058212998";
const EXPECTED_OWNER_ID = "232186349";
const EXPECTED_WORKFLOW_REF =
  "jeremisoto2026/app.1/.github/workflows/binance-p2p-background-sync.yml@refs/heads/main";

let cachedKeys = null;
let cachedKeysExpiresAt = 0;

function decodeJsonPart(part) {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    throw new HttpError(401, "El token de GitHub Actions no es válido.");
  }
}

async function getSigningKeys(forceRefresh = false) {
  if (!forceRefresh && cachedKeys && Date.now() < cachedKeysExpiresAt) return cachedKeys;
  let response;
  try {
    response = await fetch(JWKS_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      ...(typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
        ? { signal: AbortSignal.timeout(8000) }
        : {}),
    });
  } catch {
    throw new HttpError(503, "No se pudo verificar la identidad de GitHub Actions.");
  }
  if (!response.ok) {
    throw new HttpError(503, "GitHub no pudo validar la identidad del programador.");
  }
  const payload = await response.json().catch(() => null);
  if (!payload || !Array.isArray(payload.keys)) {
    throw new HttpError(503, "GitHub devolvió claves de identidad no válidas.");
  }
  cachedKeys = payload.keys;
  cachedKeysExpiresAt = Date.now() + 60 * 60 * 1000;
  return cachedKeys;
}

async function verifyGitHubActionsOidcToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new HttpError(401, "Falta el token de identidad de GitHub Actions.");
  }

  const header = decodeJsonPart(parts[0]);
  const claims = decodeJsonPart(parts[1]);
  if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid) {
    throw new HttpError(401, "El método de firma del token de GitHub no es válido.");
  }

  const now = Math.floor(Date.now() / 1000);
  const audienceMatches = claims.aud === EXPECTED_AUDIENCE ||
    (Array.isArray(claims.aud) && claims.aud.includes(EXPECTED_AUDIENCE));
  if (claims.iss !== ISSUER || !audienceMatches ||
      !Number.isFinite(claims.exp) || claims.exp <= now ||
      !Number.isFinite(claims.iat) || claims.iat > now + 60 ||
      (Number.isFinite(claims.nbf) && claims.nbf > now + 60)) {
    throw new HttpError(401, "El token de identidad de GitHub ha caducado o no corresponde a este servicio.");
  }

  const trustedWorkflow =
    claims.repository === EXPECTED_REPOSITORY &&
    String(claims.repository_id) === EXPECTED_REPOSITORY_ID &&
    String(claims.repository_owner_id) === EXPECTED_OWNER_ID &&
    claims.ref === "refs/heads/main" &&
    claims.workflow_ref === EXPECTED_WORKFLOW_REF &&
    (claims.event_name === "schedule" || claims.event_name === "workflow_dispatch");

  if (!trustedWorkflow) {
    throw new HttpError(403, "Este flujo de GitHub Actions no está autorizado para sincronizar Binance.");
  }

  let keys = await getSigningKeys();
  let jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) {
    keys = await getSigningKeys(true);
    jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA");
  }
  if (!jwk) throw new HttpError(401, "No se reconoce la clave de firma del token de GitHub.");

  let signatureIsValid = false;
  try {
    const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
    signatureIsValid = crypto.verify(
      "RSA-SHA256",
      Buffer.from(parts[0] + "." + parts[1]),
      publicKey,
      Buffer.from(parts[2], "base64url")
    );
  } catch {
    signatureIsValid = false;
  }
  if (!signatureIsValid) {
    throw new HttpError(401, "La firma del token de GitHub no es válida.");
  }

  return claims;
}

module.exports = { verifyGitHubActionsOidcToken };
