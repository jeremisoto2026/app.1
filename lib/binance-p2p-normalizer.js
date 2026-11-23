function num(value) {
  if (value === null || value === undefined || value === "") return NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function parseTime(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === "number" || (typeof value === "string" && /^\d{10,16}$/.test(value.trim()))) {
    const number = Number(value);
    const date = new Date(number > 0 && number < 100000000000 ? number * 1000 : number);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
}

function normalizeOrder(row) {
  const orderNumber = String(row?.orderNumber ?? row?.orderNo ?? row?.orderId ?? "").trim();
  const tradeType = String(row?.tradeType ?? "").trim().toUpperCase();
  const crypto = String(row?.asset ?? row?.crypto ?? "").trim().toUpperCase();
  const fiat = String(row?.fiat ?? row?.fiatUnit ?? "").trim().toUpperCase();
  const cryptoAmount = num(row?.amount);
  const fiatAmount = num(row?.totalPrice);
  const rawRate = num(row?.unitPrice ?? row?.price);
  const rate = Number.isFinite(rawRate) && rawRate > 0 ? rawRate : fiatAmount / cryptoAmount;
  const timestamp = parseTime(row?.createTime ?? row?.createdAt ?? row?.timestamp);

  if (!orderNumber || orderNumber.length > 160 ||
      (tradeType !== "BUY" && tradeType !== "SELL") ||
      !crypto || !fiat || crypto === fiat ||
      !Number.isFinite(cryptoAmount) || cryptoAmount <= 0 ||
      !Number.isFinite(fiatAmount) || fiatAmount <= 0 ||
      !Number.isFinite(rate) || rate <= 0 || !timestamp) return null;

  const commission = num(row?.commission);
  const takerCommission = num(row?.takerCommission);
  const takerAmount = num(row?.takerAmount);
  const advertisementRole = String(row?.advertisementRole ?? "").trim().toUpperCase();
  const sourceFee = advertisementRole === "TAKER"
    ? (Number.isFinite(takerCommission) ? takerCommission : commission)
    : (Number.isFinite(commission) ? commission : takerCommission);
  const fee = Number.isFinite(sourceFee) && sourceFee > 0 ? sourceFee : 0;

  return {
    order_id: orderNumber,
    source: "binance_p2p",
    sourceOrderId: orderNumber,
    sourceStatus: String(row?.orderStatus ?? row?.status ?? ""),
    sourceCommission: Number.isFinite(commission) ? commission : null,
    sourceTakerCommission: Number.isFinite(takerCommission) ? takerCommission : null,
    sourceTakerAmount: Number.isFinite(takerAmount) ? takerAmount : null,
    sourceAdvertisementNumber: String(row?.advNo ?? row?.advOrderNumber ?? "").trim() || null,
    sourceFiatSymbol: String(row?.fiatSymbol ?? "").trim() || null,
    sourcePayMethodName: String(row?.payMethodName ?? "").trim() || null,
    sourceAdvertisementRole: advertisementRole || null,
    exchange: "Binance",
    operation_type: tradeType === "BUY" ? "Compra" : "Venta",
    crypto,
    fiat,
    crypto_amount: cryptoAmount,
    fiat_amount: fiatAmount,
    exchange_rate: rate,
    // The imported history already provides gross order amounts. Keep the crypto fee
    // separate so accounting can apply it exactly once.
    fee,
    fee_currency: crypto,
    timestamp,
    importedAt: new Date(),
    sessionId: null,
    sessionName: "Binance P2P · Importado",
    arbitrageType: "Binance P2P",
  };
}

module.exports = { normalizeOrder };
