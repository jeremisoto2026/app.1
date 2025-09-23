// pages/api/create-payment.js
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { amount, currency, orderId } = req.body;

    // Payload para Binance Pay
    const payload = {
      env: {
        terminalType: "WEB",
      },
      merchantTradeNo: orderId || Date.now().toString(), // ID único de orden
      orderAmount: amount,
      currency: currency || "USDT",
      goods: {
        goodsType: "01", // Físico
        goodsCategory: "D000",
        referenceGoodsId: "P13",
        goodsName: "Suscripción Premium",
        goodsDetail: "Acceso a todos los beneficios Premium",
      },
    };

    // Firma requerida por Binance Pay
    const queryString = JSON.stringify(payload);
    const timestamp = Date.now().toString();
    const nonce = Math.random().toString(36).substring(2);

    const message = timestamp + "\n" + nonce + "\n" + queryString + "\n";
    const signature = crypto
      .createHmac("sha512", process.env.BINANCE_API_SECRET)
      .update(message)
      .digest("hex");

    // Llamada a Binance Pay
    const response = await fetch(
      "https://bpay.binanceapi.com/binancepay/openapi/v2/order",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "BinancePay-Timestamp": timestamp,
          "BinancePay-Nonce": nonce,
          "BinancePay-Certificate-SN": process.env.BINANCE_API_KEY,
          "BinancePay-Signature": signature,
        },
        body: queryString,
      }
    );

    const data = await response.json();

    if (data.status !== "SUCCESS") {
      return res.status(400).json({ error: data });
    }

    // Éxito -> devolvemos la URL de pago al frontend
    return res.status(200).json({
      checkoutUrl: data.data.checkoutUrl,
      prepayId: data.data.prepayId,
    });
  } catch (error) {
    console.error("❌ Error en create-payment:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
