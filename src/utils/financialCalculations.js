// Centralized, testable financial calculations for JJXCAPITAL.
//
// Accounting rules:
// - A purchase adds the net crypto quantity received at its fiat cost.
// - A sale realizes profit only for crypto quantity matched to earlier purchases.
// - FIFO is applied separately to each crypto/fiat pair.
// - Profit and loss is grouped by quote currency; distinct currency codes are never added together.
// - Operations without a valid timestamp are excluded from FIFO matching because
//   their chronological order cannot be trusted.

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === "") return NaN;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
};

export const getOperationDate = (value) => {
  try {
    if (value && typeof value.toDate === "function") {
      const date = value.toDate();
      return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
    }

    if (value instanceof Date) {
      return Number.isFinite(value.getTime()) ? value : null;
    }

    if (typeof value === "number") {
      const milliseconds = Math.abs(value) < 1e12 ? value * 1000 : value;
      const date = new Date(milliseconds);
      return Number.isFinite(date.getTime()) ? date : null;
    }

    if (value && typeof value === "object" && Number.isFinite(value.seconds)) {
      const date = new Date(value.seconds * 1000);
      return Number.isFinite(date.getTime()) ? date : null;
    }

    if (typeof value === "string" && value.trim()) {
      const date = new Date(value);
      return Number.isFinite(date.getTime()) ? date : null;
    }
  } catch {
    return null;
  }

  return null;
};

export const calculateOperationAmounts = ({
  operation_type,
  amount,
  exchange_rate,
  fee = 0,
  crypto = "",
  fiat = "",
}) => {
  const parsedAmount = toFiniteNumber(amount);
  const rate = toFiniteNumber(exchange_rate);
  const parsedFee = fee === "" || fee === null || fee === undefined ? 0 : toFiniteNumber(fee);

  if (operation_type !== "Compra" && operation_type !== "Venta") {
    throw new Error("Selecciona si la operación es una Compra o una Venta.");
  }
  if (
    String(crypto || "").trim().toUpperCase() &&
    String(crypto || "").trim().toUpperCase() === String(fiat || "").trim().toUpperCase()
  ) {
    throw new Error("La criptomoneda y la moneda de cotización deben ser distintas.");
  }
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error("La cantidad debe ser un número mayor que 0.");
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("La tasa de cambio debe ser un número mayor que 0.");
  }
  if (!Number.isFinite(parsedFee) || parsedFee < 0) {
    throw new Error("La comisión debe ser un número válido y no puede ser negativa.");
  }

  let cryptoAmount;
  let fiatAmount;
  let feeCurrency;

  if (operation_type === "Venta") {
    cryptoAmount = parsedAmount;
    fiatAmount = parsedAmount * rate - parsedFee;
    feeCurrency = fiat;
    if (!Number.isFinite(fiatAmount) || fiatAmount <= 0) {
      throw new Error("La comisión no puede superar el importe bruto de la venta.");
    }
  } else {
    fiatAmount = parsedAmount;
    cryptoAmount = parsedAmount / rate - parsedFee;
    feeCurrency = crypto;
    if (!Number.isFinite(cryptoAmount) || cryptoAmount <= 0) {
      throw new Error("La comisión debe ser inferior a la cantidad de cripto recibida.");
    }
  }

  return {
    crypto_amount: cryptoAmount,
    fiat_amount: fiatAmount,
    exchange_rate: rate,
    fee: parsedFee,
    fee_currency: feeCurrency || (operation_type === "Venta" ? "fiat" : "crypto"),
  };
};

const normalizeCurrency = (value) => String(value || "").trim().toUpperCase();

const addToCurrencyTotal = (totals, currency, amount) => {
  const key = normalizeCurrency(currency);
  if (!key || !Number.isFinite(amount)) return;
  totals[key] = (totals[key] || 0) + amount;
};

