const SECRET_KEYS = Object.freeze({
  binance: {
    preview: "BINANCE_P2P_PREVIEW_SCHEDULER_SECRET",
    production: "BINANCE_P2P_SCHEDULER_SECRET",
  },
  bybit: {
    preview: "BYBIT_P2P_PREVIEW_SCHEDULER_SECRET",
    production: "BYBIT_P2P_SCHEDULER_SECRET",
  },
});

function getP2PSchedulerSecret(provider, env = process.env) {
  const keys = SECRET_KEYS[String(provider || "").toLowerCase()];
  if (!keys) throw new TypeError("Unsupported P2P scheduler provider.");
  if (env.VERCEL_ENV === "preview") return String(env[keys.preview] || "");
  if (env.VERCEL_ENV === "production") return String(env[keys.production] || "");
  return "";
}

module.exports = { getP2PSchedulerSecret };
