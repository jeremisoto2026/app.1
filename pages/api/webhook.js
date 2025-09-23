import crypto from "crypto";
import admin from "firebase-admin";

// Inicializar Firebase Admin (solo una vez)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const body = JSON.stringify(req.body);
    const signature = req.headers["binancepay-signature"];
    const nonce = req.headers["binancepay-nonce"];
    const timestamp = req.headers["binancepay-timestamp"];

    // Verificar la firma de Binance
    const payload = timestamp + "\n" + nonce + "\n" + body + "\n";
    const expectedSignature = crypto
      .createHmac("sha512", process.env.BINANCE_API_SECRET)
      .update(payload)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: "Firma inválida" });
    }

    // Extraer datos de la notificación
    const { bizStatus, bizId, data } = req.body;

    if (bizStatus === "PAY_SUCCESS") {
      // Aquí debes obtener el userId (lo ideal es que lo mandes en el payload de create-payment)
      const userId = data.merchantTradeNo; // 👈 ejemplo, depende de cómo lo mandes

      await admin.firestore().collection("users").doc(userId).update({
        plan: "premium",
        premiumSince: new Date(),
      });

      return res.status(200).json({ message: "Usuario actualizado a Premium" });
    }

    return res.status(200).json({ message: "Notificación recibida" });
  } catch (error) {
    console.error("Error en webhook:", error);
    return res.status(500).json({ error: "Error interno en webhook" });
  }
}
