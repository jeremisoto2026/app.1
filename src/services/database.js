// Database service using Firestore
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  getDocs, 
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";

// --- Operations CRUD ---

export const saveOperation = async (userId, operationData) => {
  try {
    const userOperationsCollection = collection(db, "users", userId, "operations");
    
    const docRef = await addDoc(userOperationsCollection, {
      ...operationData,
      timestamp: serverTimestamp(),
    });
    return { id: docRef.id, ...operationData };
  } catch (error) {
    console.error("Error saving operation:", error);
    throw error;
  }
};

export const deleteOperation = async (userId, operationId) => {
  try {
    const operationRef = doc(db, "users", userId, "operations", operationId);
    await deleteDoc(operationRef);
    console.log("Operation successfully deleted!");
  } catch (error) {
    console.error("Error deleting operation:", error);
    throw error;
  }
};

export const getUserOperations = async (userId) => {
  try {
    const userOperationsCollection = collection(db, "users", userId, "operations");
    const q = query(
      userOperationsCollection,
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

// --- Dashboard stats calculation ---

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

    let totalProfitUsdt = 0;
    let totalProfitEur = 0;
    let bestOperation = null;
    let worstOperation = null;
    let monthlyProfit = 0;
    let successfulOperations = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    operations.forEach(op => {
      let profit = 0;
      
      const cryptoAmount = parseFloat(op.crypto_amount);
      const fiatAmount = parseFloat(op.fiat_amount);
      const exchangeRate = parseFloat(op.exchange_rate);

      if (isNaN(cryptoAmount) || isNaN(fiatAmount) || isNaN(exchangeRate)) {
        return;
      }

      if (op.operation_type === 'Compra') {
        // En una compra, ganancia es el crypto_amount - fiat_amount/exchange_rate
        profit = cryptoAmount - (fiatAmount / exchangeRate);
      } else if (op.operation_type === 'Venta') {
        // En una venta, ganancia es el fiat_amount/exchange_rate - crypto_amount
        profit = (fiatAmount / exchangeRate) - cryptoAmount;
      }
      
      if (op.fiat === 'USD') {
        totalProfitUsdt += profit;
      } else if (op.fiat === 'EUR') {
        totalProfitEur += profit;
      }

      if (profit !== 0) {
        if (!bestOperation || profit > bestOperation.profit) {
          bestOperation = { ...op, profit: profit };
        }
        if (!worstOperation || profit < worstOperation.profit) {
          worstOperation = { ...op, profit: profit };
        }
      }
      
      const opDate = op.timestamp?.toDate ? op.timestamp.toDate() : new Date(op.timestamp);
      if (opDate >= thirtyDaysAgo) {
        monthlyProfit += profit;
      }

      if (profit > 0) {
        successfulOperations++;
      }
    });

    const successRate = operations.length > 0 ? (successfulOperations / operations.length) * 100 : 0;
    
    return {
      total_operations: operations.length,
      total_profit_usdt: totalProfitUsdt,
      total_profit_eur: totalProfitEur,
      total_profit_usd: totalProfitUsdt,
      best_operation: bestOperation,
      worst_operation: worstOperation,
      monthly_profit: monthlyProfit,
      success_rate: successRate
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    throw error;
  }
};

// --- P2P Simulation (client-side calculation) ---

export const simulateP2P = (simulationData) => {
  try {
    const { operation_type, amount, exchange_rate, fee = 0 } = simulationData;
    
    if (operation_type === "Venta") {
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

// --- Arbitrage Calculation (client-side calculation) ---

export const simulateArbitrage = (arbitrageData) => {
  try {
    const { amount, buy_price, sell_price, buy_fee = 0, sell_fee = 0 } = arbitrageData;
    
    const investment = amount * buy_price + buy_fee;
    const revenue = amount * sell_price - sell_fee;
    
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

// --- User preferences and data ---

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
