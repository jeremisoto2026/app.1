// /api/create-payment.js
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { userId, amount, plan } = req.body;

    let totalAmount = amount;
    if (!totalAmount) {
      if (plan === "monthly") totalAmount = 13;
      else if (plan === "annual") totalAmount = 125;
    }

    if (!userId || !totalAmount) {
      return res.status(400).json({ error: "Faltan parámetros: userId o amount/plan" });
    }

    const payload = {
      merchantTradeNo: `${userId}-${Date.now()}`,
      totalFee: totalAmount.toString(),
      currency: "USDT",
      productType: "CASH",
      productName: plan === "annual" ? "Plan Premium Anual" : "Plan Premium Mensual",
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

    // 👀 Log en los logs de Vercel
    console.log("🔎 Respuesta Binance:", JSON.stringify(data, null, 2));

    // Devuelve SIEMPRE la respuesta completa de Binance al frontend
    return res.status(200).json(data);

  } catch (error) {
    console.error("❌ Error en create-payment:", error);
    return res.status(500).json({ error: "Error creando el pago", details: error.message });
  }
}