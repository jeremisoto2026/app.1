import { simulateP2P } from "./simulations";

describe("simulateP2P", () => {
  test("charges sale fee in crypto and derives net fiat from net crypto", () => {
    const result = simulateP2P({
      crypto: "USDT",
      fiat: "EUR",
      operation_type: "Venta",
      amount: 10,
      exchange_rate: 0.9,
      fee: 1,
    });

    expect(result.amount_received).toBeCloseTo(9, 8);
    expect(result.fee_amount).toBeCloseTo(0.1, 8);
    expect(result.net_crypto).toBeCloseTo(9.9, 8);
    expect(result.net_amount).toBeCloseTo(8.91, 8);
    expect(result.fee_currency).toBe("USDT");
  });

  test("charges buy fee from crypto received", () => {
    const result = simulateP2P({
      crypto: "USDT",
      fiat: "EUR",
      operation_type: "Compra",
      amount: 100,
      exchange_rate: 0.9,
      fee: 1,
    });

    expect(result.amount_received).toBeCloseTo(111.1111111111, 7);
    expect(result.fee_amount).toBeCloseTo(1.1111111111, 7);
    expect(result.net_amount).toBeCloseTo(110, 7);
    expect(result.fee_currency).toBe("USDT");
  });

  test("rejects invalid inputs and impossible fees", () => {
    expect(() => simulateP2P({
      crypto: "USDT",
      fiat: "EUR",
      operation_type: "Venta",
      amount: 10,
      exchange_rate: 0,
      fee: 1,
    })).toThrow(/tasa/i);

    expect(() => simulateP2P({
      crypto: "USDT",
      fiat: "EUR",
      operation_type: "Compra",
      amount: 100,
      exchange_rate: 1,
      fee: 100,
    })).toThrow(/comisión/i);
  });
});
