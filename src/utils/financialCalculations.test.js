import {
  calculateCryptoArbitrage,
  calculateArbitrageSessionResult,
  calculateArbitrageSessionBalances,
  calculateDashboardMetrics,
  calculateDashboardSummaryMetrics,
  calculateOperationAmounts,
} from "./financialCalculations";

describe("calculateOperationAmounts", () => {
  test("applies a purchase fee in crypto, not in fiat", () => {
    expect(calculateOperationAmounts({
      operation_type: "Compra",
      amount: 100,
      exchange_rate: 10,
      fee: 0.2,
      crypto: "USDT",
      fiat: "EUR",
    })).toEqual({
      crypto_amount: 9.8,
      fiat_amount: 100,
      exchange_rate: 10,
      fee: 0.2,
      fee_currency: "USDT",
    });
  });

  test("applies a sale fee in fiat", () => {
    expect(calculateOperationAmounts({
      operation_type: "Venta",
      amount: 2,
      exchange_rate: 12,
      fee: 1,
      crypto: "USDT",
      fiat: "EUR",
    })).toEqual({
      crypto_amount: 2,
      fiat_amount: 23,
      exchange_rate: 12,
      fee: 1,
      fee_currency: "EUR",
    });
  });

  test("rejects using the same asset as both crypto and quote currency", () => {
    expect(() => calculateOperationAmounts({
      operation_type: "Compra",
      amount: 100,
      exchange_rate: 1,
      fee: 0,
      crypto: "USDT",
      fiat: "USDT",
    })).toThrow(/deben ser distintas/i);
  });

  test("rejects negative fees and rates that are zero", () => {
    expect(() => calculateOperationAmounts({
      operation_type: "Venta",
      amount: 2,
      exchange_rate: 0,
      fee: 0,
      crypto: "USDT",
      fiat: "EUR",
    })).toThrow(/tasa de cambio/i);

    expect(() => calculateOperationAmounts({
      operation_type: "Compra",
      amount: 100,
      exchange_rate: 10,
      fee: -1,
      crypto: "USDT",
      fiat: "EUR",
    })).toThrow(/comisión/i);
  });

  test("rejects a fee that consumes the whole received amount", () => {
    expect(() => calculateOperationAmounts({
      operation_type: "Venta",
      amount: 1,
      exchange_rate: 10,
      fee: 10,
      crypto: "USDT",
      fiat: "EUR",
    })).toThrow(/superar/i);
  });
});

