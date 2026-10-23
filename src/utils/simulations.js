// P2P simulation shared by the UI and service layer.
// The commission is a percentage charged in crypto for both buy and sell
// simulations, matching the unit stated by the simulator's UI.
const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

const assertFiniteSimulationResult = (result) => {
  const computedValues = [result.amount_received, result.fee_amount, result.net_crypto, result.net_amount, result.exchange_rate];
  if (
    computedValues.some((value) => !Number.isFinite(value)) ||
    result.amount_received <= 0 ||
    result.net_crypto <= 0 ||
    result.net_amount <= 0
  ) {
    throw new Error("Los importes son demasiado grandes o pequeños para calcularse correctamente. Reduce la cantidad o ajusta la tasa.");
  }
  return result;
};

export function simulateP2P({ crypto, fiat, operation_type, amount, exchange_rate, fee = 0 }) {
  const quantity = toNumber(amount);
  const rate = toNumber(exchange_rate);
  const feePercent = fee === "" || fee === null || fee === undefined ? 0 : toNumber(fee);

  if (operation_type !== "Venta" && operation_type !== "Compra") {
    throw new Error("Selecciona Compra o Venta.");
  }
  if (
    String(crypto || "").trim().toUpperCase() &&
    String(crypto || "").trim().toUpperCase() === String(fiat || "").trim().toUpperCase()
  ) {
    throw new Error("La criptomoneda y la moneda de cotización deben ser distintas.");
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("La cantidad debe ser un número mayor que 0.");
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("La tasa de cambio debe ser un número mayor que 0.");
  }
  if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent >= 100) {
    throw new Error("La comisión debe ser un porcentaje entre 0 y menos de 100.");
  }

  if (operation_type === "Venta") {
    // Se envía cripto; la comisión se descuenta en cripto antes de convertir a fiat.
    const feeAmount = quantity * feePercent / 100;
    const netCrypto = quantity - feeAmount;
    const grossFiat = quantity * rate;
    const netFiat = netCrypto * rate;

    return assertFiniteSimulationResult({
      crypto,
      fiat,
      operation_type,
      amount: quantity,
      amount_sent: quantity,
      amount_received: grossFiat,
      fee: feePercent,
      fee_amount: feeAmount,
      fee_currency: crypto,
      net_crypto: netCrypto,
      net_amount: netFiat,
      exchange_rate: rate,
    });
  }

  // Se envía fiat; la comisión se descuenta de la cripto recibida.
  const grossCrypto = quantity / rate;
  const feeAmount = grossCrypto * feePercent / 100;
  const netCrypto = grossCrypto - feeAmount;

  return assertFiniteSimulationResult({
    crypto,
    fiat,
    operation_type,
    amount: quantity,
    amount_sent: quantity,
    amount_received: grossCrypto,
    fee: feePercent,
    fee_amount: feeAmount,
    fee_currency: crypto,
    net_crypto: netCrypto,
    net_amount: netCrypto,
    exchange_rate: rate,
  });
}