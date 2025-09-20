// src/utils/simulations.js
export function simulateP2P({ crypto, fiat, operation_type, amount, exchange_rate, fee }) {
  let amount_sent, amount_received, net_amount;

  if (operation_type === 'Venta') {
    // Vendes crypto → recibes fiat
    amount_sent = amount;
    amount_received = amount * exchange_rate;
    net_amount = amount_received - fee;
  } else {
    // Compras crypto → gastas fiat
    amount_sent = amount;
    amount_received = amount / exchange_rate;
    net_amount = amount_received - fee;
  }

  return {
    crypto,
    fiat,
    operation_type,
    amount_sent,
    amount_received,
    exchange_rate,
    fee,
    net_amount,
  };
}