describe("calculateDashboardMetrics", () => {
  const operation = (overrides) => ({
    crypto: "USDT",
    fiat: "EUR",
    timestamp: new Date("2026-10-01T12:00:00.000Z"),
    ...overrides,
  });

  test("calculates realized P&L using FIFO and not crypto totals", () => {
    const operations = [
      operation({ id: "buy-1", operation_type: "Compra", crypto_amount: 10, fiat_amount: 100 }),
      operation({ id: "sale-1", operation_type: "Venta", crypto_amount: 4, fiat_amount: 60, timestamp: new Date("2026-10-05T12:00:00.000Z") }),
      operation({ id: "buy-2", operation_type: "Compra", crypto_amount: 5, fiat_amount: 75, timestamp: new Date("2026-10-06T12:00:00.000Z") }),
      operation({ id: "sale-2", operation_type: "Venta", crypto_amount: 8, fiat_amount: 112, timestamp: new Date("2026-10-07T12:00:00.000Z") }),
    ];

    const result = calculateDashboardMetrics(operations, new Date("2026-10-22T12:00:00.000Z"));
    expect(result.profitByCurrency.EUR).toBeCloseTo(42, 8);
    expect(result.monthlyProfitByCurrency.EUR).toBeCloseTo(42, 8);
    expect(result.closedSales).toBe(2);
    expect(result.winningSales).toBe(2);
    expect(result.successRate).toBe(100);
    expect(result.realizedProfitByOperation["sale-1"].profit).toBeCloseTo(20, 8);
    expect(result.realizedProfitByOperation["sale-1"].matchedCost).toBeCloseTo(40, 8);
    expect(result.realizedProfitByOperation["sale-1"].matchedProceeds).toBeCloseTo(60, 8);
    expect(result.realizedProfitByOperation["sale-1"].fullyMatched).toBe(true);
    expect(result.realizedProfitByOperation["sale-2"].profit).toBeCloseTo(22, 8);
    expect(result.realizedProfitByOperation["sale-2"].matchedCost).toBeCloseTo(90, 8);
    expect(result.realizedProfitByOperation["sale-2"].matchedProceeds).toBeCloseTo(112, 8);
    expect(result.realizedProfitByOperation["sale-2"].fullyMatched).toBe(true);
  });

  test("never matches a sale with inventory from a different arbitrage session", () => {
    const operations = [
      operation({ id: "session-a-buy", sessionId: "session-a", operation_type: "Compra", crypto_amount: 10, fiat_amount: 100 }),
      operation({ id: "session-b-sale", sessionId: "session-b", operation_type: "Venta", crypto_amount: 2, fiat_amount: 30, timestamp: new Date("2026-10-02T12:00:00.000Z") }),
      operation({ id: "session-a-sale", sessionId: "session-a", operation_type: "Venta", crypto_amount: 2, fiat_amount: 24, timestamp: new Date("2026-10-03T12:00:00.000Z") }),
    ];

    const result = calculateDashboardMetrics(operations, new Date("2026-10-22T12:00:00.000Z"));
    expect(result.realizedProfitByOperation["session-b-sale"].matchedQuantity).toBe(0);
    expect(result.realizedProfitByOperation["session-a-sale"].matchedQuantity).toBeCloseTo(2, 8);
    expect(result.realizedProfitByOperation["session-a-sale"].profit).toBeCloseTo(4, 8);
    expect(result.profitByCurrency.EUR).toBeCloseTo(4, 8);
    expect(result.closedSales).toBe(1);
  });

  test("keeps fiat currencies separate instead of adding unlike amounts", () => {
    const operations = [
      operation({ operation_type: "Compra", crypto: "BTC", fiat: "EUR", crypto_amount: 1, fiat_amount: 100 }),
      operation({ operation_type: "Venta", crypto: "BTC", fiat: "EUR", crypto_amount: 1, fiat_amount: 120, timestamp: new Date("2026-10-02T12:00:00.000Z") }),
      operation({ operation_type: "Compra", crypto: "BTC", fiat: "USD", crypto_amount: 1, fiat_amount: 200, timestamp: new Date("2026-10-03T12:00:00.000Z") }),
      operation({ operation_type: "Venta", crypto: "BTC", fiat: "USD", crypto_amount: 1, fiat_amount: 210, timestamp: new Date("2026-10-04T12:00:00.000Z") }),
    ];

    const result = calculateDashboardMetrics(operations, new Date("2026-10-22T12:00:00.000Z"));
    expect(result.profitByCurrency).toEqual({ EUR: 20, USD: 10 });
  });

  test("reports only the matched part when a sale exceeds known inventory", () => {
    const operations = [
      operation({ id: "buy-part", operation_type: "Compra", crypto_amount: 1, fiat_amount: 100 }),
      operation({ id: "sale-part", operation_type: "Venta", crypto_amount: 2, fiat_amount: 240, timestamp: new Date("2026-10-02T12:00:00.000Z") }),
    ];

    const result = calculateDashboardMetrics(operations, new Date("2026-10-22T12:00:00.000Z"));
    expect(result.realizedProfitByOperation["sale-part"].profit).toBeCloseTo(20, 8);
    expect(result.realizedProfitByOperation["sale-part"].matchedQuantity).toBeCloseTo(1, 8);
    expect(result.realizedProfitByOperation["sale-part"].matchedCost).toBeCloseTo(100, 8);
    expect(result.realizedProfitByOperation["sale-part"].matchedProceeds).toBeCloseTo(120, 8);
    expect(result.realizedProfitByOperation["sale-part"].soldQuantity).toBeCloseTo(2, 8);
    expect(result.realizedProfitByOperation["sale-part"].fullyMatched).toBe(false);
    expect(result.closedSales).toBe(0);
    expect(result.profitByCurrency.EUR).toBeCloseTo(20, 8);
  });

  test("excludes sales with missing cost basis from win rate", () => {
    const operations = [
      operation({ operation_type: "Venta", crypto_amount: 1, fiat_amount: 20 }),
    ];

    const result = calculateDashboardMetrics(operations, new Date("2026-10-22T12:00:00.000Z"));
    expect(result.profitByCurrency).toEqual({});
    expect(result.closedSales).toBe(0);
    expect(result.successRate).toBe(0);
  });

  test("does not place undated operations in the current month", () => {
    const operations = [
      operation({ operation_type: "Compra", crypto_amount: 1, fiat_amount: 10, timestamp: null }),
      operation({ operation_type: "Venta", crypto_amount: 1, fiat_amount: 20, timestamp: null }),
    ];

    const result = calculateDashboardMetrics(operations, new Date("2026-10-22T12:00:00.000Z"));
    expect(result.totalOperations).toBe(2);
    expect(result.profitByCurrency).toEqual({});
    expect(result.monthlyProfitByCurrency).toEqual({});
  });

  test("calculates a losing closed sale as a loss, not a 0% success", () => {
    const operations = [
      operation({ operation_type: "Compra", crypto_amount: 2, fiat_amount: 20 }),
      operation({ operation_type: "Venta", crypto_amount: 2, fiat_amount: 18, timestamp: new Date("2026-10-02T12:00:00.000Z") }),
    ];

    const result = calculateDashboardMetrics(operations, new Date("2026-10-22T12:00:00.000Z"));
    expect(result.profitByCurrency.EUR).toBeCloseTo(-2, 8);
    expect(result.closedSales).toBe(1);
    expect(result.winningSales).toBe(0);
    expect(result.successRate).toBe(0);
  });
});

