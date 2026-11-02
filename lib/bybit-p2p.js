const crypto = require("crypto");
const { HttpError } = require("./payments");

const DEFAULT_BASE_URL = "https://api.bybit.com";
const ALLOWED_API_HOSTS = new Set([
  "api.bybit.com",
  "api.bytick.com",
  "api.bybit.nl",
  "api.byhkbit.com",
  "api.bybit.tr",
  "api.bybit.kz",
]);
const ORDER_LIST_PATH = "/v5/p2p/order/simplifyList";
const RECV_WINDOW = "5000";
const PAGE_SIZE = 30;

function getEncryptionKey() {
  const value = String(process.env.BYBIT_P2P_ENCRYPTION_KEY || "").trim();
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new HttpError(503, "La conexión de Bybit no está habilitada con una clave de cifrado segura en este Preview.");
  }
  return Buffer.from(value, "hex");
}

function getApiBaseUrl() {
  const value = String(process.env.BYBIT_P2P_API_BASE_URL || DEFAULT_BASE_URL).trim();
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new HttpError(503, "La dirección de la API de Bybit no está configurada correctamente.");
  }
  if (parsed.protocol !== "https:" || !ALLOWED_API_HOSTS.has(parsed.hostname) ||
      parsed.username || parsed.password || parsed.pathname !== "/" ||
      parsed.search || parsed.hash) {
    throw new HttpError(503, "La región configurada para la API de Bybit no está permitida.");
  }
  return parsed.origin;
}

function encryptCredentials(credentials) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(credentials), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

function decryptCredentials(encrypted) {
  const key = getEncryptionKey();
  if (!encrypted || encrypted.version !== 1 || encrypted.algorithm !== "aes-256-gcm" ||
      !encrypted.iv || !encrypted.tag || !encrypted.ciphertext) {
    throw new HttpError(503, "No se pudo recuperar la conexión cifrada de Bybit. Vuelve a conectarla.");
  }
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(encrypted.iv, "base64"));
    decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
      decipher.final(),
    ]);
    const credentials = JSON.parse(plaintext.toString("utf8"));
    if (typeof credentials.apiKey !== "string" || typeof credentials.apiSecret !== "string") {
      throw new Error("Invalid credential payload");
    }
    return credentials;
  } catch {
    throw new HttpError(503, "No se pudo descifrar la conexión de Bybit. Comprueba la clave de cifrado del Preview.");
  }
}

function buildSignaturePayload(timestamp, apiKey, recvWindow, body) {
  return String(timestamp) + String(apiKey) + String(recvWindow) + String(body);
}

function signRequest(timestamp, apiKey, apiSecret, recvWindow, body) {
  return crypto.createHmac("sha256", apiSecret)
    .update(buildSignaturePayload(timestamp, apiKey, recvWindow, body))
    .digest("hex");
}

function extractItems(payload) {
  const result = payload && (payload.result || payload.data);
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.list)) return result.list;
  return [];
}

function apiErrorMessage(code, httpStatus) {
  const value = String(code ?? "");
  if (httpStatus === 429 || value === "10006") {
    return "Bybit ha limitado las consultas. Espera un momento antes de volver a sincronizar.";
  }
  if (["10003", "10004", "10005", "10007", "10010"].includes(value) ||
      httpStatus === 401 || httpStatus === 403) {
    return "Bybit no aceptó la clave, la firma o los permisos. Comprueba que sea una clave generada por el sistema con permiso P2P de solo lectura y que tu cuenta sea anunciante general o superior.";
  }
  if (value === "10002") {
    return "Bybit rechazó la fecha de la solicitud. Comprueba que la hora del servidor esté sincronizada.";
  }
  if (httpStatus === 451) {
    return "Bybit no permite consultar esta API desde la región de la cuenta o del servidor.";
  }
  return "Bybit no pudo devolver el historial P2P. Comprueba la disponibilidad de la API para tu región.";
}

async function signedPost(path, bodyObject, credentials) {
  if (!credentials || typeof credentials.apiKey !== "string" ||
      typeof credentials.apiSecret !== "string") {
    throw new HttpError(401, "La conexión de Bybit no contiene credenciales válidas.");
  }

  const body = JSON.stringify(bodyObject);
  const timestamp = String(Date.now());
  const signature = signRequest(timestamp, credentials.apiKey, credentials.apiSecret, RECV_WINDOW, body);
  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-BAPI-API-KEY": credentials.apiKey,
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": RECV_WINDOW,
      "X-BAPI-SIGN": signature,
      "Accept": "application/json",
    },
    body,
  };
  if (process.env.NODE_ENV !== "test" &&
      typeof AbortSignal !== "undefined" &&
      typeof AbortSignal.timeout === "function") {
    requestOptions.signal = AbortSignal.timeout(12000);
  }

  let response;
  try {
    response = await fetch(getApiBaseUrl() + path, requestOptions);
  } catch {
    throw new HttpError(503, "Bybit no respondió a la consulta. Inténtalo de nuevo más tarde.");
  }

  const payload = await response.json().catch(() => null);
  const code = payload && typeof payload === "object"
    ? (payload.retCode ?? payload.ret_code)
    : undefined;
  if (!response.ok || (code !== undefined && Number(code) !== 0)) {
    console.error("Bybit P2P API request failed:", response.status, code ?? "no_code");
    throw new HttpError(
      response.status === 429 ? 429 : (response.status >= 500 ? 503 : 502),
      apiErrorMessage(code, response.status)
    );
  }
  if (!payload || typeof payload !== "object" || !payload.result && !payload.data) {
    throw new HttpError(502, "Bybit devolvió una respuesta P2P no válida.");
  }
  return payload;
}

