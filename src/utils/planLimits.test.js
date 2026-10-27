import {
  FREE_PLAN_LIMITS,
  getProfileExportCount,
  getLimitProgress,
  isProSubscriptionActive,
} from "./planLimits";

describe("plan limits", () => {
  test("defines the requested free plan quotas", () => {
    expect(FREE_PLAN_LIMITS).toEqual({
      orders: 300,
      movements: 150,
      exports: 50,
    });
  });

  test("treats Pro as active only when its paid period has not expired", () => {
    const now = Date.parse("2026-10-27T12:00:00.000Z");
    expect(isProSubscriptionActive({
      plan: "pro",
      subscriptionExpiresAt: "2026-11-26T12:00:00.000Z",
    }, now)).toBe(true);
    expect(isProSubscriptionActive({
      plan: "pro",
      subscriptionExpiresAt: "2026-10-27T11:59:59.000Z",
    }, now)).toBe(false);
    expect(isProSubscriptionActive({ plan: "pro" }, now)).toBe(false);
    expect(isProSubscriptionActive({
      plan: "free",
      subscriptionExpiresAt: "2026-11-26T12:00:00.000Z",
    }, now)).toBe(false);
  });

  test("uses the highest legacy/current export counter to avoid resetting usage", () => {
    expect(getProfileExportCount({
      exportsUsed: 2,
      usage: { exportaciones: { usadas: 7 } },
    })).toBe(7);
  });

  test("calculates remaining quota and progress", () => {
    expect(getLimitProgress(191, 300)).toEqual({
      used: 191,
      limit: 300,
      remaining: 109,
      percent: (191 / 300) * 100,
    });
    expect(getLimitProgress(500, 300).percent).toBe(100);
    expect(getLimitProgress(500, 300).remaining).toBe(0);
  });
});
