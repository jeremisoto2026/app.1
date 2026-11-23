const {
  DEFAULT_MIN_INTERVAL_MS,
  getRemainingCooldownMs,
} = require("../../lib/integration-rate-limit");

describe("per-user integration sync cooldown", () => {
  const now = Date.UTC(2026, 10, 5, 12, 0, 0);

  test("allows the first sync when there is no previous attempt", () => {
    expect(getRemainingCooldownMs(null, now)).toBe(0);
    expect(getRemainingCooldownMs(undefined, now)).toBe(0);
  });

  test("enforces the remaining part of the 15-second interval", () => {
    expect(getRemainingCooldownMs(new Date(now - 5000), now)).toBe(10000);
    expect(getRemainingCooldownMs(new Date(now - 14999), now)).toBe(1);
  });

  test("allows another sync exactly at the interval boundary", () => {
    expect(getRemainingCooldownMs(new Date(now - DEFAULT_MIN_INTERVAL_MS), now)).toBe(0);
  });

  test("allows another sync after the interval has elapsed", () => {
    expect(getRemainingCooldownMs(new Date(now - 60000), now)).toBe(0);
  });

  test("accepts Firestore Timestamp-like values", () => {
    const timestamp = { toDate: () => new Date(now - 7000) };
    expect(getRemainingCooldownMs(timestamp, now)).toBe(8000);
  });

  test("fails closed briefly when the stored timestamp is in the future", () => {
    expect(getRemainingCooldownMs(new Date(now + 60000), now)).toBe(DEFAULT_MIN_INTERVAL_MS);
  });

  test("ignores malformed timestamps and invalid interval settings", () => {
    expect(getRemainingCooldownMs("not-a-date", now)).toBe(0);
    expect(getRemainingCooldownMs(new Date(now), now, 0)).toBe(0);
  });
});
