const crypto = require("crypto");
const {
  HttpError,
  sendJson,
  requirePost,
  requireFirebaseUser,
  getDocument,
  countDocuments,
  listDocumentsMatchingField,
  commitWrites,
  createWrite,
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
    const amount = Number(input.amount);
    const fee = input.fee === "" || input.fee === null || input.fee === undefined ? 0 : Number(input.fee);
    if (!EXCHANGES.includes(exchange) || !OPERATION_TYPES.includes(operationType) ||
        !CRYPTO_CURRENCIES.includes(cryptoCode) || !FIAT_CURRENCIES.includes(fiat) ||
        cryptoCode === fiat || !sessionId ||
        !Number.isFinite(amount) || amount <= 0 ||
        !Number.isFinite(rate) || rate <= 0 ||
        !Number.isFinite(fee) || fee < 0) {
      throw new HttpError(400, "Revisa la plataforma, el tipo de movimiento, las monedas, el importe, la tasa y la comisión.");
    }

    const sessionPath = userPath + "/sessions/" + sessionId;
    const sessionDocument = await getDocument(sessionPath);
    if (!sessionDocument || sessionDocument.data.status !== "active") {
      throw new HttpError(409, "Selecciona un arbitraje activo de tu cuenta para registrar el movimiento.");
    }
    const session = sessionDocument.data;
    if ((session.crypto && String(session.crypto).toUpperCase() !== cryptoCode) ||
        (session.fiat && String(session.fiat).toUpperCase() !== fiat)) {
      throw new HttpError(400, "Las monedas del movimiento deben coincidir con las del arbitraje seleccionado.");
    }

    const operationsPath = userPath + "/operations";
    const sessionOperations = await listDocumentsMatchingField(operationsPath, "sessionId", sessionId);
    const orderedOperations = sessionOperations.slice().sort((a, b) => {
      const readTime = (value) => {
        const parsed = value && typeof value === "object" && Number.isFinite(value.seconds)
          ? new Date(value.seconds * 1000).getTime()
          : new Date(value || 0).getTime();
        return Number.isFinite(parsed) ? parsed : 0;
      };
      const timeDiff = readTime(a.data.timestamp) - readTime(b.data.timestamp);
      return timeDiff || String(a.id).localeCompare(String(b.id));
    });
    if (orderedOperations.length === 0) {
      const requiredFirstOperation = session.initialCapitalType === "crypto" ? "Venta" : "Compra";
      if (operationType !== requiredFirstOperation) {
        throw new HttpError(409, "La primera operación de este arbitraje debe ser " + requiredFirstOperation.toUpperCase() + ".");
      }
    }

    // Legacy sessions can still have an initial capital. New sessions start from a zero-based
    // movement ledger and each operation uses the amount explicitly entered by the user.
    const initialCapital = Number(session.initialCapital);
    const hasInitialCapital = Number.isFinite(initialCapital) && initialCapital > 0;
    const startsWithCrypto = session.initialCapitalType === "crypto";
    let availableFiat = hasInitialCapital && !startsWithCrypto ? initialCapital : 0;
    let availableCrypto = hasInitialCapital && startsWithCrypto ? initialCapital : 0;
    sessionOperations.forEach((movement) => {
      const saved = movement.data || {};
      const savedFiatAmount = Number(saved.fiat_amount);
      const savedCryptoAmount = Number(saved.crypto_amount);
      if (saved.operation_type === "Compra") {
        if (Number.isFinite(savedFiatAmount)) availableFiat -= savedFiatAmount;
        if (Number.isFinite(savedCryptoAmount)) availableCrypto += savedCryptoAmount;
      } else if (saved.operation_type === "Venta") {
        if (Number.isFinite(savedCryptoAmount)) availableCrypto -= savedCryptoAmount;
        if (Number.isFinite(savedFiatAmount)) availableFiat += savedFiatAmount;
      }
    });
    if (Math.abs(availableFiat) < 1e-8) availableFiat = 0;
    if (Math.abs(availableCrypto) < 1e-10) availableCrypto = 0;

    const cryptoAmount = operationType === "Compra" ? amount / rate - fee : amount;
    const fiatAmount = operationType === "Venta" ? amount * rate - fee : amount;
    if (!Number.isFinite(cryptoAmount) || cryptoAmount <= 0 ||
        !Number.isFinite(fiatAmount) || fiatAmount <= 0) {
      throw new HttpError(400, "La comisión debe ser inferior al importe recibido.");
    }
    const nextFiatBalance = operationType === "Compra"
      ? availableFiat - fiatAmount
      : availableFiat + fiatAmount;
    const nextCryptoBalance = operationType === "Venta"
      ? availableCrypto - cryptoAmount
      : availableCrypto + cryptoAmount;
    const storedMovements = Number(profile.data.movementsUsed);
    const savedMovements = Number.isFinite(storedMovements) && storedMovements >= 0 ? storedMovements : 0;
    const currentMovements = Math.max(savedMovements, await countDocuments(operationsPath, 151));
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
      fee_currency: operationType === "Venta" ? fiat : cryptoCode,
      timestamp,
    };

    const firstOperationType = orderedOperations[0]?.data.operation_type || operationType;
    const firstOperationTime = orderedOperations[0]?.data.timestamp
      ? new Date(orderedOperations[0].data.timestamp)
      : timestamp;
    const sessionUpdate = {
      firstOperationType,
      firstOperationAt: firstOperationTime,
      lastOperationType: operationType,
      operationCount: sessionOperations.length + 1,
      fiatBalance: nextFiatBalance,
      cryptoBalance: nextCryptoBalance,
    };
    const writes = [
      {
        update: { name: documentName(operationsPath + "/" + id), fields: toFields(operation) },
        currentDocument: { exists: false },
      },
      createWrite(userPath, { movementsUsed: currentMovements + 1 },
        profile.updateTime ? { updateTime: profile.updateTime } : { exists: true }),
      createWrite(sessionPath, sessionUpdate, { updateTime: sessionDocument.updateTime }),
    ];
    await commitWrites(writes);

    return sendJson(res, 201, {
      operation: { ...operation, id, timestamp: timestamp.toISOString() },
      usage: { movements: currentMovements + 1, limit: 150 },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};
