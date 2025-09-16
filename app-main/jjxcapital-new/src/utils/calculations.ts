import { Operation, DashboardStats } from "../types";

export const calculateDashboardStats = (operations: Operation[]): DashboardStats => {
  if (!operations.length) {
    return {
      totalUSDT: 0,
      totalEUR: 0,
      totalMovements: 0,
      totalOperations: 0,
      performance: 0,
      profitableOperations: 0,
      monthlyProfit: 0
    };
  }

  let totalUSDT = 0;
  let totalEUR = 0;
  let totalMovements = 0;
  let profitableOperations = 0;
  let monthlyProfit = 0;

  // Calculate date 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  operations.forEach(operation => {
    // USDT calculations
    if (operation.crypto === 'USDT') {
      totalUSDT += operation.type === 'Compra' 
        ? operation.amtC 
        : -operation.amtC;
    }

    // EUR calculations
    totalEUR += operation.fiatAmt;
    
    // Total movements (absolute value)
    totalMovements += Math.abs(operation.fiatAmt);

    // Count profitable operations
    if (operation.fiatAmt > 0) {
      profitableOperations++;
    }

    // Monthly profit calculation
    const operationDate = new Date(operation.date);
    if (operationDate >= thirtyDaysAgo) {
      monthlyProfit += operation.fiatAmt;
    }
  });

  const performance = operations.length > 0 
    ? ((totalEUR / operations.length) * 100) 
    : 0;

  return {
    totalUSDT,
    totalEUR,
    totalMovements,
    totalOperations: operations.length,
    performance,
    profitableOperations,
    monthlyProfit
  };
};

export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export const getOperationsByMonth = (operations: Operation[]): { [key: string]: number } => {
  const monthlyData: { [key: string]: number } = {};
  
  operations.forEach(operation => {
    const date = new Date(operation.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = 0;
    }
    
    monthlyData[monthKey] += operation.fiatAmt;
  });

  return monthlyData;
};