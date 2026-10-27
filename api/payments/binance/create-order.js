const crypto = require("crypto");
const {
  HttpError,
  sendJson,
  requirePost,
  requireFirebaseUser,
  getDocument,
  callBinancePay,
  PAYMENT_DURATION_MS,
  commitWrites,
  documentName,
  toFields,
  errorResponse,
} = require("../../../lib/payments");

module.exports = async function createBinancePayOrder(req, res) {
  if (!requirePost(req, res)) return;
  try {
    const claims = await requireFirebaseUser(req);
    const userPath = "users/" + claims.sub;
    const user = await getDocument(userPath);
    if (!user) throw new HttpError(409, "No se encontró el perfil de tu cuenta.");

    const paymentId = crypto.randomUUID().replace(/-/g, "");
    const now = new Date();
    const body = {
      env: { terminalType: "WEB" },
      merchantTradeNo: paymentId,
      orderAmount: 15,
      currency: "USDT",
      description: "Suscripción mensual JJXCAPITAL Pro",
      goods: {
        goodsType: "02",
        goodsCategory: "Z000",
        referenceGoodsId: "JJXCAPITAL-PRO-MONTHLY",
        goodsName: "JJXCAPITAL Pro",
        goodsDetail: "Suscripción mensual de servicios digitales JJXCAPITAL Pro",
      },
    };

    const order = await callBinancePay("/binancepay/openapi/v2/order", body);
    if (!order.checkoutUrl || !order.prepayId) {
      console.error("Binance Pay response missing checkout fields.");
      throw new HttpError(502, "Binance Pay no devolvió un enlace de pago válido.");
    }

    const expireTime = Number(order.expireTime);
    const expiresAt = Number.isFinite(expireTime) && expireTime > now.getTime()
      ? new Date(expireTime)
      : new Date(now.getTime() + PAYMENT_DURATION_MS);
    const payment = {
      paymentId,
      uid: claims.sub,
      provider: "binance_pay",
      status: "pending",
      plan: "pro",
      amount: 15,
      currency: "USDT",
      merchantTradeNo: paymentId,
      prepayId: String(order.prepayId),
      checkoutUrl: String(order.checkoutUrl),
      createdAt: now,
      expiresAt,
    };
    await commitWrites([
      {
        update: {
          name: documentName(userPath + "/payments/" + paymentId),
          fields: toFields(payment),
        },
        currentDocument: { exists: false },
      },
      {
        update: {
          name: documentName("paymentOrderIndex/" + paymentId),
          fields: toFields({ uid: claims.sub, paymentId, provider: "binance_pay", createdAt: now }),
        },
        currentDocument: { exists: false },
      },
    ]);

    return sendJson(res, 201, {
      paymentId,
      provider: "binance_pay",
      checkoutUrl: String(order.checkoutUrl),
      qrCodeLink: order.qrcodeLink || null,
      prepayId: String(order.prepayId),
      amount: 15,
      currency: "USDT",
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};
