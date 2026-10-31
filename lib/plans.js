const { HttpError } = require("./payments");

const FREE_PLAN_LIMITS = Object.freeze({
  orders: 300,
  movements: 150,
  exports: 50,
});

function timestampMillis(value) {
  if (value && typeof value.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date ? date.getTime() : Number.NaN;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) return Date.parse(value);
  return Number.NaN;
}

function isProSubscriptionActive(profile = {}, now = Date.now()) {
  const plan = String(profile.plan || "").toLowerCase();
  const expiresAt = timestampMillis(profile.subscriptionExpiresAt);
  return (plan === "pro" || plan === "premium") &&
    Number.isFinite(expiresAt) && expiresAt > now;
}

function getExportCount(profile = {}) {
  const candidates = [
    profile.exportsUsed,
    profile.usage?.exportaciones?.usadas,
    profile.usage?.exportsUsed,
    profile.usage?.exportaciones?.exportsUsed,
  ].map((value) => Number(value)).filter((value) => Number.isFinite(value) && value >= 0);
  return candidates.length ? Math.max(...candidates) : 0;
}

function assertPlanAllows(profile, resource, currentCount) {
  if (isProSubscriptionActive(profile)) return;
  const limit = FREE_PLAN_LIMITS[resource];
  if (!Number.isFinite(limit)) throw new Error("El límite solicitado no existe.");
  if (currentCount >= limit) {
    const labels = {
      orders: "órdenes",
      movements: "arbitrajes registrados",
      exports: "exportaciones",
    };
    throw new HttpError(
      403,
      "Has alcanzado el límite del plan gratuito (" + limit + " " + labels[resource] +
      "). Pásate a JJXCAPITAL Pro para usar esta función sin límites durante 30 días."
    );
  }
}

module.exports = {
  FREE_PLAN_LIMITS,
  timestampMillis,
  isProSubscriptionActive,
  getExportCount,
  assertPlanAllows,
};
