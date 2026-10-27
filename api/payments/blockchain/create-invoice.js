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
      Date.parse(data.expiresAt) > createdAt.getTime()
    );

    if (existingInvoice) {
      const old = existingInvoice.data;
      return sendJson(res, 200, {
        paymentId: old.paymentId,
        amount: old.amount,
        currency: old.currency,
        priceUsd: constants.priceUsd,
        network: old.network,
        chainId: old.chainId,
        recipient: old.recipient,
        tokenContract: old.tokenContract,
        expiresAt: old.expiresAt,
        instructions: "Ya tienes una orden BEP20 pendiente. Envía el importe exacto mostrado y después introduce el TxID.",
      });
    }

    // A tiny invoice-specific fraction links a transfer to one order. It adds
    // at most 0.01 USDT to the $15 base price and prevents another account from
    // claiming a visible transfer by submitting the same TxID.
    const paymentId = crypto.randomUUID().replace(/-/g, "");
    let amountUnits8 = 0;
    let amount = 0;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      amountUnits8 = 1500000000 + crypto.randomInt(1, 1000000);
      amount = amountUnits8 / 100000000;
      const indexPath = "blockchainAmountIndex/" + String(amountUnits8);
      if (await getDocument(indexPath)) continue;

      const paymentPath = userPath + "/payments/" + paymentId;
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

      try {
        await commitWrites([
          {
            update: { name: documentName(paymentPath), fields: toFields(payment) },
            currentDocument: { exists: false },
          },
          {
            update: {
              name: documentName(indexPath),
              fields: toFields({ uid: claims.sub, paymentId, amountUnits8, expiresAt, createdAt }),
            },
            currentDocument: { exists: false },
          },
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
          instructions: "Envía el importe exacto indicado en USDT por BNB Smart Chain (BEP20). La fracción identifica esta orden para impedir reutilizar un TxID.",
        });
      } catch (error) {
        if (error instanceof HttpError && error.statusCode === 409) continue;
        throw error;
      }
    }

    throw new HttpError(503, "No se pudo reservar un importe BEP20 único. Inténtalo de nuevo.");
  } catch (error) {
    return errorResponse(res, error);
  }
};
