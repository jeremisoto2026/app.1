const {
  encryptCredentials,
  decryptCredentials,
  buildSignaturePayload,
  signRequest,
  extractItems,
  normalizeCompletedOrder,
} = require("../../lib/bybit-p2p");
const {
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
    const order = { id: "123", status: 50 };
    expect(extractItems({ result: { items: [order] } })).toEqual([order]);
    expect(extractItems({ data: { items: [order] } })).toEqual([order]);
  });

  test("starts the initial import at the exact API connection time, including legacy connections", () => {
    const connectionTime = Date.UTC(2026, 10, 3, 0, 25, 0);
    const now = connectionTime + 60_000;
    const window = getInitialBackfillWindow({
      initialBackfillComplete: true,
      initialBackfillVersion: 2,
      backfillStartTimestamp: connectionTime - 30 * 24 * 60 * 60 * 1000,
      backfillEndTimestamp: connectionTime,
    }, connectionTime, now);

    expect(window).toEqual({
      needsReset: true,
      beginTime: connectionTime,
      endTime: now,
      page: 1,
    });
  });

  test("preserves pagination while continuing the initial import from connection time", () => {
    const connectionTime = Date.UTC(2026, 10, 3, 0, 25, 0);
    const end = connectionTime + 60_000;
    const window = getInitialBackfillWindow({
      initialBackfillVersion: INITIAL_BACKFILL_VERSION,
      backfillStartTimestamp: connectionTime,
      backfillEndTimestamp: end,
      nextPage: 3,
    }, connectionTime, end + 10_000);

    expect(window).toEqual({
      needsReset: false,
      beginTime: connectionTime,
      endTime: end,
      page: 3,
    });
  });

  test("never moves a saved import window earlier than the current connection time", () => {
    const connectionTime = Date.UTC(2026, 10, 3, 0, 25, 0);
    const end = connectionTime + 60_000;
    const window = getInitialBackfillWindow({
      initialBackfillVersion: INITIAL_BACKFILL_VERSION,
      backfillStartTimestamp: connectionTime - 30 * 24 * 60 * 60 * 1000,
      backfillEndTimestamp: end,
      nextPage: 2,
    }, connectionTime, end + 10_000);

    expect(window.beginTime).toBe(connectionTime);
    expect(window.endTime).toBe(end);
    expect(window.page).toBe(2);
  });

  test("normalizes Bybit fiat total and token quantity separately", () => {
    const normalized = normalizeCompletedOrder({
      id: "1899742990873296896",
      side: 1,
      tokenId: "USDT",
      notifyTokenId: "USDT",
      amount: "64.400",
      currencyId: "EUR",
      price: "0.920",
      notifyTokenQuantity: "70.0000",
      fee: "0",
      status: 50,
      createDate: "1741769000000",
      orderType: "ORIGIN",
    });

    expect(normalized).toMatchObject({
      order_id: "BYBIT-1899742990873296896",
      source: "bybit_p2p",
      exchange: "Bybit",
      operation_type: "Venta",
      crypto: "USDT",
      fiat: "EUR",
      crypto_amount: 70,
      fiat_amount: 64.4,
      exchange_rate: 0.92,
      fee: 0,
      fee_currency: null,
    });
    expect(normalized.timestamp).toBeInstanceOf(Date);
  });

  test("keeps Preview and Production integrations and operations in separate Firestore paths", () => {
    expect(getBybitStoragePaths("user-123", "preview")).toEqual({
      preview: true,
      integrationPath: "users/user-123/previewIntegrations/bybitP2P",
      operationsPath: "users/user-123/previewOperations",
    });
    expect(getBybitStoragePaths("user-123", "production")).toEqual({
      preview: false,
      integrationPath: "users/user-123/privateIntegrations/bybitP2P",
      operationsPath: "users/user-123/operations",
    });
  });

  test("serializes only safe Bybit operation fields for the profile viewer", () => {
    const serialized = serializeBybitOperation({
      id: "bybit-p2p-document",
      data: {
        source: "bybit_p2p",
        order_id: "BYBIT-123",
        sourceOrderId: "123",
        operation_type: "Venta",
        crypto: "USDT",
        fiat: "EUR",
        crypto_amount: 70,
        fiat_amount: 64.4,
        exchange_rate: 0.92,
        timestamp: new Date("2026-11-03T00:25:00.000Z"),
        sessionName: "Bybit P2P · Importado",
        sessionId: null,
        encryptedCredentials: "must-not-leak",
      },
    });

    expect(serialized).toEqual({
      id: "bybit-p2p-document",
      orderId: "BYBIT-123",
      operationType: "Venta",
      crypto: "USDT",
      fiat: "EUR",
      cryptoAmount: 70,
      fiatAmount: 64.4,
      exchangeRate: 0.92,
      timestamp: "2026-11-03T00:25:00.000Z",
      sessionName: "Bybit P2P · Importado",
      sessionId: null,
    });
    expect(JSON.stringify(serialized)).not.toContain("must-not-leak");
  });

  test("ignores unfinished or malformed orders", () => {
    expect(normalizeCompletedOrder({ id: "1", side: 1, status: 40 })).toBeNull();
    expect(normalizeCompletedOrder({ id: "2", side: 7, status: 50 })).toBeNull();
  });
});
