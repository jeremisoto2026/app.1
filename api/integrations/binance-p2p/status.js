const {
  sendJson,
  requireFirebaseUser,
  getDocument,
  errorResponse,
} = require("../../../lib/payments");

const INTEGRATION_PATH = (uid) => "users/" + uid + "/privateIntegrations/binanceP2P";

const NETWORK_CHECKS = [
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

async function runNetworkCheck(check) {
  try {
    const response = await fetch(check.url, {
      method: "GET",
      headers: { "User-Agent": "JJXCAPITAL-network-diagnostic/1.0" },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    return {
      label: check.label,
      command: check.command,
      httpStatus: response.status,
      ok: response.ok,
      output: ((await response.text()).trim().slice(0, 1200)) || "(respuesta vacía)",
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

module.exports = async function binanceP2PStatus(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Método no permitido." });
  }
  try {
    const claims = await requireFirebaseUser(req);
    const document = await getDocument(INTEGRATION_PATH(claims.sub));
    const data = document?.data || {};
    const encryptionConfigured = /^[0-9a-f]{64}$/i.test(String(process.env.BINANCE_P2P_ENCRYPTION_KEY || "").trim());
    const responsePayload = {
      connected: Boolean(data.encryptedCredentials && data.connectionStatus === "connected"),
      encryptionConfigured,
      apiKeyHint: data.apiKeyHint || null,
      connectedAt: data.connectedAt || null,
      lastSyncAt: data.lastSyncAt || null,
      lastImportedCount: Number(data.lastImportedCount) || 0,
      lastSyncStatus: data.lastSyncStatus || null,
      lastSyncErrorCode: data.lastSyncError || null,
      backfillComplete: data.initialBackfillComplete === true,
      hasMoreHistory: data.initialBackfillComplete !== true ||
        Boolean(data.pendingWindowStart && (data.pendingNextBuyPage || data.pendingNextSellPage)),
      historyProbeEnabled: process.env.VERCEL_ENV === "preview",
    };

    const requestUrl = new URL(req.url || "/", "http://localhost");
    if (requestUrl.searchParams.get("networkDiagnostic") === "1") {
      const results = await Promise.all(NETWORK_CHECKS.map(runNetworkCheck));
      responsePayload.networkDiagnostic = {
        generatedAt: new Date().toISOString(),
        runtimeRegion: process.env.VERCEL_REGION || "no disponible",
        note: "Consultas GET de solo lectura ejecutadas desde la función de servidor. No se han enviado credenciales.",
        results,
      };
      console.info("JJXCAPITAL Binance support network diagnostic:", JSON.stringify(
        results.map(({ label, httpStatus, ok, output }) => ({ label, httpStatus, ok, output }))
      ));
    }

    return sendJson(res, 200, responsePayload);
  } catch (error) {
    return errorResponse(res, error);
  }
};
