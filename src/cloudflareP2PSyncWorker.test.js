const workerModule = require("../cloudflare/binance-p2p-sync-worker");
const worker = workerModule.default || workerModule;
const runBackgroundSync = workerModule.runBackgroundSync;

const PRODUCTION_ENDPOINT = "https://app-1-nu-five.vercel.app/api/integrations/binance-p2p/sync";
const PREVIEW_ENDPOINT = "https://app-1-git-feat-preview-quota-model-jeremis-projects-53da5f18.vercel.app/api/integrations/binance-p2p/sync";

describe("Cloudflare P2P background Worker environment isolation", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, processed: 0, imported: 0, hasMore: false }),
    });
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("requires an explicit endpoint instead of silently falling back to Production", async () => {
    await expect(runBackgroundSync({
      BINANCE_P2P_SCHEDULER_SECRET: "b".repeat(64),
    }, global.fetch)).rejects.toThrow(/JJXCAPITAL_SYNC_ENDPOINT is required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("rejects an endpoint outside the approved JJXCAPITAL hosts", async () => {
    await expect(runBackgroundSync({
      JJXCAPITAL_SYNC_ENDPOINT: "https://attacker.example/api/integrations/binance-p2p/sync",
      BINANCE_P2P_SCHEDULER_SECRET: "b".repeat(64),
    }, global.fetch)).rejects.toThrow(/not an approved JJXCAPITAL endpoint/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("refuses protected Preview without the Vercel automation bypass secret", async () => {
    await expect(runBackgroundSync({
      JJXCAPITAL_SYNC_ENDPOINT: PREVIEW_ENDPOINT,
      BINANCE_P2P_SCHEDULER_SECRET: "b".repeat(64),
    }, global.fetch)).rejects.toThrow(/VERCEL_AUTOMATION_BYPASS_SECRET/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("calls the isolated Preview alias with its Vercel SSO bypass header", async () => {
    await runBackgroundSync({
      JJXCAPITAL_SYNC_ENDPOINT: PREVIEW_ENDPOINT,
      VERCEL_AUTOMATION_BYPASS_SECRET: "s".repeat(48),
      BINANCE_P2P_SCHEDULER_SECRET: "b".repeat(64),
    }, global.fetch);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(PREVIEW_ENDPOINT);
    expect(options.headers["x-vercel-protection-bypass"]).toBe("s".repeat(48));
    expect(options.headers["X-JJXCapital-Scheduler"]).toBe("binance-p2p");
  });

  test("keeps Production endpoint separate and omits the Preview bypass header", async () => {
    await runBackgroundSync({
      JJXCAPITAL_SYNC_ENDPOINT: PRODUCTION_ENDPOINT,
      BINANCE_P2P_SCHEDULER_SECRET: "p".repeat(64),
      VERCEL_AUTOMATION_BYPASS_SECRET: "s".repeat(48),
    }, global.fetch);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe(PRODUCTION_ENDPOINT);
    expect(options.headers["x-vercel-protection-bypass"]).toBeUndefined();
  });
});
