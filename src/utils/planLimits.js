export const FREE_PLAN_LIMITS = Object.freeze({
  orders: 300,
  movements: 150,
  exports: 50,
});

export const getProfileExportCount = (profile = {}) => {
  const candidates = [
    profile.exportsUsed,
    profile.usage?.exportaciones?.usadas,
    profile.usage?.exportsUsed,
    profile.usage?.exportaciones?.exportsUsed,
  ].map((value) => Number(value)).filter((value) => Number.isFinite(value) && value >= 0);
  return candidates.length ? Math.max(...candidates) : 0;
};

const getTimestampMillis = (value) => {
  if (value && typeof value.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date ? date.getTime() : Number.NaN;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) return Date.parse(value);
  return Number.NaN;
};

export const isProSubscriptionActive = (profile = {}, now = Date.now()) => {
  const plan = String(profile.plan || "").toLowerCase();
  const expiresAt = getTimestampMillis(profile.subscriptionExpiresAt);
  return (plan === "pro" || plan === "premium") &&
    Number.isFinite(expiresAt) && expiresAt > now;
};

export const getLimitProgress = (used, limit) => {
  const current = Math.max(0, Number(used) || 0);
  const maximum = Math.max(1, Number(limit) || 1);
  return {
    used: current,
    limit: maximum,
    remaining: Math.max(0, maximum - current),
    percent: Math.min(100, (current / maximum) * 100),
  };
};
