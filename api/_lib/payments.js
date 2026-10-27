const crypto = require("crypto");

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.REACT_APP_FIREBASE_PROJECT_ID || "jjxcapital-2";
const PRICE_USD = 15;
const PRICE_USDT = 15;
const PAYMENT_DURATION_MS = 30 * 60 * 1000;
const SUBSCRIPTION_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const RECEIVER_ADDRESS = String(
  process.env.BLOCKCHAIN_RECEIVER_ADDRESS || "0x4c64b783f1babc0a2fe62f174873f415393c2269"
).trim();
const BSC_RPC_URL = process.env.BSC_RPC_URL || "https://bsc-dataseed.bnbchain.org";
const BSC_USDT_CONTRACT = String(
  process.env.BSC_USDT_CONTRACT || "0x55d398326f99059fF775485246999027B3197955"
).trim().toLowerCase();
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const USDT_DECIMALS = 18;
const REQUIRED_BSC_CONFIRMATIONS = 12;

let cachedGoogleAccessToken = null;
let cachedGoogleAccessTokenExpiresAt = 0;
let cachedFirebaseKeys = null;
let cachedFirebaseKeysExpiresAt = 0;

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function sendJson(res, statusCode, payload) {
  res.status(statusCode).setHeader("Cache-Control", "no-store");
  return res.json(payload);
}

function sendMethodNotAllowed(res, allowed = "POST") {
  res.setHeader("Allow", allowed);
  return sendJson(res, 405, { error: "Método no permitido." });
}

function requirePost(req, res) {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res);
    return false;
  }
  return true;
}

function getBearerToken(req) {
  const value = req.headers?.authorization || req.headers?.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(value));
  return match ? match[1].trim() : "";
}

function decodeBase64Url(value) {
  return Buffer.from(String(value).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

async function getFirebaseSigningKeys() {
  if (cachedFirebaseKeys && Date.now() < cachedFirebaseKeysExpiresAt) return cachedFirebaseKeys;

  const response = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
  if (!response.ok) throw new HttpError(503, "No se pudo verificar la sesión de Firebase. Inténtalo de nuevo.");
  const jwks = await response.json();
  cachedFirebaseKeys = new Map((jwks.keys || []).map((key) => [key.kid, key]));
  cachedFirebaseKeysExpiresAt = Date.now() + 60 * 60 * 1000;
  return cachedFirebaseKeys;
}

async function requireFirebaseUser(req) {
  const token = getBearerToken(req);
  if (!token) throw new HttpError(401, "Inicia sesión para continuar.");
  const parts = token.split(".");
  if (parts.length !== 3) throw new HttpError(401, "La sesión no es válida. Vuelve a iniciar sesión.");

  let header;
  let claims;
  try {
    header = JSON.parse(decodeBase64Url(parts[0]).toString("utf8"));
    claims = JSON.parse(decodeBase64Url(parts[1]).toString("utf8"));
  } catch {
    throw new HttpError(401, "La sesión no es válida. Vuelve a iniciar sesión.");
  }

  if (header.alg !== "RS256" || !header.kid || claims.aud !== PROJECT_ID ||
      claims.iss !== "https://securetoken.google.com/" + PROJECT_ID ||
      !claims.sub || typeof claims.sub !== "string" ||
      !Number.isFinite(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000) ||
      !Number.isFinite(claims.iat) || claims.iat > Math.floor(Date.now() / 1000) + 60) {
    throw new HttpError(401, "La sesión ha caducado o no pertenece a esta aplicación.");
  }

  const keys = await getFirebaseSigningKeys();
  const jwk = keys.get(header.kid);
  if (!jwk) {
    cachedFirebaseKeys = null;
    cachedFirebaseKeysExpiresAt = 0;
    const refreshedKeys = await getFirebaseSigningKeys();
    const refreshedJwk = refreshedKeys.get(header.kid);
    if (!refreshedJwk) throw new HttpError(401, "No se pudo validar la sesión.");
    const publicKey = crypto.createPublicKey({ key: refreshedJwk, format: "jwk" });
    if (!crypto.verify("RSA-SHA256", Buffer.from(parts[0] + "." + parts[1]), publicKey, decodeBase64Url(parts[2]))) {
      throw new HttpError(401, "La sesión no es válida.");
    }
    return claims;
  }

  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  if (!crypto.verify("RSA-SHA256", Buffer.from(parts[0] + "." + parts[1]), publicKey, decodeBase64Url(parts[2]))) {
    throw new HttpError(401, "La sesión no es válida.");
  }
  return claims;
}

function getServiceAccount() {
  let account = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch {
      throw new HttpError(503, "La configuración segura de Firebase no es válida.");
    }
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    account = {
      project_id: process.env.FIREBASE_PROJECT_ID || PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
    };
  }

  if (!account?.client_email || !account?.private_key) {
    throw new HttpError(
      503,
      "Los pagos todavía no están activados: falta configurar la cuenta de servicio de Firebase en Vercel."
    );
  }

  const projectId = account.project_id || PROJECT_ID;
  if (projectId !== PROJECT_ID) throw new HttpError(503, "El proyecto de la cuenta de servicio no coincide con Firebase.");
  return {
    projectId,
    clientEmail: account.client_email,
    privateKey: String(account.private_key).replace(/\\n/g, "\n"),
  };
}

function base64UrlEncode(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getGoogleAccessToken() {
  if (cachedGoogleAccessToken && Date.now() < cachedGoogleAccessTokenExpiresAt - 60_000) {
    return cachedGoogleAccessToken;
  }

  const account = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const jwtClaims = base64UrlEncode(JSON.stringify({
    iss: account.clientEmail,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsignedJwt = jwtHeader + "." + jwtClaims;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsignedJwt), account.privateKey);
  const assertion = unsignedJwt + "." + base64UrlEncode(signature);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    console.error("Firebase service-account token exchange failed:", response.status, data.error || "unknown_error");
    throw new HttpError(503, "Firebase no está preparado para registrar pagos. Revisa las variables seguras de Vercel.");
  }

  cachedGoogleAccessToken = data.access_token;
  cachedGoogleAccessTokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedGoogleAccessToken;
}

function encodeDocumentPath(path) {
  return String(path).split("/").map(encodeURIComponent).join("/");
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Invalid Firestore number");
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object") {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, toFirestoreValue(entry)])) } };
  }
  return { stringValue: String(value) };
}

function fromFirestoreValue(value = {}) {
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("mapValue" in value) return fromFirestoreFields(value.mapValue.fields || {});
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ("referenceValue" in value) return value.referenceValue;
  return null;
}

function fromFirestoreFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]));
}

