const crypto = require("crypto");
const {
  HttpError,
  sendJson,
  requirePost,
  requireFirebaseUser,
  getDocument,
  commitWrites,
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
        amountUnits8: old.amountUnits8,
        currency: old.currency,
        priceUsd: constants.priceUsd,
        network: old.network,
        chainId: old.chainId,
        recipient: old.recipient,
        tokenContract: old.tokenContract,
        expiresAt: old.expiresAt,
        instructions: old.amountMode === "fixed_15_v1"
          ? "Ya tienes una orden BEP20 pendiente. Envía exactamente 15 USDT y después introduce el TxID."
          : "Ya tienes una orden BEP20 pendiente creada con el importe indicado. Envía ese importe y después introduce el TxID.",
      });
    }

    // New invoices use a fixed price. Keep returning an existing pending invoice
    // with its original amount so an in-flight payment is not invalidated.
    const paymentId = crypto.randomUUID().replace(/-/g, "");
    const paymentPath = userPath + "/payments/" + paymentId;
    const amountUnits8 = 1500000000;
    const amount = 15;
    const payment = {
      paymentId,
      uid: claims.sub,
      provider: "blockchain_bep20",
      status: "pending",
      plan: "pro",
      amount,
      amountUnits8,
      amountMode: "fixed_15_v1",
      currency: constants.currency,
      network: constants.network,
      chainId: constants.chainId,
      recipient: constants.providerAddress,
      tokenContract: constants.tokenContract,
      tokenDecimals: constants.tokenDecimals,
      createdAt,
      expiresAt,
    };

    await commitWrites([{
      update: { name: documentName(paymentPath), fields: toFields(payment) },
      currentDocument: { exists: false },
    }]);
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
      instructions: "Envía exactamente 15 USDT por BNB Smart Chain (BEP20). El servidor verificará el TxID, el contrato, el destinatario, el importe y las confirmaciones.",
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
