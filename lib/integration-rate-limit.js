const DEFAULT_MIN_INTERVAL_MS = 15 * 1000;

function toTimestamp(value) {
  try {
    if (value instanceof Date) {
      return Number.isFinite(value.getTime()) ? value.getTime() : null;
    }
    if (value && typeof value.toDate === "function") {
      const date = value.toDate();
      return date instanceof Date && Number.isFinite(date.getTime()) ? date.getTime() : null;
    }
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string" && value.trim()) {
      const timestamp = Date.parse(value);
      return Number.isFinite(timestamp) ? timestamp : null;
    }
  } catch {
    return null;
  }
  return null;
}

function getRemainingCooldownMs(
  lastAttemptAt,
  now = Date.now(),
  minimumIntervalMs = DEFAULT_MIN_INTERVAL_MS
) {
  const lastTimestamp = toTimestamp(lastAttemptAt);
  const nowTimestamp = now instanceof Date ? now.getTime() : Number(now);
  const interval = Number(minimumIntervalMs);

  if (lastTimestamp === null || !Number.isFinite(nowTimestamp) ||
      !Number.isFinite(interval) || interval <= 0) {
    return 0;
  }

  const elapsed = nowTimestamp - lastTimestamp;
  // A future stored timestamp is treated conservatively rather than bypassing the limit.
  if (elapsed < 0) return interval;
  return Math.max(0, interval - elapsed);
}

module.exports = {
  DEFAULT_MIN_INTERVAL_MS,
  getRemainingCooldownMs,
};
