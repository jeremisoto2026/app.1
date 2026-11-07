const {
  FREE_PLAN_LIMITS,
  getStoredPlanUsage,
  assertPlanAllows,
} = require("../../lib/plans");

describe("backend plan limits", () => {
  test("uses the product quotas: 300 registered orders and 150 arbitrages", () => {
    expect(FREE_PLAN_LIMITS).toEqual({
      orders: 300,
      arbitrages: 150,
      exports: 50,
    });
  });

  test("uses the higher of the new and legacy counters during migration", () => {
    expect(getStoredPlanUsage({
      registeredOrdersUsed: 12,
      movementsUsed: 19,
    }, "registeredOrdersUsed", ["movementsUsed"])).toBe(19);

    expect(getStoredPlanUsage({
      arbitragesUsed: 8,
      ordersUsed: 15,
    }, "arbitragesUsed", ["ordersUsed"])).toBe(15);
  });

  test("does not consume quota for an absent counter", () => {
    expect(getStoredPlanUsage({}, "registeredOrdersUsed", ["movementsUsed"])).toBe(0);
  });

  test("blocks a free account at each configured threshold", () => {
    expect(() => assertPlanAllows({ plan: "free" }, "orders", 300))
      .toThrow(/300 órdenes registradas/);
    expect(() => assertPlanAllows({ plan: "free" }, "arbitrages", 150))
      .toThrow(/150 arbitrajes/);
    expect(() => assertPlanAllows({ plan: "free" }, "exports", 50))
      .toThrow(/50 exportaciones/);
  });
});