async function firestoreRequest(path, options = {}) {
  const token = await getGoogleAccessToken();
  const base = "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(PROJECT_ID) +
    "/databases/(default)/documents";
  const url = base + (path ? "/" + encodeDocumentPath(path) : "");
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404) return { notFound: true, data: null };
    console.error("Firestore REST request failed:", response.status, data.error?.status || data.error?.message || "unknown_error");
    throw new HttpError(503, "No se pudo guardar o consultar el pago de forma segura.");
  }
  return { data };
}

async function getDocument(path) {
  const response = await firestoreRequest(path, { method: "GET" });
  if (response.notFound) return null;
  const document = response.data;
  return {
    name: document.name,
    updateTime: document.updateTime,
    createTime: document.createTime,
    data: fromFirestoreFields(document.fields || {}),
  };
}

async function createDocument(path, data) {
  const response = await firestoreRequest(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)])),
    }),
  });
  return response.data;
}

function documentName(path) {
  return "projects/" + PROJECT_ID + "/databases/(default)/documents/" + path.split("/").map(encodeURIComponent).join("/");
}

async function commitWrites(writes) {
  const token = await getGoogleAccessToken();
  const url = "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(PROJECT_ID) + "/databases/(default)/documents:commit";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ writes }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 409 || response.status === 400) {
      throw new HttpError(409, "El pago se está procesando o ya se ha registrado. Actualiza el historial antes de intentarlo de nuevo.");
    }
    console.error("Firestore commit failed:", response.status, data.error?.status || data.error?.message || "unknown_error");
    throw new HttpError(503, "No se pudo confirmar el pago en la base de datos.");
  }
  return data;
}

function toFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)]));
}

function createWrite(path, data, precondition) {
  const write = {
    update: { name: documentName(path), fields: toFields(data) },
    updateMask: { fieldPaths: Object.keys(data) },
  };
  if (precondition) write.currentDocument = precondition;
  return write;
}

async function activateProWithPayment({ uid, paymentPath, paymentDocument, paymentUpdate, transactionPath, transactionData }) {
  const userPath = "users/" + uid;
  const userDocument = await getDocument(userPath);
  if (!userDocument) throw new HttpError(409, "No se encontró el perfil de usuario para activar el plan.");

  const currentExpiry = userDocument.data.subscriptionExpiresAt ? new Date(userDocument.data.subscriptionExpiresAt) : null;
  const baseDate = currentExpiry && Number.isFinite(currentExpiry.getTime()) && currentExpiry > new Date()
    ? currentExpiry
    : new Date();
  const nextExpiry = new Date(baseDate.getTime() + SUBSCRIPTION_MONTH_MS);
  const now = new Date();

  const writes = [];
  if (transactionPath && transactionData) {
    writes.push({
      update: { name: documentName(transactionPath), fields: toFields(transactionData) },
      currentDocument: { exists: false },
    });
  }
  writes.push(createWrite(paymentPath, paymentUpdate, paymentDocument?.updateTime
    ? { updateTime: paymentDocument.updateTime }
    : { exists: false }));
  writes.push(createWrite(userPath, {
    plan: "pro",
    subscriptionStatus: "active",
    subscriptionProvider: paymentUpdate.provider,
    subscriptionStartedAt: now,
    subscriptionExpiresAt: nextExpiry,
    subscriptionPaymentId: paymentUpdate.paymentId,
    subscriptionUpdatedAt: now,
  }, userDocument.updateTime ? { updateTime: userDocument.updateTime } : undefined));

  await commitWrites(writes);
  return { expiresAt: nextExpiry.toISOString() };
}

