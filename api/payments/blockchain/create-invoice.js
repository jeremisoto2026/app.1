const crypto = require("crypto");
const {
  HttpError,
  sendJson,
  requirePost,
  requireFirebaseUser,
  getDocument,
  listDocuments,
  commitWrites,
  documentName,
  toFields,
  assertPaymentConfiguration,
  getPaymentConstants,
  PAYMENT_DURATION_MS,
  errorResponse,
} = require("../../../lib/payments");

const BASE_AMOUNT_UNITS_8 = 1500000000;
const AMOUNT_STEP_UNITS_8 = 10000; // 0.0001 USDT; compatible with send forms limited to 4 decimals.
const MAX_FRACTION_STEPS = 99; // 15.0001 to 15.0099 USDT.

function supportsFourDecimals(payment) {
  const amountUnits8 = Number(payment?.amountUnits8);
  return Number.isSafeInteger(amountUnits8) &&
    amountUnits8 >= BASE_AMOUNT_UNITS_8 + AMOUNT_STEP_UNITS_8 &&
    amountUnits8 <= BASE_AMOUNT_UNITS_8 + MAX_FRACTION_STEPS * AMOUNT_STEP_UNITS_8 &&
    amountUnits8 % AMOUNT_STEP_UNITS_8 === 0;
}

function shuffledFractionSteps() {
  const values = Array.from({ length: MAX_FRACTION_STEPS }, (_, index) => index + 1);
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

module.exports = async function createBlockchainInvoice(req, res) {
  if (!requirePost(req, res)) return;
  try {
    const claims = await requireFirebaseUser(req);
    assertPaymentConfiguration();

    const userPath = "users/" + claims.sub;
    const user = await getDocument(userPath);
    if (!user) throw new HttpError(409, "No se encontró el perfil de tu cuenta.");

    const constants = getPaymentConstants();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + PAYMENT_DURATION_MS);
    const existingPayments = await listDocuments(userPath + "/payments", 50);
    const existingInvoice = existingPayments.find(({ data }) =>
      data?.provider === "blockchain_bep20" &&
      data?.status === "pending" &&
      data?.expiresAt &&
      Date.parse(data.expiresAt) > createdAt.getTime() &&
      supportsFourDecimals(data)
    );

    if (existingInvoice) {
      const old = existingInvoice.data;
      return sendJson(res, 200, {
        paymentId: old.paymentId,
        amount: old.amount,
        amountUnits8: old.amountUnits8,
        currency: old.currency,
        priceUsd: constants.priceUsd,
        network: old.network,
        chainId: old.chainId,
        recipient: old.recipient,
        tokenContract: old.tokenContract,
        expiresAt: old.expiresAt,
        instructions: "Ya tienes una orden BEP20 pendiente. Envía el importe exacto mostrado, con cuatro decimales, y después introduce el TxID.",
      });
    }

    // Add a unique, four-decimal fraction from 0.0001 to 0.0099 USDT.
    // Expired reservations can be reused safely using their Firestore updateTime.
    const paymentId = crypto.randomUUID().replace(/-/g, "");
    const paymentPath = userPath + "/payments/" + paymentId;
    const fractions = shuffledFractionSteps();

    for (const fractionStep of fractions) {
      const amountUnits8 = BASE_AMOUNT_UNITS_8 + fractionStep * AMOUNT_STEP_UNITS_8;
      const amount = amountUnits8 / 100000000;
      const indexPath = "blockchainAmountIndex/" + String(amountUnits8);
      const previousIndex = await getDocument(indexPath);

      if (previousIndex) {
        const previousExpiry = Date.parse(previousIndex.data?.expiresAt || "");
        // Treat unbounded or malformed reservations as occupied instead of
        // risking that two live invoices are assigned the same amount.
        if (!Number.isFinite(previousExpiry) || previousExpiry > createdAt.getTime()) continue;
      }

      const payment = {
        paymentId,
        uid: claims.sub,
        provider: "blockchain_bep20",
        status: "pending",
        plan: "pro",
        amount,
        amountUnits8,
        currency: constants.currency,
        network: constants.network,
        chainId: constants.chainId,
        recipient: constants.providerAddress,
        tokenContract: constants.tokenContract,
        tokenDecimals: constants.tokenDecimals,
        createdAt,
        expiresAt,
      };
      const indexWrite = {
        update: {
          name: documentName(indexPath),
          fields: toFields({ uid: claims.sub, paymentId, amountUnits8, expiresAt, createdAt }),
        },
        currentDocument: previousIndex
          ? (previousIndex.updateTime ? { updateTime: previousIndex.updateTime } : { exists: true })
          : { exists: false },
      };

      try {
        await commitWrites([
          {
            update: { name: documentName(paymentPath), fields: toFields(payment) },
            currentDocument: { exists: false },
          },
          indexWrite,
        ]);
        return sendJson(res, 201, {
          paymentId,
          amount,
          amountUnits8,
          currency: constants.currency,
          priceUsd: constants.priceUsd,
          network: constants.network,
          chainId: constants.chainId,
          recipient: constants.providerAddress,
          tokenContract: constants.tokenContract,
          expiresAt: expiresAt.toISOString(),
          instructions: "Envía el importe exacto indicado, con cuatro decimales, en USDT por BNB Smart Chain (BEP20). La fracción identifica esta orden y solo añade entre 0,0001 y 0,0099 USDT.",
        });
      } catch (error) {
        if (error instanceof HttpError && error.statusCode === 409) continue;
        throw error;
      }
    }

    throw new HttpError(503, "No hay una fracción de importe disponible ahora mismo. Inténtalo de nuevo cuando caduque alguna orden pendiente.");
  } catch (error) {
    return errorResponse(res, error);
  }
};
