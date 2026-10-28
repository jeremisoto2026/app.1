import {
  formatCryptoAmount,
  formatFiatAmount,
  formatCurrencyAmount,
} from "./numberFormatting";

describe("formatCryptoAmount", () => {
  test("limits ordinary crypto amounts to three decimal places", () => {
    expect(formatCryptoAmount(116.27906976744187)).toBe("116,279");
    expect(formatCryptoAmount(1.23)).toBe("1,23");
    expect(formatCryptoAmount(12)).toBe("12");
  });

  test("preserves small non-zero amounts instead of displaying zero", () => {
    expect(formatCryptoAmount(0.00042)).toBe("0,00042");
    expect(formatCryptoAmount(0.00000023)).toBe("0,00000023");
  });

  test("marks amounts below the eight-decimal display precision", () => {
    expect(formatCryptoAmount(0.000000001)).toBe("<0,00000001");
    expect(formatCryptoAmount(-0.000000001)).toBe(">-0,00000001");
  });

  test("handles zero and invalid values safely", () => {
    expect(formatCryptoAmount(0)).toBe("0");
    expect(formatCryptoAmount("invalid")).toBe("0");
  });
});

describe("currency amount formatting", () => {
  test("keeps fiat at exactly two decimals", () => {
    expect(formatFiatAmount(12345.567)).toBe("12.345,57");
    expect(formatCurrencyAmount(0.00042, "EUR")).toBe("0,00");
  });

  test("uses compact adaptive formatting for supported crypto currencies", () => {
    expect(formatCurrencyAmount(0.00042, "USDT")).toBe("0,00042");
    expect(formatCurrencyAmount(116.27906976744187, "BTC")).toBe("116,279");
  });
});