function assertPaymentConfiguration() {
  if (!/^[0-9a-f]{40}$/i.test(RECEIVER_ADDRESS.replace(/^0x/i, ""))) {
    throw new HttpError(503, "La dirección de recepción BEP20 no está configurada correctamente.");
  }
  if (!/^0x[0-9a-f]{40}$/.test(BSC_USDT_CONTRACT)) {
    throw new HttpError(503, "El contrato del token BEP20 no está configurado correctamente.");
  }
}

function getPaymentConstants() {
  return {
    priceUsd: PRICE_USD,
    amount: PRICE_USDT,
    currency: "USDT",
    providerAddress: RECEIVER_ADDRESS,
    network: "BNB Smart Chain (BEP20)",
    chainId: 56,
    tokenContract: BSC_USDT_CONTRACT,
    tokenDecimals: USDT_DECIMALS,
    requiredConfirmations: REQUIRED_BSC_CONFIRMATIONS,
  };
}

function requireBinanceCredentials() {
  const apiKey = process.env.BINANCE_PAY_API_KEY;
  const secretKey = process.env.BINANCE_PAY_SECRET_KEY;
  const certificateSn = process.env.BINANCE_PAY_CERTIFICATE_SN;
  if (!apiKey || !secretKey || !certificateSn) {
    throw new HttpError(503, "Binance Pay todavía no está conectado. Configura las credenciales de Merchant en Vercel.");
  }
  return { apiKey, secretKey, certificateSn };
}

function signBinanceRequest(body, secretKey) {
  const timestamp = String(Date.now());
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = timestamp + "\n" + nonce + "\n" + body + "\n";
  const signature = crypto.createHmac("sha512", secretKey).update(payload).digest("hex").toUpperCase();
  return { timestamp, nonce, signature };
}

async function callBinancePay(apiPath, bodyObject) {
  const credentials = requireBinanceCredentials();
  const body = JSON.stringify(bodyObject);
  const signed = signBinanceRequest(body, credentials.secretKey);
  const response = await fetch("https://bpay.binanceapi.com" + apiPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "BinancePay-Timestamp": signed.timestamp,
      "BinancePay-Nonce": signed.nonce,
      "BinancePay-Certificate-SN": credentials.certificateSn,
      "BinancePay-Signature": signed.signature,
    },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status !== "SUCCESS" || data.code !== "000000") {
    const reason = data.errorMessage || data.message || "La API de Binance Pay no aceptó la solicitud.";
    console.error("Binance Pay API request failed:", response.status, data.code || "no_code");
    throw new HttpError(response.status >= 500 ? 503 : 502, reason);
  }
  return data.data || {};
}

async function rpc(method, params) {
  const response = await fetch(BSC_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomInt(1, 2 ** 30), method, params }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    throw new HttpError(503, "No se pudo consultar la BNB Smart Chain. Inténtalo de nuevo más tarde.");
  }
  return payload.result;
}

function errorResponse(res, error) {
  if (error instanceof HttpError) return sendJson(res, error.statusCode, { error: error.message });
  console.error("Payment API error:", error?.message || "unknown_error");
  return sendJson(res, 500, { error: "Ocurrió un error al procesar el pago. No se ha activado el plan." });
}

module.exports = {
  HttpError,
  PRICE_USD,
  PRICE_USDT,
  PAYMENT_DURATION_MS,
  RECEIVER_ADDRESS,
  BSC_RPC_URL,
  BSC_USDT_CONTRACT,
  TRANSFER_TOPIC,
  USDT_DECIMALS,
  REQUIRED_BSC_CONFIRMATIONS,
  sendJson,
  requirePost,
  requireFirebaseUser,
  getDocument,
  createDocument,
  commitWrites,
  documentName,
  createWrite,
  toFields,
  activateProWithPayment,
  assertPaymentConfiguration,
  getPaymentConstants,
  requireBinanceCredentials,
  callBinancePay,
  rpc,
  errorResponse,
};
