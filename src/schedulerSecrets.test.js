const { getP2PSchedulerSecret } = require("../lib/scheduler-secrets");

describe("P2P scheduler secrets by Vercel environment", () => {
  test.each(["binance", "bybit"])("%s Preview uses its own secret and never falls back to Production", (provider) => {
    const upper = provider.toUpperCase();
    const env = {
      VERCEL_ENV: "preview",
      [upper + "_P2P_SCHEDULER_SECRET"]: "p".repeat(64),
      [upper + "_P2P_PREVIEW_SCHEDULER_SECRET"]: "v".repeat(64),
    };
    expect(getP2PSchedulerSecret(provider, env)).toBe("v".repeat(64));
    delete env[upper + "_P2P_PREVIEW_SCHEDULER_SECRET"];
    expect(getP2PSchedulerSecret(provider, env)).toBe("");
  });

  test.each(["binance", "bybit"])("%s Production keeps using its existing secret", (provider) => {
    const upper = provider.toUpperCase();
    const env = {
      VERCEL_ENV: "production",
      [upper + "_P2P_SCHEDULER_SECRET"]: "p".repeat(64),
      [upper + "_P2P_PREVIEW_SCHEDULER_SECRET"]: "v".repeat(64),
    };
    expect(getP2PSchedulerSecret(provider, env)).toBe("p".repeat(64));
  });

  test("does not accept external Cloudflare secrets in development", () => {
    expect(getP2PSchedulerSecret("binance", {
      VERCEL_ENV: "development",
      BINANCE_P2P_SCHEDULER_SECRET: "p".repeat(64),
      BINANCE_P2P_PREVIEW_SCHEDULER_SECRET: "v".repeat(64),
    })).toBe("");
  });

  test("rejects an unknown provider name", () => {
    expect(() => getP2PSchedulerSecret("unknown", { VERCEL_ENV: "preview" }))
      .toThrow(/Unsupported P2P scheduler provider/i);
  });
});
