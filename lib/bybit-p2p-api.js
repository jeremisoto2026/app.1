const crypto = require("crypto");
const {
  HttpError,
  sendJson,
  requirePost,
  requireFirebaseUser,
  getDocument,
  listDocumentsMatchingAnyField,
  listAllDocuments,
  commitWrites,
  createWrite,
  documentName,
  toFields,
  errorResponse,
} = require("./payments");
const {
  encryptCredentials,
  decryptCredentials,
  verifyCredentials,
  fetchOrderHistory,
  normalizeCompletedOrder,
} = require("./bybit-p2p");

function getBybitStoragePaths(uid, environment = process.env.VERCEL_ENV) {
  const preview = environment !== "production";
  return {
    preview,
    integrationPath: "users/" + uid + "/" +
      (preview ? "previewIntegrations" : "privateIntegrations") + "/bybitP2P",
    operationsPath: "users/" + uid + "/" +
      (preview ? "previewOperations" : "operations"),
  };
}
const isPreviewEnvironment = () => getBybitStoragePaths("").preview;
const integrationPathFor = (uid) => getBybitStoragePaths(uid).integrationPath;
const operationsPathFor = (uid) => getBybitStoragePaths(uid).operationsPath;
const guardPathFor = (uid) => "users/" + uid + "/" +
  (isPreviewEnvironment() ? "previewIntegrations" : "privateIntegrations") + "/bybitP2PConnectGuard";
const sessionsPathFor = (uid) => "users/" + uid + "/sessions";
const DAY_MS = 24 * 60 * 60 * 1000;
const INITIAL_BACKFILL_DAYS = 30;
const INITIAL_BACKFILL_MS = INITIAL_BACKFILL_DAYS * DAY_MS;
const INITIAL_BACKFILL_VERSION = 2;
const LOOKUP_CHUNK = 30;
const MAX_PAGES_PER_REQUEST = 2;
const LOCK_MS = 5 * 60 * 1000;

f¶»§q«^