test("keeps USD dollars and USDT stablecoin profits in separate totals", () => {
  const operations = [
    { id: "usd-buy", crypto: "BTC", fiat: "USD", operation_type: "Compra", crypto_amount: 1, fiat_amount: 100, timestamp: new Date("2026-10-01T10:00:00Z") },
    { id: "usd-sell", crypto: "BTC", fiat: "USD", operation_type: "Venta", crypto_amount: 1, fiat_amount: 110, timestamp: new Date("2026-10-02T10:00:00Z") },
    { id: "usdt-buy", crypto: "ETH", fiat: "USDT", operation_type: "Compra", crypto_amount: 1, fiat_amount: 200, timestamp: new Date("2026-10-03T10:00:00Z") },
    { id: "usdt-sell", crypto: "ETH", fiat: "USDT", operation_type: "Venta", crypto_amount: 1, fiat_amount: 210, timestamp: new Date("2026-10-04T10:00:00Z") },
  ];

  const result = calculateDashboardMetrics(operations, new Date("2026-10-22T12:00:00.000Z"));
  expect(result.profitByCurrency).toEqual({ USD: 10, USDT: 10 });
  expect(result.profitByCurrency.USD).not.toBe(result.profitByCurrency.USDT * 2);
});


describe("calculateArbitrageSessionResult", () => {
  const date = new Date("2026-10-01T12:00:00.000Z");

  test("calculates fiat-base profit and ROI using only the session asset pair", () => {
    const session = { id: "session-a", fiat: "EUR", crypto: "USDT", initialCapitalType: "fiat", initialCapitalCurrency: "EUR", initialCapital: 100 };
    const operations = [
      { id: "buy", sessionId: "session-a", crypto: "USDT", fiat: "EUR", operation_type: "Compra", crypto_amount: 10, fiat_amount: 100, timestamp: date },
      { id: "sell", sessionId: "session-a", crypto: "USDT", fiat: "EUR", operation_type: "Venta", crypto_amount: 10, fiat_amount: 110, timestamp: new Date("2026-10-02T12:00:00.000Z") },
      { id: "other-pair", sessionId: "session-a", crypto: "USDC", fiat: "EUR", operation_type: "Venta", crypto_amount: 100, fiat_amount: 1000, timestamp: new Date("2026-10-03T12:00:00.000Z") },
      { id: "other-session", sessionId: "session-b", crypto: "USDT", fiat: "EUR", operation_type: "Venta", crypto_amount: 10, fiat_amount: 130, timestamp: new Date("2026-10-04T12:00:00.000Z") },
    ];

    expect(calculateArbitrageSessionResult(session, operations)).toMatchObject({
      profit: 10, initialCapital: 100, roi: 10, baseCurrency: "EUR", isCryptoBase: false, operationCount: 2,
    });
  });

  test("calculates crypto-base profit and ROI in crypto units", () => {
    const session = { id: "crypto-session", fiat: "EUR", crypto: "BTC", initialCapitalType: "crypto", initialCapitalCurrency: "BTC", initialCapital: 1 };
    const operations = [
      { sessionId: "crypto-session", crypto: "BTC", fiat: "EUR", operation_type: "Venta", crypto_amount: 1, fiat_amount: 100, timestamp: date },
      { sessionId: "crypto-session", crypto: "BTC", fiat: "EUR", operation_type: "Compra", crypto_amount: 1.1, fiat_amount: 99, timestamp: new Date("2026-10-02T12:00:00.000Z") },
    ];

    const result = calculateArbitrageSessionResult(session, operations);
    expect(result.profit).toBeCloseTo(0.1, 8);
    expect(result.roi).toBeCloseTo(10, 8);
    expect(result).toMatchObject({
      initialCapital: 1, baseCurrency: "BTC", isCryptoBase: true, operationCount: 2,
    });
  });

  test("does not invent an ROI when no initial capital was provided", () => {
    expect(calculateArbitrageSessionResult({ fiat: "EUR", crypto: "USDT" }, [])).toMatchObject({
      profit: 0, initialCapital: 0, roi: null, baseCurrency: "EUR", isCryptoBase: false,
    });
    expect(calculateArbitrageSessionResult({ fiat: "EUR", crypto: "USDT", initialCapital: 0 }, [])).toMatchObject({
      profit: 0, initialCapital: 0, roi: 0, baseCurrency: "EUR", isCryptoBase: false,
    });
  });
});


