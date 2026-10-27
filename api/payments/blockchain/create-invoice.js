const crypto = require("crypto");
const {
  HttpError,
  sendJson,
  requirePost,
  requireFirebaseUser,
  getDocument,
  createDocument,
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
    const paymentId = crypto.randomUUID().replace(/-/g, "");
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + PAYMENT_DURATION_MS);
    const payment = {
      paymentId,
      uid: claims.sub,
      provider: "blockchain_bep20",
      status: "pending",
      plan: "pro",
      amount: constants.amount,
      currency: constants.currency,
      network: constants.network,
      chainId: constants.chainId,
      recipient: constants.providerAddress,
      tokenContract: constants.tokenContract,
      tokenDecimals: constants.tokenDecimals,
      createdAt,
      expiresAt,
    };

    await createDocument(userPath + "/payments/" + paymentId, payment);

    return sendJson(res, 201, {
      paymentId,
      amount: constants.amount,
      currency: constants.currency,
      priceUsd: constants.priceUsd,
      network: constants.network,
      chainId: constants.chainId,
      recipient: constants.providerAddress,
      tokenContract: constants.tokenContract,
      expiresAt: expiresAt.toISOString(),
      instructions: "Envía exactamente 15 USDT por BNB Smart Chain (BEP20) y después introduce el TxID para verificarlo.",
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};
