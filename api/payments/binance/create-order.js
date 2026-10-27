const crypto = require("crypto");
const {
  HttpError,
  sendJson,
  requirePost,
  requireFirebaseUser,
  getDocument,
  createDocument,
  callBinancePay,
  PAYMENT_DURATION_MS,
  errorResponse,
} = require("../../_lib/payments");

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
      goodsDetails: [{
        goodsType: "01",
        goodsCategory: "D000",
        referenceGoodsId: "JJXCAPITAL-PRO-MONTHLY",
        goodsName: "JJXCAPITAL Pro",
        goodsDetail: "Acceso durante un mes a las funciones Pro de JJXCAPITAL",
      }],
    };

    const order = await callBinancePay("/binancepay/openapi/v3/order", body);
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
    await createDocument(userPath + "/payments/" + paymentId, payment);

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