export const calculateDashboardMetrics = (operations = [], now = new Date()) => {
  const allOperations = Array.isArray(operations) ? operations : [];
  const referenceDate = getOperationDate(now) || new Date();
  const startOfWindow = new Date(referenceDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  const profitByCurrency = {};
  const monthlyProfitByCurrency = {};
  const inventoryByPair = new Map();
  const closedSales = [];
  const realizedProfitByOperation = {};
  const bestOperationByCurrency = {};
  const worstOperationByCurrency = {};

  const datedOperations = allOperations
    .map((operation, index) => ({
      ...operation,
      _calculationDate: getOperationDate(operation.timestamp),
      _originalIndex: index,
      _cryptoQuantity: toFiniteNumber(operation.crypto_amount),
      _fiatValue: toFiniteNumber(operation.fiat_amount),
      _cryptoCode: normalizeCurrency(operation.crypto),
      _fiatCode: normalizeCurrency(operation.fiat),
    }))
    .filter((operation) =>
      operation._calculationDate &&
      (operation.operation_type === "Compra" || operation.operation_type === "Venta") &&
      operation._cryptoCode &&
      operation._fiatCode &&
      operation._cryptoCode !== operation._fiatCode &&
      Number.isFinite(operation._cryptoQuantity) &&
      operation._cryptoQuantity > 0 &&
      Number.isFinite(operation._fiatValue) &&
      operation._fiatValue > 0
    )
    .sort((a, b) =>
      a._calculationDate.getTime() - b._calculationDate.getTime() ||
      a._originalIndex - b._originalIndex
    );

  datedOperations.forEach((operation) => {
    // An arbitraje es una unidad contable aislada. Las operaciones antiguas sin sessionId
    // se siguen agrupando entre sí para no perder su historial previo.
    const sessionKey = operation.sessionId || "__legacy__";
    const pairKey = sessionKey + "::" + operation._cryptoCode + "/" + operation._fiatCode;
    if (!inventoryByPair.has(pairKey)) inventoryByPair.set(pairKey, []);
    const lots = inventoryByPair.get(pairKey);

    if (operation.operation_type === "Compra") {
      lots.push({
        remainingQuantity: operation._cryptoQuantity,
        costPerUnit: operation._fiatValue / operation._cryptoQuantity,
      });
      return;
    }

    const saleQuantity = operation._cryptoQuantity;
    const proceedsPerUnit = operation._fiatValue / saleQuantity;
    let remainingToMatch = saleQuantity;
    let matchedQuantity = 0;
    let matchedCost = 0;
    let matchedProceeds = 0;
    let saleProfit = 0;

    while (remainingToMatch > 1e-10 && lots.length > 0) {
      const lot = lots[0];
      const matched = Math.min(remainingToMatch, lot.remainingQuantity);
      const profit = matched * (proceedsPerUnit - lot.costPerUnit);

      matchedQuantity += matched;
      matchedCost += matched * lot.costPerUnit;
      matchedProceeds += matched * proceedsPerUnit;
      saleProfit += profit;
      remainingToMatch -= matched;
      lot.remainingQuantity -= matched;

      if (lot.remainingQuantity <= 1e-10) lots.shift();
    }

    // Only the matched portion has a known cost basis; unmatched quantities
    // are never treated as profit or loss. The per-sale record is also used by
    // the history screen and CSV export so every result remains auditable.
    const isFullyMatched = remainingToMatch <= Math.max(1e-8, saleQuantity * 1e-8);
    const saleResult = {
      id: operation.id || null,
      profit: saleProfit,
      currency: operation._fiatCode,
      timestamp: operation.timestamp,
      matchedQuantity,
      matchedCost,
      matchedProceeds,
      soldQuantity: saleQuantity,
      fullyMatched: isFullyMatched,
    };

    if (operation.id) {
      realizedProfitByOperation[operation.id] = saleResult;
    }

    if (matchedQuantity > 0) {
      addToCurrencyTotal(profitByCurrency, operation._fiatCode, saleProfit);
      if (operation._calculationDate >= startOfWindow && operation._calculationDate <= referenceDate) {
        addToCurrencyTotal(monthlyProfitByCurrency, operation._fiatCode, saleProfit);
      }
    }

    if (isFullyMatched) {
      closedSales.push(saleResult);
      const currency = operation._fiatCode;
      if (!bestOperationByCurrency[currency] || saleProfit > bestOperationByCurrency[currency].profit) {
        bestOperationByCurrency[currency] = saleResult;
      }
      if (!worstOperationByCurrency[currency] || saleProfit < worstOperationByCurrency[currency].profit) {
        worstOperationByCurrency[currency] = saleResult;
      }
    }
  });

  const winningSales = closedSales.filter((sale) => sale.profit > 1e-8).length;
  const successRate = closedSales.length
    ? (winningSales / closedSales.length) * 100
    : 0;
  return {
    totalOperations: allOperations.length,
    profitByCurrency,
    monthlyProfitByCurrency,
    successRate,
    closedSales: closedSales.length,
    winningSales,
    realizedProfitByOperation,
    bestOperationByCurrency,
    worstOperationByCurrency,
  };
};


// Shared session-level accounting keeps the detail screen and history ROI consistent.
// Operations with a different asset pair are excluded so unlike currencies are never
// mixed into a session result, even if an old/editable record contains inconsistent data.
export const calculateArbitrageSessionResult = (session = {}, operations = []) => {
  const initialCapital = toFiniteNumber(session.initialCapital);
  const isCryptoBase = session.initialCapitalType === "crypto";
  const cryptoCode = normalizeCurrency(session.crypto);
  const fiatCode = normalizeCurrency(session.fiat);
  const baseCurrency = normalizeCurrency(session.initialCapitalCurrency) ||
    (isCryptoBase ? cryptoCode : fiatCode) || (isCryptoBase ? "USDT" : "EUR");
  const matchingOperations = (Array.isArray(operations) ? operations : []).filter((operation) => {
    // If a caller passes a global operation list, never include another session
    // merely because it uses the same pair of currencies.
    if (session.id && operation.sessionId !== session.id) return false;
    const operationCrypto = normalizeCurrency(operation.crypto);
    const operationFiat = normalizeCurrency(operation.fiat);
    return (!cryptoCode || operationCrypto === cryptoCode) &&
      (!fiatCode || operationFiat === fiatCode);
  });

  let profit = 0;
  if (isCryptoBase) {
    profit = matchingOperations.reduce((total, operation) => {
      const quantity = toFiniteNumber(operation.crypto_amount);
      if (!Number.isFinite(quantity) || quantity <= 0) return total;
      if (operation.operation_type === "Compra") return total + quantity;
      if (operation.operation_type === "Venta") return total - quantity;
      return total;
    }, 0);
  } else {
    profit = calculateDashboardMetrics(matchingOperations).profitByCurrency?.[fiatCode] || 0;
  }

  return {
    profit,
    initialCapital: Number.isFinite(initialCapital) ? initialCapital : 0,
    roi: Number.isFinite(initialCapital) && initialCapital > 0 ? (profit / initialCapital) * 100 : 0,
    baseCurrency,
    isCryptoBase,
    operationCount: matchingOperations.length,
  };
};

export const calculateCryptoArbitrage = ({
  amount,
  buy_price,
  sell_price,
  buy_fee = 0,
  sell_fee = 0,
  crypto = "",
  fiat_currency = "",
}) => {
  const quantity = toFiniteNumber(amount);
  const buyPrice = toFiniteNumber(buy_price);
  const sellPrice = toFiniteNumber(sell_price);
  const buyFeePercent = buy_fee === "" || buy_fee === null || buy_fee === undefined ? 0 : toFiniteNumber(buy_fee);
  const sellFeePercent = sell_fee === "" || sell_fee === null || sell_fee === undefined ? 0 : toFiniteNumber(sell_fee);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("La cantidad inicial de cripto debe ser mayor que 0.");
  }
  if (!Number.isFinite(buyPrice) || buyPrice <= 0 || !Number.isFinite(sellPrice) || sellPrice <= 0) {
    throw new Error("Los precios de compra y venta deben ser números mayores que 0.");
  }
  if (
    String(crypto || "").trim().toUpperCase() &&
    String(crypto || "").trim().toUpperCase() === String(fiat_currency || "").trim().toUpperCase()
  ) {
    throw new Error("La criptomoneda y la moneda de cotización deben ser distintas.");
  }
  if (!Number.isFinite(buyFeePercent) || buyFeePercent < 0 || buyFeePercent >= 100 ||
      !Number.isFinite(sellFeePercent) || sellFeePercent < 0 || sellFeePercent >= 100) {
    throw new Error("Cada comisión debe ser un porcentaje entre 0 y menos de 100.");
  }

  // This is a round-trip arbitrage model: sell the initial crypto at sell_price,
  // then use the net fiat proceeds to buy crypto again at buy_price.
  const grossFiatProceeds = quantity * sellPrice;
  const sellFeeFiat = grossFiatProceeds * sellFeePercent / 100;
  const netFiatProceeds = grossFiatProceeds - sellFeeFiat;
  const grossCryptoRepurchased = netFiatProceeds / buyPrice;
  const buyFeeCrypto = grossCryptoRepurchased * buyFeePercent / 100;
  const finalCrypto = grossCryptoRepurchased - buyFeeCrypto;
  const cryptoProfit = finalCrypto - quantity;
  const profitPercentage = (cryptoProfit / quantity) * 100;
  const profitFiatEquivalent = cryptoProfit * buyPrice;
  const computedValues = [
    grossFiatProceeds, sellFeeFiat, netFiatProceeds, grossCryptoRepurchased,
    buyFeeCrypto, finalCrypto, cryptoProfit, profitPercentage, profitFiatEquivalent,
  ];
  if (
    computedValues.some((value) => !Number.isFinite(value)) ||
    grossFiatProceeds <= 0 || netFiatProceeds <= 0 ||
    grossCryptoRepurchased <= 0 || finalCrypto <= 0
  ) {
    throw new Error("Los importes son demasiado grandes o pequeños para calcularse correctamente. Reduce la cantidad o ajusta los precios.");
  }

  return {
    investment: quantity,
    revenue: finalCrypto,
    gross_fiat_proceeds: grossFiatProceeds,
    sell_fee_fiat: sellFeeFiat,
    net_fiat_proceeds: netFiatProceeds,
    gross_crypto_repurchased: grossCryptoRepurchased,
    buy_fee_crypto: buyFeeCrypto,
    profit: cryptoProfit,
    profit_fiat_equivalent: profitFiatEquivalent,
    profit_percentage: profitPercentage,
  };
};
