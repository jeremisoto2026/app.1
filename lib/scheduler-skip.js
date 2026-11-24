function getSchedulerSkipReason(outcome) {
  const statusCode = Number(outcome?.statusCode);
  const message = String(outcome?.body?.error || "");

  if (statusCode === 409 && /ya hay una sincronización.*en curso/i.test(message)) {
    return "sync_in_progress";
  }
  if (statusCode === 429 && /has solicitado una sincronización hace muy poco/i.test(message)) {
    return "recent_sync_cooldown";
  }
  return "";
}

module.exports = { getSchedulerSkipReason };
