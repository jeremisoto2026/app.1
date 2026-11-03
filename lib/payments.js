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
  return sendJson(res, 405, { error: "MÃ©todo no permitido." });
}

function requirePost(req, res) {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res);
    return false;
 ¶»§q«^