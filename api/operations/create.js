const crypto = require("crypto");
const {
  HttpError,
  sendJson,
  requirePost,
  requireFirebaseUser,
  getDocument,
  countDocuments,
  commitWrites,
  documentName,
  toFields,
  errorResponse,
} = require("../../lib/payments");
const { assertPlanAllows } = require("../../lib/plans");

const EXCHANGES = ["Binance", "Bybit", "OKX", "KuCoin"];
const OPERATION_TYPES = ["Compra", "Venta"];
const FIAT_CURRENCIES = ["EUR", "USD", "VES", "COP", "ARS", "MXN", "BRL", "PEN", "CLP", "GBP"];
const CRYPTO_CURRENCIES = ["USDT", "USDC", "BTC", "ETH", "BNB", "DAI"];

module.exports = async function createOperation(req, res) {
  if (!requirePost(req, res)) return;
  try {
    const claims = await requireFirebaseUser(req);
    const userPath = "users/" + claims.sub;
    const profile = await getDocument(userPath);
    if (!profile) throw new HttpError(409, "No se encontró el perfil de tu cuenta.");

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const input = body.operationData && typeof body.operationData === "object" ? body.operationData : {};
    const exchange = String(input.exchange || "");
    const operationType = String(input.operation_type || "");
    const cryptoCode = String(input.crypto || "").toUpperCase();
    const fiat = String(input.fiat || "").toUpperCase();
    const sessionId = String(input.sessionId || "").trim();
    const rate = Number(input.exchange_rate);
    const fee = input.fee === "" || input.fee === null || input.fee === undefined ? 0 : Number(input.fee);
    const cryptoAmount = Number(input.crypto_amount);
    const fiatAmount = Number(input.fiat_amount);

    if (!EXCHANGES.includes(exchange) || !OPERATION_TYPES.includes(operationType) ||
        !CRYPTO_CURRENCIES.includes(cryptoCode) || !FIAT_CURRENCIES.includes(fiat) ||
        cryptoCode === fiat || !sessionId ||
        !Number.isFinite(rate) || rate <= 0 ||
        !Number.isFinite(fee) || fee < 0 ||
        !Number.isFinite(cryptoAmount) || cryptoAmount <= 0 ||
        !Number.isFinite(fiatAmount) || fiatAmount <= 0) {
      throw new HttpError(400, "Revisa la plataforma, el tipo de movimiento, las monedas, los importes, la tasa y la comisión.");
    }

    const sessionDocument = await getDocument(userPath + "/sessions/" + sessionId);
    if (!sessionDocument || sessionDocument.data.status !== "active") {
      throw new HttpError(409, "Selecciona un arbitraje activo de tu cuenta para registrar el movimiento.");
    }
    const session = sessionDocument.data;
    if ((session.crypto && String(session.crypto).toUpperCase() !== cryptoCode) ||
        (session.fiat && String(session.fiat).toUpperCase() !== fiat)) {
      throw new HttpError(400, "Las monedas del movimiento deben coincidir con las del arbitraje seleccionado.");
    }

    // Recalcular en el servidor para no confiar en los importes derivados enviados por el navegador.
    const expectedCrypto = operationType === "Compra" ? fiatAmount / rate - fee : cryptoAmount;
    const expectedFiat = operationType === "Venta" ? cryptoAmount * rate - fee : fiatAmount;
    if (!Number.isFinite(expectedCrypto) || expectedCrypto <= 0 ||
        !Number.isFinite(expectedFiat) || expectedFiat <= 0) {
      throw new HttpError(400, "La comisión debe ser inferior al importe del movimiento.");
    }
    const tolerance = Math.max(1e-8, Math.abs(expectedCrypto) * 1e-8);
    const fiatTolerance = Math.max(1e-8, Math.abs(expectedFiat) * 1e-8);
    if (Math.abs(expectedCrypto - cryptoAmount) > tolerance ||
        Math.abs(expectedFiat - fiatAmount) > fiatTolerance) {
      throw new HttpError(400, "Los importes calculados no coinciden con la tasa y la comisión. Revisa el movimiento.");
    }

    const operationsPath = userPath + "/operations";
    const currentMovements = await countDocuments(operationsPath, 151);
    assertPlanAllows(profile.data, "movements", currentMovements);

    const id = crypto.randomUUID().replace(/-/g, "");
    const timestamp = new Date();
    const operation = {
      order_id: String(input.order_id || "").trim().slice(0, 160),
      exchange,
      operation_type: operationType,
      crypto: cryptoCode,
      fiat,
      sessionId,
      sessionName: String(session.name || ""),
      arbitrageType: String(session.strategy || "Comercio P2P"),
      crypto_amount: cryptoAmount,
      fiat_amount: fiatAmount,
      exchange_rate: rate,
      fee,
      fee_currency: String(input.fee_currency || (operationType === "Venta" ? fiat : cryptoCode)),
      timestamp,
    };

    await commitWrites([{
      update: { name: documentName(operationsPath + "/" + id), fields: toFields(operation) },
      currentDocument: { exists: false },
    }]);

    return sendJson(res, 201, {
      operation: { ...operation, id, timestamp: timestamp.toISOString() },
      usage: { movements: currentMovements + 1, limit: 150 },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};
