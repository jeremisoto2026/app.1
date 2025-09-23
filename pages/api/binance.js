// pages/api/binance.js
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { plan, userId } = req.body;

    const amount = plan === "anual" ? "125" : "13"; // 👈 Ajusta tus precios
    const payload = {
      merchantTradeNo: userId + "-" + Date.now(),
      totalFee: amount,
      currency: "USDT",
      productType: "Subscription",
      productName: `Plan ${plan}`,
    };

    const jsonPayload = JSON.stringify(payload);
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString("hex");

    const signaturePayload = timestamp + "\n" + nonce + "\n" + jsonPayload + "\n";
    const signature = crypto
      .createHmac("sha512", process.env.BINANCE_API_SECRET)
      .update(signaturePayload)
      .digest("hex");

    const response = await fetch("https://bpay.binanceapi.com/binancepay/openapi/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "BinancePay-Timestamp": timestamp,
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": process.env.BINANCE_API_KEY,
        "BinancePay-Signature": signature,
      },
      body: jsonPayload,
    });

    const data = await response.json();
    return res.status(200).json({ url: data.data?.checkoutUrl });
  } catch (error) {
    console.error("Error en binance.js:", error);
    return res.status(500).json({ error: "Error creando pago Binance" });
  }
}