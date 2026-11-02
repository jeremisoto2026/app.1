const SYNC_ENDPOINT = "https://app-1-nu-five.vercel.app/api/integrations/binance-p2p/sync";
const MAX_BATCHES_PER_RUN = 8;
const REQUEST_TIMEOUT_MS = 65_000;

async function runBackgroundSync(env) {
  const secret = String(env.BINANCE_P2P_SCHEDULER_SECRET || "");
  if (secret.length < 32) throw new Error("Missing or weak BINANCE_P2P_SCHEDULER_SECRET.");

  let processed = 0;
  let imported = 0;
  for (let batch = 1; batch <= MAX_BATCHES_PER_RUN; batch += 1) {
    const response = await fetch(SYNC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-JJXCapital-Scheduler": "binance-p2p",
        "X-JJXCapital-Scheduler-Token": secret,
      },
      body: "{}",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await response.text();
    let result;
    try { result = text ? JSON.parse(text) : {}; }
    catch { throw new Error("JJXCAPITAL returned a non-JSON scheduler response."); }
    if (!response.ok) throw new Error("JJXCAPITAL scheduler returned HTTP " + response.status + ".");
    if (result.skipped === "another_run_is_active") break;

    processed += Number(result.processed) || 0;
    imported += Number(result.imported) || 0;
    if (result.success !== true) console.warn("Partial Binance P2P sync failure in batch " + batch + ".");
    if (result.hasMore !== true) break;
  }

  console.log(JSON.stringify({ event: "binance_p2p_background_sync", processed, imported }));
}

export default {
  async scheduled(controller, env) {
    await runBackgroundSync(env);
  },
};
