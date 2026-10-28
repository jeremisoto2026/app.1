const crypto = require("crypto");
const {
  HttpError,
} = require("./payments");

const BINANCE_BASE_URL = "https://api.binance.com";
const HISTORY_PATH = "/sapi/v1/c2c/orderMatch/listUserOrderHistory";
const DEFAULT_RECV_WINDOW = 10000;
const MAX_ROWS = 100;

function getEncryptionKey() {
  const value = String(process.env.BINANCE_P2P_ENCRYPTION_KEY || "").trim();
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new HttpError(
      503,
      "La conexión de Binance aún no está configurada de forma segura en el servidor."
    );
  }
  return Buffer.from(value, "hex");
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
    throw new HttpError(503, "No se pudo recuperar la conexión cifrada de Binance. Vuelve a conectarla.");
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
    throw new HttpError(503, "No se pudo descifrar la conexión de Binance. Comprueba la clave de cifrado del servidor.");
  }
}

function encodeRfc3986(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, (character) =>
    "%" + character.charCodeAt(0).toString(16).toUpperCase()
  );
}

function serializeQuery(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => encodeRfc3986(key) + "=" + encodeRfc3986(value))
    .join("&");
}

async function signedBinanceGet(params, credentials) {
  const query = serializeQuery(params);
  const signature = crypto.createHmac("sha256", credentials.apiSecret).update(query).digest("hex");
  const url = BINANCE_BASE_URL + HISTORY_PATH + "?" + query + "&signature=" + signature;
  let response;
  try {
    const requestOptions = {
      method: "GET",
      headers: {
        "X-MBX-APIKEY": credentials.apiKey,
        "User-Agent": "binance-wallet/1.0.0 (Skill)",
        "Accept": "application/json",
      },
    };
    if (process.env.NODE_ENV !== "test" &&
        typeof AbortSignal !== "undefined" &&
        typeof AbortSignal.timeout === "function") {
      requestOptions.signal = AbortSignal.timeout(12000);
    }
    response = await fetch(url, requestOptions);
  } catch {
    throw new HttpError(503, "Binance no respondió a la consulta. Inténtalo de nuevo más tarde.");
  }

  const payload = await response.json().catch(() => null);
  const apiCode = payload && typeof payload === "object" ? Number(payload.code) : NaN;
  if (!response.ok || (Number.isFinite(apiCode) && apiCode < 0)) {
    if (response.status === 429 || response.status === 418 || apiCode === -1003) {
      throw new HttpError(429, "Binance ha limitado las consultas. Espera antes de volver a sincronizar.");
    }
    if (response.status === 401 || response.status === 403 || apiCode === -2014 || apiCode === -2015 ||
        apiCode === -1022 || apiCode === -1021) {
      throw new HttpError(401, "Binance no aceptó la clave, los permisos o la firma. Comprueba la API key de solo lectura y vuelve a conectarla.");
    }
    console.error("Binance P2P history request failed:", response.status, Number.isFinite(apiCode) ? apiCode : "no_code");
    throw new HttpError(502, "Binance no pudo devolver el historial P2P.");
  }
  if (!payload || typeof payload !== "object") {
    throw new HttpError(502, "Binance devolvió una respuesta de historial no válida.");
  }
  if (payload.success === false || (payload.code && payload.code !== "000000" && apiCode >= 0)) {
    throw new HttpError(502, "Binance no confirmó la consulta del historial P2P.");
  }
  return payload;
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  const data = payload && payload.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.list)) return payload.list;
  return [];
}

async function verifyCredentials(credentials) {
  if (!credentials || typeof credentials.apiKey !== "string" || typeof credentials.apiSecret !== "string" ||
      credentials.apiKey.trim().length < 12 || credentials.apiKey.length > 256 ||
      credentials.apiSecret.trim().length < 12 || credentials.apiSecret.length > 256) {
    throw new HttpError(400, "Introduce una API Key y una Secret Key válidas de Binance.");
  }
  const endTimestamp = Date.now();
  const payload = await signedBinanceGet({
    tradeType: "BUY",
    startTimestamp: endTimestamp - 24 * 60 * 60 * 1000,
    endTimestamp,
    page: 1,
    rows: 1,
    recvWindow: DEFAULT_RECV_WINDOW,
    timestamp: Date.now(),
  }, credentials);
  // An empty history is a valid response. A valid signed API response confirms access.
  if (!Array.isArray(payload) && !Array.isArray(payload.data) && !Array.isArray(payload.data?.rows) &&
      !Array.isArray(payload.data?.list) && payload.success !== true && payload.code !== "000000") {
    throw new HttpError(502, "Binance no devolvió una respuesta válida al probar la conexión.");
  }
  return true;
}

async function fetchHistory({ credentials, tradeType, startTimestamp, endTimestamp, pageStart = 1, maxPages = 2 }) {
  if (!["BUY", "SELL"].includes(tradeType)) throw new Error("Invalid trade type");
  const rows = [];
  let page = Math.max(1, Number(pageStart) || 1);
  let total = null;
  let nextPage = null;
  let pagesFetched = 0;

  while (pagesFetched < maxPages) {
    const payload = await signedBinanceGet({
      tradeType,
      startTimestamp,
      endTimestamp,
      page,
      rows: MAX_ROWS,
      recvWindow: DEFAULT_RECV_WINDOW,
      timestamp: Date.now(),
    }, credentials);
    const currentRows = extractRows(payload);
    if (!Array.isArray(currentRows)) break;
    rows.push(...currentRows);
    pagesFetched += 1;

    const totalValue = Number(payload.total ?? payload.data?.total ?? payload.data?.totalCount);
    if (Number.isFinite(totalValue) && totalValue >= 0) total = totalValue;

    if (currentRows.length < MAX_ROWS || (total !== null && page * MAX_ROWS >= total)) {
      nextPage = null;
      break;
    }
    page += 1;
    nextPage = page;
  }

  return { rows, total, nextPage, pagesFetched };
}

module.exports = {
  encryptCredentials,
  decryptCredentials,
  verifyCredentials,
  fetchHistory,
  extractRows,
};