async function verifyCredentials(credentials) {
  if (!credentials || typeof credentials.apiKey !== "string" ||
      typeof credentials.apiSecret !== "string" ||
      credentials.apiKey.trim().length < 8 || credentials.apiKey.length > 256 ||
      credentials.apiSecret.trim().length < 8 || credentials.apiSecret.length > 256) {
    throw new HttpError(400, "Introduce una API Key y una API Secret válidas de Bybit.");
  }

  // Only read the completed-order list. No order placement, payment or release endpoint is used.
  const payload = await signedPost(ORDER_LIST_PATH, {
    status: 50,
    page: 1,
    size: 1,
  }, credentials);
  if (!Array.isArray(extractItems(payload))) {
    throw new HttpError(502, "Bybit no devolvió una lista válida al comprobar la conexión.");
  }
  return true;
}

async function fetchOrderHistory({
  credentials,
  beginTime,
  endTime,
  pageStart = 1,
  maxPages = 2,
}) {
  const rows = [];
  const size = PAGE_SIZE;
  let page = Math.max(1, Number(pageStart) || 1);
  let count = null;
  let nextPage = null;
  let pagesFetched = 0;
  const pageLimit = Math.max(1, Math.min(5, Number(maxPages) || 2));

  while (pagesFetched < pageLimit) {
    const payload = await signedPost(ORDER_LIST_PATH, {
      status: 50,
      beginTime: String(beginTime),
      endTime: String(endTime),
      page,
      size,
    }, credentials);
    const pageItems = extractItems(payload);
    const result = payload.result || payload.data || {};
    const countValue = Number(result.count ?? result.total ?? result.totalCount);
    if (Number.isFinite(countValue) && countValue >= 0) count = countValue;
    rows.push(...pageItems);
    pagesFetched += 1;

    if (pageItems.length < size || (count !== null && page * size >= count)) {
      nextPage = null;
      break;
    }
    page += 1;
    nextPage = page;
  }

  return { rows, count, nextPage, pagesFetched };
}

function parseTimestamp(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === "number" || (typeof value === "string" && /^\d{10,16}$/.test(value.trim()))) {
    const number = Number(value);
    const date = new Date(number > 0 && number < 100000000000 ? number * 1000 : number);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
}

function finiteNumber(value) {
  if (typeof value === "string" && !value.trim()) return NaN;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function normalizeCompletedOrder(row) {
  const orderId = String(row?.id ?? row?.orderId ?? "").trim();
  const side = Number(row?.side);
  const crypto = String(row?.tokenId ?? row?.notifyTokenId ?? "").trim().toUpperCase();
  const fiat = String(row?.currencyId ?? "").trim().toUpperCase();
  const fiatAmount = finiteNumber(row?.amount);
  const rate = finiteNumber(row?.price);
  const suppliedCryptoAmount = finiteNumber(row?.notifyTokenQuantity);
  const cryptoAmount = Number.isFinite(suppliedCryptoAmount) && suppliedCryptoAmount > 0
    ? suppliedCryptoAmount
    : fiatAmount / rate;
  const timestamp = parseTimestamp(row?.createDate ?? row?.createTime);
  const status = Number(row?.status);

  if (!orderId || orderId.length > 160 || ![0, 1].includes(side) ||
      !crypto || !fiat || crypto === fiat ||
      !Number.isFinite(fiatAmount) || fiatAmount <= 0 ||
      !Number.isFinite(rate) || rate <= 0 ||
      !Number.isFinite(cryptoAmount) || cryptoAmount <= 0 ||
      !timestamp || status !== 50) {
    return null;
  }

  const fee = finiteNumber(row?.fee);
  return {
    order_id: "BYBIT-" + orderId,
    source: "bybit_p2p",
    sourceOrderId: orderId,
    sourceStatus: String(row?.status ?? ""),
    sourceOrderType: String(row?.orderType ?? "") || null,
    sourceFee: Number.isFinite(fee) ? fee : null,
    exchange: "Bybit",
    operation_type: side === 0 ? "Compra" : "Venta",
    crypto,
    fiat,
    crypto_amount: cryptoAmount,
    fiat_amount: fiatAmount,
    exchange_rate: rate,
    // Bybit's P2P order-list schema does not identify the fee currency.
    // Preserve the raw fee separately until its denomination is verified.
    fee: 0,
    fee_currency: null,
    timestamp,
    importedAt: new Date(),
    sessionId: null,
    sessionName: "Bybit P2P · Importado",
    arbitrageType: "Bybit P2P",
  };
}

module.exports = {
  encryptCredentials,
  decryptCredentials,
  buildSignaturePayload,
  signRequest,
  extractItems,
  verifyCredentials,
  fetchOrderHistory,
  normalizeCompletedOrder,
  getApiBaseUrl,
};
