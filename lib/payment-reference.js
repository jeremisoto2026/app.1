const crypto = require("crypto");
const { isPreviewFirebaseEnvironment } = require("./firebase-environment");

const SUPPORTED_PROVIDERS = new Set(["blockchain_bep20", "binance_pay"]);
const HMAC_DOCUMENT_ID_PATTERN = /^hmac_v1_(blockchain_bep20|binance_pay)_[a-f0-9]{64}$/;

function referenceError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizePaymentReference(provider, reference) {
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw referenceError(400, "PAYMENT_REFERENCE_PROVIDER_INVALID", "El proveedor de la referencia de pago no es válido.");
  }

  const value = String(reference == null ? "" : reference).trim();
  if (provider === "blockchain_bep20") {
    const normalized = value.toLowerCase();
    if (!/^0x[a-f0-9]{64}$/.test(normalized)) {
      throw referenceError(400, "PAYMENT_REFERENCE_INVALID", "La referencia BEP20 no tiene un formato válido.");
    }
    return normalized;
  }

  if (!value || value.length > 256 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw referenceError(400, "PAYMENT_REFERENCE_INVALID", "La referencia de Binance Pay no tiene un formato válido.");
  }
  return value;
}

function getPaymentReferenceSecret(env = process.env) {
  const keyName = isPreviewFirebaseEnvironment(env)
    ? "FIREBASE_PREVIEW_PAYMENT_REFERENCE_HMAC_KEY"
    : "PAYMENT_REFERENCE_HMAC_KEY";
  const secret = typeof env[keyName] === "string" ? env[keyName] : "";

  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw referenceError(
      503,
      "PAYMENT_REFERENCE_HMAC_KEY_MISSING",
      "Falta configurar una clave HMAC de referencias de pago segura para este entorno."
    );
  }
  return secret;
}

function getPaymentTransactionReferencePath(provider, reference, env = process.env) {
  const normalizedProvider = String(provider || "");
  const normalizedReference = normalizePaymentReference(normalizedProvider, reference);
  const secret = getPaymentReferenceSecret(env);
  const digest = crypto.createHmac("sha256", secret)
    .update("jjxcapital:payment-reference:v1\u0000" + normalizedProvider + "\u0000" + normalizedReference, "utf8")
    .digest("hex");
  return "paymentTransactions/hmac_v1_" + normalizedProvider + "_" + digest;
}

function getLegacyPaymentTransactionPath(provider, reference) {
  const normalizedProvider = String(provider || "");
  const normalizedReference = normalizePaymentReference(normalizedProvider, reference);

  if (normalizedProvider === "blockchain_bep20") {
    return "paymentTransactions/bep20_" + normalizedReference.slice(2);
  }
  return "paymentTransactions/binance_" + normalizedReference.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function isHmacPaymentTransactionId(documentId) {
  return HMAC_DOCUMENT_ID_PATTERN.test(String(documentId || ""));
}

module.exports = {
  getPaymentReferenceSecret,
  getPaymentTransactionReferencePath,
  getLegacyPaymentTransactionPath,
  isHmacPaymentTransactionId,
};
