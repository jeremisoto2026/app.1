const SYNC_ENDPOINT = "https://app-1-nu-five.vercel.app/api/integrations/binance-p2p/sync";
const MAX_BATCHES_PER_RUN = 8;
const REQUEST_TIMEOUT_MS = 65_000;

async function runProviderBackgroundSync({ provider, scheduler, secret }) {
  if (secret.length < 32) {
    throw new Error("Missing or weak " + provider.toUpperCase() + "_P2P_SCHEDULER_SECRET.");
  }

  const endpoint = provider === "bybit"
    ? SYNC_ENDPOINT + "?provider=bybit"
    : SYNC_ENDPOINT;
  let processed = 0;
  let imported = 0;

  for (let batch = 1; batch <= MAX_BATCHES_PER_RUN; batch += 1) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-JJXCapital-Scheduler": scheduler,
        "X-JJXCapital-Scheduler-Token": secret,
      },
      body: "{}",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await response.text();
    let result;
    try { result = text ? JSON.parse(text) : {}; }
    catch { throw new Error("JJXCAPITAL returned a non-JSON " + provider + " scheduler response."); }
    if (!response.ok) {
      throw new Error("JJXCAPITAL " + provider + " scheduler returned HTTP " + response.status + ".");
    }
    if (result.skipped === "another_run_is_active") break;

    processed += Number(result.processed) || 0;
    imported += Number(result.imported) || 0;
    if (result.success !== true) {
      console.warn("Partial " + provider + " P2P sync failure in batch " + batch + ".");
    }
    if (result.hasMore !== true) break;
  }

  console.log(JSON.stringify({
    event: provider + "_p2p_background_sync",
    processed,
    imported,
  }));
}

async function runBackgroundSync(env) {
  const failures = [];
  const binanceSecret = String(env.BINANCE_P2P_SCHEDULER_SECRET || "");
  const bybitSecret = String(env.BYBIT_P2P_SCHEDULER_SECRET || "");

  // Keep Binance's existing one-minute schedule and authentication unchanged.
  try {
    await runProviderBackgroundSync({
      provider: "binance",
      scheduler: "binance-p2p",
      secret: binanceSecret,
    });
  } catch (error) {
    failures.push(error);
    console.error("Binance P2P background sync failed:", error?.message || "unknown_error");
  }

  // Bybit uses its own Vercel/Cloudflare secret and the same protected minute Worker.
  // Missing Bybit configuration must never interrupt the existing Binance sync.
  if (bybitSecret.length >= 32) {
    try {
      await runProviderBackgroundSync({
        provider: "bybit",
        scheduler: "bybit-p2p",
        secret: bybitSecret,
      });
    } catch (error) {
      failures.push(error);
      console.error("Bybit P2P background sync failed:", error?.message || "unknown_error");
    }
  } else {
    console.warn("Bybit P2P minute sync skipped: BYBIT_P2P_SCHEDULER_SECRET is not configured.");
  }

  if (failures.length) {
    throw new Error("One or more JJXCAPITAL P2P providers could not be synchronized.");
  }
}

export default {
  async scheduled(controller, env) {
    await runBackgroundSync(env);
  },
};