describe("calculateArbitrageSessionBalances", () => {
  test("tracks balances and keeps the last operation type as the default", () => {
    const session = { id: "fiat-session", initialCapitalType: "fiat", initialCapital: 100, fiat: "EUR", crypto: "USDT" };
    expect(calculateArbitrageSessionBalances(session, [])).toMatchObject({
      fiatBalance: 100, cryptoBalance: 0, nextOperationType: "Compra", operationCount: 0,
    });
    const afterBuy = calculateArbitrageSessionBalances(session, [
      { id: "buy", sessionId: "fiat-session", operation_type: "Compra", fiat: "EUR", crypto: "USDT", fiat_amount: 100, crypto_amount: 9.8, timestamp: new Date("2026-10-01T10:00:00.000Z") },
    ]);
    expect(afterBuy).toMatchObject({ fiatBalance: 0, cryptoBalance: 9.8, nextOperationType: "Compra", operationCount: 1 });
    const afterSell = calculateArbitrageSessionBalances(session, [
      { id: "buy", sessionId: "fiat-session", operation_type: "Compra", fiat: "EUR", crypto: "USDT", fiat_amount: 100, crypto_amount: 9.8, timestamp: new Date("2026-10-01T10:00:00.000Z") },
      { id: "sell", sessionId: "fiat-session", operation_type: "Venta", fiat: "EUR", crypto: "USDT", fiat_amount: 107.8, crypto_amount: 9.8, timestamp: new Date("2026-10-01T10:05:00.000Z") },
    ]);
    expect(afterSell).toMatchObject({ fiatBalance: 107.8, cryptoBalance: 0, nextOperationType: "Venta", operationCount: 2 });
  });
  test("supports a partial sale followed by another sale in the same direction", () => {
    const session = { id: "partial-sales", initialCapitalType: "fiat", initialCapital: 500, fiat: "EUR", crypto: "USDT" };
    const operations = [
      { id: "buy", sessionId: "partial-sales", operation_type: "Compra", fiat: "EUR", crypto: "USDT", fiat_amount: 500, crypto_amount: 581.3953488372093, timestamp: new Date("2026-10-01T10:00:00.000Z") },
      { id: "sell-first", sessionId: "partial-sales", operation_type: "Venta", fiat: "EUR", crypto: "USDT", fiat_amount: 180, crypto_amount: 200, timestamp: new Date("2026-10-01T10:05:00.000Z") },
      { id: "sell-second", sessionId: "partial-sales", operation_type: "Venta", fiat: "EUR", crypto: "USDT", fiat_amount: 90, crypto_amount: 100, timestamp: new Date("2026-10-01T10:10:00.000Z") },
    ];
    expect(calculateArbitrageSessionBalances(session, operations)).toMatchObject({
      fiatBalance: 270, cryptoBalance: 281.3953488372093, nextOperationType: "Venta", operationCount: 3,
    });
  });

  test("tracks the net movement of sessions without an initial capital", () => {
    const session = { id: "manual-session", initialCapitalType: "fiat", fiat: "EUR", crypto: "USDT" };
    expect(calculateArbitrageSessionBalances(session, [])).toMatchObject({
      fiatBalance: 0, cryptoBalance: 0, nextOperationType: "Compra", operationCount: 0,
    });
    const operations = [
      { id: "buy", sessionId: "manual-session", operation_type: "Compra", fiat: "EUR", crypto: "USDT", fiat_amount: 50, crypto_amount: 55, timestamp: new Date("2026-10-01T10:00:00.000Z") },
      { id: "sell-part", sessionId: "manual-session", operation_type: "Venta", fiat: "EUR", crypto: "USDT", fiat_amount: 33, crypto_amount: 30, timestamp: new Date("2026-10-01T10:05:00.000Z") },
    ];
    expect(calculateArbitrageSessionBalances(session, operations)).toMatchObject({
      fiatBalance: -17, cryptoBalance: 25, nextOperationType: "Venta", operationCount: 2,
    });
    expect(calculateArbitrageSessionResult(session, operations)).toMatchObject({ roi: null, baseCurrency: "EUR" });
  });

  test("starts crypto-funded sessions with a sale and ignores other sessions", () => {
    const session = { id: "crypto-session", initialCapitalType: "crypto", initialCapital: 2, fiat: "EUR", crypto: "BTC" };
    expect(calculateArbitrageSessionBalances(session, [])).toMatchObject({
      fiatBalance: 0, cryptoBalance: 2, nextOperationType: "Venta",
    });
    const afterSale = calculateArbitrageSessionBalances(session, [
      { id: "other-buy", sessionId: "other-session", operation_type: "Compra", fiat: "EUR", crypto: "BTC", fiat_amount: 999, crypto_amount: 999 },
      { id: "sale", sessionId: "crypto-session", operation_type: "Venta", fiat: "EUR", crypto: "BTC", fiat_amount: 40, crypto_amount: 2, timestamp: new Date("2026-10-01T10:00:00.000Z") },
    ]);
    expect(afterSale).toMatchObject({ fiatBalance: 40, cryptoBalance: 0, nextOperationType: "Venta", operationCount: 1 });
  });
});

