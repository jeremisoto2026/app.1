const {
  encryptCredentials,
  decryptCredentials,
  buildSignaturePayload,
  signRequest,
  extractItems,
  normalizeCompletedOrder,
} = require("../../lib/bybit-p2p");
const {
  INITIAL_BACKFILL_DAYS,
  INITIAL_BACKFILL_VERSION,
  getInitialBackfillWindow,
  serializeBybitOperation,
  getBybitStoragePaths,
} = require("../../lib/bybit-p2p-api");

describe("Bybit P2P connector", () => {
  const previousKey = process.env.BYBIT_P2P_ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.BYBIT_P2P_ENCRYPTION_KEY = "a".repeat(64);
  });

  afterAll(() => {
    if (previousKey === undefined) delete process.env.BYBIT_P2P_ENCRYPTION_KEY;
    else process.env.BYBIT_P2P_ENCRYPTION_KEY = previousKey;
  });

  test("encrypts and decrypts credentials without storing plaintext", () => {
    const credentials = { apiKey: "bybit-api-key", apiSecret: "bybit-api-secret" };
    const encrypted = encryptCredentials(credentials);
    expect(JSON.stringify(encrypted)).not.toContain(credentials.apiKey);
    expect(JSON.stringify(encrypted)).not.toContain(credentials.apiSecret);
    expect(decryptCredentials(encrypted)).toEqual(credentials);
  });

  test("builds the documented HMAC signature payload", () => {
    expect(buildSignaturePayload("123", "api", "5000", '{"page":1}'))
      .toBe('123api5000{"page":1}');
    expect(signRequest("123", "api", "secret", "5000", '{"page":1}'))
      .toMatch(/^[a-f0-9]{64}$/);
  });

  test("extracts orders from the official P2P response shape", () => {
    c¶»§q«^