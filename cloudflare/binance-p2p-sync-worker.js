const PRODUCTION_SYNC_HOST = "app-1-nu-five.vercel.app";
const PREVIEW_SYNC_HOST = "app-1-git-feat-preview-quota-model-jeremis-projects-53da5f18.vercel.app";
const SYNC_PATH = "/api/integrations/binance-p2p/sync";
const MAX_BATCHES_PER_RUN = 8;
const REQUEST_TIMEOUT_MS = 65_000;

function createRequestTimeoutSignal() {
  const AbortSignalConstructor = globalThis.AbortSignal;
  if (typeof AbortSignalConstructor?.timeout !== "function") return undefined;
  return AbortSignalConstructor.timeout(REQUEST_TIMEOUT_MS);
}

export function resolveSyncTarget(env) {
  const configuredEndpoint = String(env?.JJXCAPITAL_SYNC_ENDPOINT || "").trim();
  if (!configuredEndpoint) {
    throw new Error("JJXCAPITAL_SYNC_ENDPOINT is required; the Worker will not guess an environment.");
  }

  let url;
  try {
    url = new URL(configuredEndpoint);
  } catch {
    throw new Error("JJXCAPITAL_SYNC_ENDPOINT must be a valid HTTPS URL.");
  }

  const allowedHost = url.hostname === PRODUCTION_SYNC_HOST || url.hostname === PREVIEW_SYNC_HOST;
  if (url.protocol !== "https:" || !allowedHost || url.port || url.username || url.password ||
      url.pathname !== SYNC_PATH || url.search || url.hash) {
    throw new Error("JJXCAPITAL_SYNC_ENDPOINT is not an approved JJXCAPITAL endpoint.");
  }

  const preview = url.hostname === PREVIEW_SYNC_HOST;
  const bypassSecret = String(env?.VERCEL_AUTOMATION_BYPASS_SECRET || "");
  if (preview && bypassSecret.length < 32) {
    throw new Error("Preview requires a VERCEL_AUTOMATION_BYPASS_SECRET to pass Vercel SSO protection.");
  }

  return { endpoint: url.toString(), preview, bypassSecret };
}

async function runProviderBackgroundSync({ provider, scheduler, secret, target, fetchImpl }) {
  if (String(secret || "").length < 32) {
    throw new Error("Missing or weak " + provider.toUpperCase() + "_P2P_SCHEDULER_SECRET.");
  }

  const endpoint = new URL(target.endpoint);
  if (provider === "bybit") endpoint.searchParams.set("provider", "bybit");
  let processed = 0;
  let imported = 0;

  for (let batch = 1; batch <= MAX_BATCHES_PER_RUN; batch += 1) {
    const headers = {
      "Content-Type": "application/json",
      "X-JJXCapital-Scheduler": scheduler,
      "X-JJXCapital-Scheduler-Token": secret,
    };
    if (target.preview) headers["x-vercel-protection-bypass"] = target.bypassSecret;

    const response = await fetchImpl(endpoint.toString(), {
      method: "POST",
      headers,
      body: "{}",
      signal: createRequestTimeoutSignal(),
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

  console.log(JSON.stringify({ event: provider + "_p2p_background_sync", processed, imported }));
}

async function runBackgroundSync(env, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new Error("Fetch is not available in this Worker runtime.");
  const target = resolveSyncTarget(env);
  const failures = [];
  const binanceSecret = String(env.BINANCE_P2P_SCHEDULER_SECRET || "");
  const bybitSecret = String(env.BYBIT_P2P_SCHEDULER_SECRET || "");

  try {
    await runProviderBackgroundSync({
      provider: "binance",
      scheduler: "binance-p2p",
      secret: binanceSecret,
      target,
      fetchImpl,
    });
  } catch (error) {
    failures.push(error);
    console.error("Binance P2P background sync failed:", error?.message || "unknown_error");
  }

  if (bybitSecret.length >= 32) {
    try {
      await runProviderBackgroundSync({
        provider: "bybit",
        scheduler: "bybit-p2p",
        secret: bybitSecret,
        target,
        fetchImpl,
      });
    } catch (error) {
      failures.push(error);
      console.error("Bybit P2P background sync failed:", error?.message || "unknown_error");
    }
  } else {
    console.warn("Bybit P2P sync skipped: BYBIT_P2P_SCHEDULER_SECRET is not configured.");
  }

  if (failures.length) throw new Error("One or more JJXCapital P2P providers could not be synchronized.");
}

export { runBackgroundSync };

export default {
  async scheduled(controller, env) {
    await runBackgroundSync(env);
  },
};