describe("calculateDashboardSummaryMetrics", () => {
  test("includes crypto-start session profit in crypto units without mixing it into fiat FIFO", () => {
    const operations = [
      { id: "crypto-sale", sessionId: "crypto-session", crypto: "BTC", fiat: "EUR", operation_type: "Venta", crypto_amount: 1, fiat_amount: 100, timestamp: new Date("2026-10-01T12:00:00.000Z") },
      { id: "crypto-buy", sessionId: "crypto-session", crypto: "BTC", fiat: "EUR", operation_type: "Compra", crypto_amount: 1.1, fiat_amount: 99, timestamp: new Date("2026-10-02T12:00:00.000Z") },
      { id: "fiat-buy", sessionId: "fiat-session", crypto: "USDT", fiat: "EUR", operation_type: "Compra", crypto_amount: 10, fiat_amount: 100, timestamp: new Date("2026-10-01T12:00:00.000Z") },
      { id: "fiat-sale", sessionId: "fiat-session", crypto: "USDT", fiat: "EUR", operation_type: "Venta", crypto_amount: 10, fiat_amount: 110, timestamp: new Date("2026-10-02T12:00:00.000Z") },
    ];
    const sessions = [
      { id: "crypto-session", fiat: "EUR", crypto: "BTC", initialCapitalType: "crypto", initialCapitalCurrency: "BTC", initialCapital: 1, status: "closed" },
      { id: "fiat-session", fiat: "EUR", crypto: "USDT", initialCapitalType: "fiat", initialCapitalCurrency: "EUR", initialCapital: 100 },
    ];

    const result = calculateDashboardSummaryMetrics(operations, sessions, new Date("2026-10-22T12:00:00.000Z"));

    expect(result.profitByCurrency.BTC).toBeCloseTo(0.1, 8);
    expect(result.profitByCurrency.EUR).toBeCloseTo(10, 8);
    expect(result.monthlyProfitByCurrency.BTC).toBeCloseTo(0.1, 8);
    expect(result.monthlyProfitByCurrency.EUR).toBeCloseTo(10, 8);
    expect(result.totalOperations).toBe(4);
    expect(result.closedSales).toBe(2);
    expect(result.winningSales).toBe(2);
    expect(result.successRate).toBe(100);
  });

  test("counts completed crypto cycles in active sessions and ignores incomplete cycles", () => {
    const operations = [
      { id: "loss-sale", sessionId: "crypto-loss", crypto: "BTC", fiat: "EUR", operation_type: "Venta", crypto_amount: 1, fiat_amount: 100, timestamp: new Date("2026-10-01T12:00:00.000Z") },
      { id: "loss-buy", sessionId: "crypto-loss", crypto: "BTC", fiat: "EUR", operation_type: "Compra", crypto_amount: 0.9, fiat_amount: 99, timestamp: new Date("2026-10-02T12:00:00.000Z") },
      { id: "open-sale", sessionId: "crypto-open", crypto: "BTC", fiat: "EUR", operation_type: "Venta", crypto_amount: 1, fiat_amount: 100, timestamp: new Date("2026-10-03T12:00:00.000Z") },
      { id: "open-buy", sessionId: "crypto-open", crypto: "BTC", fiat: "EUR", operation_type: "Compra", crypto_amount: 1.1, fiat_amount: 99, timestamp: new Date("2026-10-04T12:00:00.000Z") },
      { id: "open-sale-2", sessionId: "crypto-open", crypto: "BTC", fiat: "EUR", operation_type: "Venta", crypto_amount: 1.1, fiat_amount: 111, timestamp: new Date("2026-10-05T12:00:00.000Z") },
      { id: "open-buy-2", sessionId: "crypto-open", crypto: "BTC", fiat: "EUR", operation_type: "Compra", crypto_amount: 1.2, fiat_amount: 109, timestamp: new Date("2026-10-06T12:00:00.000Z") },
      { id: "partial-sale", sessionId: "crypto-partial", crypto: "BTC", fiat: "EUR", operation_type: "Venta", crypto_amount: 1, fiat_amount: 100, timestamp: new Date("2026-10-07T12:00:00.000Z") },
    ];
    const sessions = [
      { id: "crypto-loss", fiat: "EUR", crypto: "BTC", initialCapitalType: "crypto", initialCapitalCurrency: "BTC", initialCapital: 1, status: "closed" },
      { id: "crypto-open", fiat: "EUR", crypto: "BTC", initialCapitalType: "crypto", initialCapitalCurrency: "BTC", initialCapital: 1, status: "active" },
      { id: "crypto-partial", fiat: "EUR", crypto: "BTC", initialCapitalType: "crypto", initialCapitalCurrency: "BTC", initialCapital: 1, status: "closed" },
    ];

    const result = calculateDashboardSummaryMetrics(operations, sessions, new Date("2026-10-22T12:00:00.000Z"));

    expect(result.closedSales).toBe(3);
    expect(result.winningSales).toBe(2);
    expect(result.successRate).toBeCloseTo((2 / 3) * 100, 8);
  });

  test("keeps crypto-session activity older than 30 days out of the recent summary", () => {
    const operations = [
      { id: "old-crypto-sale", sessionId: "crypto-session", crypto: "BTC", fiat: "EUR", operation_type: "Venta", crypto_amount: 1, fiat_amount: 100, timestamp: new Date("2026-09-01T12:00:00.000Z") },
      { id: "old-crypto-buy", sessionId: "crypto-session", crypto: "BTC", fiat: "EUR", operation_type: "Compra", crypto_amount: 1.1, fiat_amount: 99, timestamp: new Date("2026-09-02T12:00:00.000Z") },
    ];
    const sessions = [
      { id: "crypto-session", fiat: "EUR", crypto: "BTC", initialCapitalType: "crypto", initialCapitalCurrency: "BTC", initialCapital: 1 },
    ];

    const result = calculateDashboardSummaryMetrics(operations, sessions, new Date("2026-10-22T12:00:00.000Z"));

    expect(result.profitByCurrency.BTC).toBeCloseTo(0.1, 8);
    expect(result.monthlyProfitByCurrency).toEqual({});
  });
});

