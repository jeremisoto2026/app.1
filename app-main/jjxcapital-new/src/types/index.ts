export interface Operation {
  id?: string;
  uid: string;
  exchange: 'Binance' | 'Bybit' | 'OKX' | 'KuCoin';
  type: 'Venta' | 'Compra';
  crypto: 'USDT' | 'BTC' | 'ETH' | 'BNB';
  amtC: number;
  rate: number;
  fee: number;
  fiatAmt: number;
  date: string;
  createdAt?: any;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface Subscription {
  uid: string;
  plan: 'free' | 'premium';
  ordersUsed: number;
  ordersLimit: number;
  movementsUsed: number;
  movementsLimit: number;
  exportsUsed: number;
  exportsLimit: number;
  monthlyPayment: number;
  nextPaymentDate?: string;
}

export interface DashboardStats {
  totalUSDT: number;
  totalEUR: number;
  totalMovements: number;
  totalOperations: number;
  performance: number;
  profitableOperations: number;
  monthlyProfit: number;
}