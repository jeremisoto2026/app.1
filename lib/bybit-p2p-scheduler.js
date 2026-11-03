const crypto = require("crypto");
const {
  HttpError,
  sendJson,
  getDocument,
  listConnectedBybitP2PIntegrations,
  commitWrites,
  createWrite,
  errorResponse,
} = require("./payments");
const { verifyGitHubActionsOidcToken } = require("./github-actions-oidc");
const SCHEDULER_STATE_PATH = "systemJobs/bybitP2PBackgroundSync";
const LOCK_MS = 4 * 60 * 1000;
const MAX_USERS_PER_REQUEST = 1;
const QUERY_LIMIT = 25;

function matchesExternalSchedulerSecret(req) {
  const expected = String(process.env.BYBIT_P2P_SCHEDULER_SECRET || "");
  const provided = String(
    req.headers?.["x-jjxcapital-scheduler-token"] ||
    req.headers?.["X-JJXCapital-Scheduler-Token"] ||
    ""
  );

  if (Buffer.byteLength(expected, "utf8") < 32 || !provided ||
      Buffer.byteLength(provided, "utf8") !== Buffer.byteLength(expected, "utf8")) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"));
}

async function releaseSchedulerLock(lockId, updates = {}) {
  try {
    const latest = await getDocument(SCHEDULER_STATE_PATH);
    if (!latest || latest.data?.schedulerLockId !== lockId) return;
    await commitWrites([createWrite(SCHEDULER_STATE_PATH, {
      ...updates,
      schedulerLockId: null,
      schedulerLockExpiresAt: new Date(0),
    }, latest.updateTime ? { updateTime: latest.updateTime } : { exists: true })]);
  } catch (error) {
    console.error("Bybit P2P scheduler lock release failed:", error?.message || "unknown_err¶»§q«^