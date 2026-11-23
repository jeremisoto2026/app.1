import { normalizeOrder } from "../../lib/binance-p2p-normalizer";
import {
  calculateDashboardMetrics,
  getAccountingCryptoAmount,
} from "./financialCalculations";

describe("Binance P2P imported buy commissions", () => {
  const takerBuyRow = {
    orderNumber: "BINANCE-BUY-TEST-001",
    tradeType: "BUY",
    asset: "USDT",
    fiat: "EUR",
    amount: "100",
    totalPrice: "95",
    unitPrice: "0.95",
    createTime: "2026-11-04T12:00:00.000Z",
    commission: "0.05",
    takerCommission: "0.10",
    takerAmount: "100",
    advertisementRole: "TAKER",
    orderStatus: "COMPLETED",
  };

  test("selects takerCommission for a TAKER buy and preserves gross source amounts", () => {
    const imported = normalizeOrder(takerBuyRow);

    expect(imported).toMatchObject({
      order_id: "BINANCE-BUY-TEST-001",
      source: "binance_p2p",
      operation_type: "Compra",
      crypto: "USDT",
      fiat: "EUR",
      crypto_amount: 100,
      fiat_amount: 95,
      exchange_rate: 0.95,
      sourceCommission: 0.05,
      sourceTakerCommission: 0.1,
      sourceAdvertisementRole: "TAKER",
      fee: 0.1,
      fee_currency: "USDT",
    });
  });

  test("uses the regular commission for a MAKER buy", () => {
    const imported = normalizeOrder({
      ...takerBuyRow,
      orderNumber: "BINANCE-BUY-TEST-002",
      advertisementRole: "MAKER",
    });

    expect(imported.fee).toBeCloseTo(0.05, 10);
    expect(imported.fee_currency).toBe("USDT");
  });

  test("applies a TAKER buy fee once when calculating inventory and FIFO cost basis", () => {
    const importedBuy = normalizeOrder(takerBuyRow);
    expect(importedBuy).not.toBeNull();

    // The raw imported amount stays gross; accounting subtracts the crypto fee once.
    expect(importedBuy.crypto_amount).toBeCloseTo(100, 10);
    expect(getAccountingCryptoAmount(importedBuy)).toBeCloseTo(99.9, 10);

    const laterSale = {
      id: "BINANCE-BUY-TEST-SALE",
      source: "manual",
      sessionId: null,
      operation_type: "Venta",
      crypto: "USDT",
      fiat: "EUR",
      crypto_amount: 99.9,
      fiat_amount: 100,
      exchange_rate: 100 / 99.9,
      fee: 0,
      timestamp: new Date("2026-11-04T13:00:00.000Z"),
    };

    const metrics = calculateDashboardMetrics(
      [{ ...importedBuy, id: importedBuy.order_id }, laterSale],
      new Date("2026-11-05T00:00:00.000Z")
    );

    expect(metrics.realizedProfitByOperation[laterSale.id]).toMatchObject({
      matchedQuantity: 99.9,
      matchedCost: 95,
      fullyMatched: true,
    });
    // Floating-point arithmetic can represent this exact 100 EUR as 99.99999999999999.
    expect(metrics.realizedProfitByOperation[laterSale.id].matchedProceeds).toBeCloseTo(100, 8);
    expect(metrics.profitByCurrency.EUR).toBeCloseTo(5, 8);
    expect(metrics.closedSales).toBe(1);
  });

  test("rejects malformed or non-positive Binance order amounts", () => {
    expect(normalizeOrder({ ...takerBuyRow, amount: "0" })).toBeNull();
    expect(normalizeOrder({ ...takerBuyRow, tradeType: "CANCELLED" })).toBeNull();
  });
});

describe("Binance P2P imported sell commissions", () => {
  test.each([
    ["MAKER", "0.20", 0.2, 100.2],
    ["TAKER", "0.30", 0.3, 100.3],
  ])(
    "applies the %s commission to crypto consumed by a sale exactly once",
    (advertisementRole, expectedFee, expectedFeeAmount, expectedConsumedCrypto) => {
      const importedSale = normalizeOrder({
        orderNumber: `BINANCE-SELL-${advertisementRole}-TEST`,
        tradeType: "SELL",
        asset: "USDT",
        fiat: "EUR",
        amount: "100",
        totalPrice: "100",
        unitPrice: "1",
        createTime: "2026-11-04T13:00:00.000Z",
        commission: "0.20",
        takerCommission: "0.30",
        advertisementRole,
        orderStatus: "COMPLETED",
      });

      expect(importedSale).toMatchObject({
        operation_type: "Venta",
        crypto_amount: 100,
        fiat_amount: 100,
        fee: expectedFeeAmount,
        fee_currency: "USDT",
      });
      expect(importedSale.fee).toBeCloseTo(Number(expectedFee), 10);
      expect(getAccountingCryptoAmount(importedSale)).toBeCloseTo(expectedConsumedCrypto, 10);

      // The prior inventory covers the crypto sent plus the crypto-denominated fee.
      const priorBuy = {
        id: `BINANCE-SELL-${advertisementRole}-BUY`,
        source: "manual",
        sessionId: null,
        operation_type: "Compra",
        crypto: "USDT",
        fiat: "EUR",
        crypto_amount: expectedConsumedCrypto,
        fiat_amount: 90,
        timestamp: new Date("2026-11-04T12:00:00.000Z"),
      };

      const metrics = calculateDashboardMetrics(
        [priorBuy, { ...importedSale, id: importedSale.order_id }],
        new Date("2026-11-05T00:00:00.000Z")
      );
      const saleResult = metrics.realizedProfitByOperation[importedSale.order_id];

      expect(saleResult.matchedQuantity).toBeCloseTo(expectedConsumedCrypto, 10);
      expect(saleResult.matchedCost).toBeCloseTo(90, 10);
      expect(saleResult.matchedProceeds).toBeCloseTo(100, 10);
      expect(saleResult.profit).toBeCloseTo(10, 10);
      expect(saleResult.fullyMatched).toBe(true);
      expect(metrics.profitByCurrency.EUR).toBeCloseTo(10, 10);
      expect(metrics.closedSales).toBe(1);
    }
  );
});
