// Database service using Firestore (replacing MongoDB)
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";

// Operations CRUD
export const saveOperation = async (userId, operationData) => {
  try {
    const operation = {
      ...operationData,
      user_id: userId,
      order_id: String(Date.now()),
      timestamp: serverTomestamp(),
      id: crypto.randomUUID()
    };

    const docRef = await addDoc(collection(db, "operations"), operation);
    return { id: docRef.id, ...operation };
  } catch (error) {
    console.error("Error saving operation:", error);
    throw error;
  }
};

export const getUserOperations = async (userId) => {
  try {
    const q = query(
      collection(db, "operations"),
      where("user_id", "==", userId),
      orderBy("timestamp", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting user operations:", error);
    throw error;
  }
};

// Dashboard stats calculation
export const getDashboardStats = async (userId) => {
  try {
    const operations = await getUserOperations(userId);
    
    if (!operations.length) {
      return {
        total_operations: 0,
        total_profit_usdt: 0.0,
        total_profit_eur: 0.0,
        total_profit_usd: 0.0,
        best_operation: null,
        worst_operation: null,
        monthly_profit: 0.0,
        success_rate: 0.0
      };
    }

    // Calculate totals
    const totalProfitUsdt = operations
      .filter(op => op.crypto === "USDT")
      .reduce((sum, op) => sum + (op.fiat_amount || 0), 0);
    
    const totalProfitEur = operations
      .filter(op => op.fiat === "EUR")
      .reduce((sum, op) => sum + (op.fiat_amount || 0), 0);
    
    const totalProfitUsd = operations
      .filter(op => op.fiat === "USD")
      .reduce((sum, op) => sum + (op.fiat_amount || 0), 0);

    // Find best and worst operations
    const bestOp = operations.reduce((max, op) => 
      (op.fiat_amount || 0) > (max.fiat_amount || 0) ? op : max
    );
    
    const worstOp = operations.reduce((min, op) => 
      (op.fiat_amount || 0) < (min.fiat_amount || 0) ? op : min
    );

    // Calculate monthly profit (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const monthlyOps = operations.filter(op => {
      const opDate = op.timestamp?.toDate ? op.timestamp.toDate() : new Date(op.timestamp);
      return opDate >= thirtyDaysAgo;
    });
    
    const monthlyProfit = monthlyOps.reduce((sum, op) => sum + (op.fiat_amount || 0), 0);

    // Success rate calculation
    const successfulOps = operations.filter(op => (op.fiat_amount || 0) > 0).length;
    const successRate = operations.length > 0 ? (successfulOps / operations.length) * 100 : 0;

    return {
      total_operations: operations.length,
      total_profit_usdt: totalProfitUsdt,
      total_profit_eur: totalProfitEur,
      total_profit_usd: totalProfitUsd,
      best_operation: bestOp,
      worst_operation: worstOp,
      monthly_profit: monthlyProfit,
      success_rate: successRate
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    throw error;
  }
};

// P2P Simulation (client-side calculation)
export const simulateP2P = (simulationData) => {
  try {
    const { operation_type, amount, exchange_rate, fee = 0 } = simulationData;
    
    if (operation_type === "Venta") {
      // Selling crypto, receiving fiat
      const grossFiat = amount * exchange_rate;
      const netFiat = grossFiat - fee;
      
      return {
        operation_type,
        crypto: simulationData.crypto,
        fiat: simulationData.fiat,
        amount_sent: amount,
        amount_received: grossFiat,
        fee: fee,
        net_amount: netFiat,
        exchange_rate
      };
    } else {
      // Buying crypto with fiat
      const grossCrypto = amount / exchange_rate;
      const netCrypto = grossCrypto - fee;
      
      return {
        operation_type,
        crypto: simulationData.crypto,
        fiat: simulationData.fiat,
        amount_sent: amount,
        amount_received: grossCrypto,
        fee: fee,
        net_amount: netCrypto,
        exchange_rate
      };
    }
  } catch (error) {
    console.error("Error in P2P simulation:", error);
    throw error;
  }
};

// Arbitrage Calculation (client-side calculation)
export const simulateArbitrage = (arbitrageData) => {
  try {
    const { amount, buy_price, sell_price, buy_fee = 0, sell_fee = 0 } = arbitrageData;
    
    // Calculate investment (buying)
    const investment = amount * buy_price + buy_fee;
    
    // Calculate revenue (selling)
    const revenue = amount * sell_price - sell_fee;
    
    // Calculate profit
    const totalFees = buy_fee + sell_fee;
    const profit = revenue - investment;
    const profitPercentage = investment > 0 ? (profit / investment) * 100 : 0;
    
    return {
      buy_exchange: arbitrageData.buy_exchange,
      sell_exchange: arbitrageData.sell_exchange,
      crypto: arbitrageData.crypto,
      investment,
      revenue,
      total_fees: totalFees,
      profit,
      profit_percentage: profitPercentage
    };
  } catch (error) {
    console.error("Error in arbitrage simulation:", error);
    throw error;
  }
};

// User preferences and data
export const saveUserPreferences = async (userId, preferences) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, preferences);
  } catch (error) {
    console.error("Error saving user preferences:", error);
    throw error;
  }
};

export const getUserPreferences = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      return {};
    }
  } catch (error) {
    console.error("Error getting user preferences:", error);
    throw error;
  }
};