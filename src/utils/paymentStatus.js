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

/**
 * Returns the status that should be shown to the user.
 * Expiry is derived from expiresAt instead of changing the stored payment,
 * so a transfer included before expiry can still be verified afterward.
 */
export const getEffectivePaymentStatus = (payment = {}, now = Date.now()) => {
  const status = String(payment.status || "").toLowerCase();
  if (status !== "pending") return status;

  const expiresAt = getTimestampMillis(payment.expiresAt);
  if (Number.isFinite(expiresAt) && now >= expiresAt) return "expired";
  return status || "pending";
};

/**
 * Expired orders are hidden in the compact history by default, but remain
 * stored and can be revealed on demand for audit/support purposes.
 */
export const getVisiblePaymentHistory = (payments = [], now = Date.now(), showExpired = false) => {
  const history = Array.isArray(payments) ? payments : [];
  if (showExpired) return history;
  return history.filter((payment) => getEffectivePaymentStatus(payment, now) !== "expired");
};
