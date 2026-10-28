const DEFAULT_CRYPTO_FRACTION_DIGITS = 3;
const MAX_CRYPTO_FRACTION_DIGITS = 8;

const CRYPTO_CURRENCY_CODES = new Set([
  "USDT",
  "USDC",
  "BTC",
  "ETH",
  "BNB",
  "DAI",
  "SOL",
  "XRP",
  "LTC",
]);

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === "") return NaN;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
};

export const formatFiatAmount = (value) => {
  const number = toFiniteNumber(value);
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
};

export const formatCryptoAmount = (value) => {
  const number = toFiniteNumber(value);
  if (!Number.isFinite(number) || number === 0) return "0";

  const absolute = Math.abs(number);
  let fractionDigits = DEFAULT_CRYPTO_FRACTION_DIGITS;

  // Keep ordinary amounts compact, but don't round a small, non-zero balance to zero.
  if (absolute < 0.5 * (10 ** -DEFAULT_CRYPTO_FRACTION_DIGITS)) {
    const extraDigits = Math.max(0, Math.floor(-Math.log10(absolute)));
    fractionDigits = Math.min(
      MAX_CRYPTO_FRACTION_DIGITS,
      DEFAULT_CRYPTO_FRACTION_DIGITS + extraDigits
    );
  }

  const formatted = new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(number);

  // Amounts smaller than the supported eight-decimal display precision should not look like zero.
  if (Number(formatted.replace(/\./g, "").replace(",", ".")) === 0) {
    const minimumVisibleAmount = new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: MAX_CRYPTO_FRACTION_DIGITS,
      maximumFractionDigits: MAX_CRYPTO_FRACTION_DIGITS,
      useGrouping: false,
    }).format(10 ** -MAX_CRYPTO_FRACTION_DIGITS);
    return number > 0 ? `<${minimumVisibleAmount}` : `>-${minimumVisibleAmount}`;
  }

  return formatted;
};

export const formatCurrencyAmount = (value, currency) => {
  const code = String(currency || "").trim().toUpperCase();
  return CRYPTO_CURRENCY_CODES.has(code)
    ? formatCryptoAmount(value)
    : formatFiatAmount(value);
};
