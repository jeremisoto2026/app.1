export async function loadBybitPreviewOperations(user) {
  if (process.env.REACT_APP_BYBIT_P2P_PREVIEW_MODE !== "true" || !user?.getIdToken) {
    return [];
  }

  try {
    const token = await user.getIdToken();
    const response = await fetch(
      "/api/integrations/binance-p2p/status?provider=bybit&view=operations&limit=1000",
      { method: "GET", headers: { Authorization: "Bearer " + token }, cache: "no-store" }
    );
    if (!response.ok) return [];
    const payload = await response.json().catch(() => ({}));
    return (Array.isArray(payload.operations) ? payload.operations : []).map((item) => ({
      id: item.id,
      order_id: item.orderId,
      sourceOrderId: item.orderId,
      source: "bybit_p2p",
      _previewOnly: true,
      exchange: "Bybit",
      operation_type: item.operationType,
      crypto: item.crypto,
      fiat: item.fiat,
      crypto_amount: Number(item.cryptoAmount),
      fiat_amount: Number(item.fiatAmount),
      exchange_rate: Number(item.exchangeRate),
      fee: 0,
      fee_currency: null,
      timestamp: item.timestamp ? new Date(item.timestamp) : null,
      sessionId: item.sessionId || null,
      sessionName: item.sessionName || "Bybit P2P · Importado",
      arbitrageType: "Bybit P2P",
    }));
  } catch (error) {
    console.warn("No se pudieron cargar las operaciones Bybit de Preview:", error);
    return [];
  }
}
