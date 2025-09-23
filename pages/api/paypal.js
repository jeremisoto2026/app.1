// pages/api/paypal.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { plan } = req.body; // "mensual" o "anual"

    // Aquí simulas la creación de orden en PayPal
    // En producción: llama a la API de PayPal y devuelve el link real
    let url = "https://www.sandbox.paypal.com/checkoutnow?token=FAKE_TOKEN";

    if (plan === "mensual") {
      url += "&plan=mensual";
    } else if (plan === "anual") {
      url += "&plan=anual";
    }

    return res.status(200).json({ url });
  } catch (error) {
    console.error("Error en paypal.js:", error);
    return res.status(500).json({ error: "Error creando pago PayPal" });
  }
}