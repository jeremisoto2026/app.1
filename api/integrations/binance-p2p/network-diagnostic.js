const {
  sendJson,
  requireFirebaseUser,
  errorResponse,
} = require("../../../lib/payments");

const CHECKS = [
  {
    label: "API pública de Binance",
    command: "curl -sS -i https://api.binance.com/api/v3/time",
    url: "https://api.binance.com/api/v3/time",
  },
  {
    label: "API de Futures de Binance",
    command: "curl -sS -i https://fapi.binance.com/fapi/v1/time",
    url: "https://fapi.binance.com/fapi/v1/time",
  },
  {
    label: "IP pública de salida",
    command: "curl -sS https://checkip.amazonaws.com/",
    url: "https://checkip.amazonaws.com/",
  },
];

async function runCheck(check) {
  try {
    const response = await fetch(check.url, {
      method: "GET",
      headers: { "User-Agent": "JJXCAPITAL-network-diagnostic/1.0" },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    const body = (await response.text()).trim().slice(0, 1200);
    return {
      label: check.label,
      command: check.command,
      httpStatus: response.status,
      ok: response.ok,
      output: body || "(respuesta vacía)",
    };
  } catch (error) {
    return {
      label: check.label,
      command: check.command,
      httpStatus: null,
      ok: false,
      output: error?.name === "TimeoutError"
        ? "La solicitud agotó el tiempo de espera."
        : "Error de conexión: " + String(error?.cause?.code || error?.name || "desconocido"),
    };
  }
}

module.exports = async function binanceP2PNetworkDiagnostic(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Método no permitido." });
  }

  try {
    await requireFirebaseUser(req);
    const results = await Promise.all(CHECKS.map(runCheck));
    console.info("JJXCAPITAL Binance support network diagnostic:", JSON.stringify(
      results.map(({ label, httpStatus, ok, output }) => ({ label, httpStatus, ok, output }))
    ));
    return sendJson(res, 200, {
      generatedAt: new Date().toISOString(),
      runtimeRegion: process.env.VERCEL_REGION || "no disponible",
      note: "Pruebas GET de solo lectura ejecutadas desde la función de servidor. No se han enviado credenciales.",
      results,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};
