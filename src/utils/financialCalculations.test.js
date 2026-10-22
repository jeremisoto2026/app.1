import {
  calculateCryptoArbitrage,
  calculateDashboardMetrics,
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
