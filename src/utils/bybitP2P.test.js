const {
  encryptCredentials,
  decryptCredentials,
  buildSignaturePayload,
  signRequest,
  extractItems,
  normalizeCompletedOrder,
} = require("../../lib/bybit-p2p");
const { calculateDashboardMetrics, getAccountingCryptoAmount } = require("./financialCalculations");
const {
  INITIAL_BACKFILL_VERSION,
  getInitialBackfillWindow,
  serializeBybitOperation,
  getBybitStoragePaths,
  findRelinkableExistingOperations,
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

  test.each([
    ["BUY", 0, "64.4", "0.92", "2026-11-04T12:00:00.000Z"],
    ["SELL", 1, "70", "1", "2026-11-04T13:00:00.000Z"],
  ])(
    "keeps Bybit %s commission at zero and does not adjust FIFO crypto quantity",
    (tradeSide, side, fiatAmount, price, timestamp) => {
      const imported = normalizeCompletedOrder({
        id: `BYBIT-${tradeSide}-FEE-ZERO-TEST`,
        side,
        tokenId: "USDT",
        notifyTokenId: "USDT",
        amount: fiatAmount,
        currencyId: "EUR",
        price,
        notifyTokenQuantity: "70",
        fee: "0",
        status: 50,
        createDate: String(new Date(timestamp).getTime()),
        orderType: "ORIGIN",
      });

      expect(imported).toMatchObject({
        source: "bybit_p2p",
        operation_type: tradeSide === "BUY" ? "Compra" : "Venta",
        crypto: "USDT",
        fiat: "EUR",
        crypto_amount: 70,
        fee: 0,
        fee_currency: null,
        sourceFee: 0,
      });
      expect(getAccountingCryptoAmount(imported)).toBeCloseTo(70, 10);

      const manualBuy = {
        id: `BYBIT-${tradeSide}-FIFO-BUY`,
        source: "manual",
        sessionId: null,
        operation_type: "Compra",
        crypto: "USDT",
        fiat: "EUR",
        crypto_amount: 70,
        fiat_amount: 64.4,
        timestamp: new Date("2026-11-04T11:00:00.000Z"),
      };
      const manualSale = {
        id: `BYBIT-${tradeSide}-FIFO-SALE`,
        source: "manual",
        sessionId: null,
        operation_type: "Venta",
        crypto: "USDT",
        fiat: "EUR",
        crypto_amount: 70,
        fiat_amount: 70,
        timestamp: new Date("2026-11-04T14:00:00.000Z"),
      };
      const operations = tradeSide === "BUY"
        ? [{ ...imported, id: imported.order_id }, manualSale]
        : [manualBuy, { ...imported, id: imported.order_id }];

      const metrics = calculateDashboardMetrics(
        operations,
        new Date("2026-11-05T00:00:00.000Z")
      );
      const saleId = tradeSide === "BUY" ? manualSale.id : imported.order_id;
      const saleResult = metrics.realizedProfitByOperation[saleId];

      expect(saleResult.matchedQuantity).toBeCloseTo(70, 10);
      expect(saleResult.matchedCost).toBeCloseTo(64.4, 10);
      expect(saleResult.matchedProceeds).toBeCloseTo(70, 10);
      expect(saleResult.profit).toBeCloseTo(5.6, 10);
      expect(saleResult.fullyMatched).toBe(true);
      expect(metrics.profitByCurrency.EUR).toBeCloseTo(5.6, 10);
      expect(metrics.closedSales).toBe(1);
    }
  );

  test("relinks an existing unassigned Bybit import when it receives a unique compatible session", () => {
    const operation = {
      order_id: "BYBIT-123",
      sessionId: "session-abc",
      sessionName: "USDT / VES",
      arbitrageType: "P2P entre plataformas",
    };
    const existingDocument = {
      id: "bybit-document-123",
      updateTime: "firestore-update-time",
      data: {
        source: "bybit_p2p",
        order_id: "BYBIT-123",
        sessionId: null,
        fiat_amount: 250,
      },
    };

    expect(findRelinkableExistingOperations(
      [operation],
      new Map([["BYBIT-123", [existingDocument]]])
    )).toEqual([{ existing: existingDocument, operation }]);
    // Relinking metadata is selected separately; financial values remain untouched.
    expect(existingDocument.data.fiat_amount).toBe(250);
  });

  test("never overwrites an existing session or links another provider's operation", () => {
    const operation = { order_id: "BYBIT-123", sessionId: "new-session" };
    const alreadyAssigned = {
      id: "already-assigned",
      data: { source: "bybit_p2p", order_id: "BYBIT-123", sessionId: "old-session" },
    };
    const anotherProvider = {
      id: "binance-document",
      data: { source: "binance_p2p", order_id: "BYBIT-123", sessionId: null },
    };

    expect(findRelinkableExistingOperations(
      [operation],
      new Map([["BYBIT-123", [alreadyAssigned, anotherProvider]]])
    )).toEqual([]);
  });

  test("does not relink an existing Bybit import when no compatible session was found", () => {
    const operation = { order_id: "BYBIT-123", sessionId: null };
    const existing = {
      id: "bybit-document-123",
      data: { source: "bybit_p2p", order_id: "BYBIT-123", sessionId: null },
    };

    expect(findRelinkableExistingOperations(
      [operation],
      new Map([["BYBIT-123", [existing]]])
    )).toEqual([]);
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
