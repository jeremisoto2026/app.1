// pages/api/blockchain.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { plan } = req.body;

    // Aquí puedes poner tu dirección de wallet
    const walletAddress = process.env.MY_BLOCKCHAIN_WALLET;
    const amount = plan === "anual" ? "125" : "13";

    // Devolver instrucción de pago manual
    return res.status(200).json({
      url: `blockchainpay:${walletAddress}?amount=${amount}&currency=USDT`,
      walletAddress,
      amount,
    });
  } catch (error) {
    console.error("Error en blockchain.js:", error);
    return res.status(500).json({ error: "Error creando pago Blockchain" });
  }
}