describe("calculateCryptoArbitrage", () => {
  test("applies sell fees to fiat proceeds and buy fees to repurchased crypto", () => {
    const result = calculateCryptoArbitrage({
      amount: 1,
      sell_price: 110,
      buy_price: 100,
      sell_fee: 1,
      buy_fee: 1,
    });

    expect(result.net_fiat_proceeds).toBeCloseTo(108.9, 8);
    expect(result.revenue).toBeCloseTo(1.07811, 8);
    expect(result.profit).toBeCloseTo(0.07811, 8);
    expect(result.profit_fiat_equivalent).toBeCloseTo(7.811, 8);
    expect(result.profit_percentage).toBeCloseTo(7.811, 8);
  });

  test("rejects arbitrage calculations that overflow the finite numeric range", () => {
    expect(() => calculateCryptoArbitrage({
      amount: 1e308, buy_price: 1, sell_price: 1e308,
      buy_fee: 0, sell_fee: 0, crypto: "BTC", fiat_currency: "EUR",
    })).toThrow(/demasiado grandes o pequeños/i);
  });

  test("rejects using the same asset as the quote currency", () => {
    expect(() => calculateCryptoArbitrage({
      amount: 1,
      buy_price: 1,
      sell_price: 1.1,
      crypto: "USDT",
      fiat_currency: "USDT",
    })).toThrow(/deben ser distintas/i);
  });

  test("rejects a zero price and invalid fee percentage", () => {
    expect(() => calculateCryptoArbitrage({
      amount: 1,
      buy_price: 0,
      sell_price: 110,
    })).toThrow(/precios/i);

    expect(() => calculateCryptoArbitrage({
      amount: 1,
      buy_price: 100,
      sell_price: 110,
      sell_fee: 100,
    })).toThrow(/comisión/i);
  });
});
