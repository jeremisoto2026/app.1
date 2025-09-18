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
        total_profit_usd: 0.0,
        best_operation: null,
        worst_operation: null,
        monthly_profit: 0.0,
        success_rate: 0.0
      };
    }

    let totalCryptoBought = 0;
    let totalCryptoSold = 0;
    let successfulOperations = 0;
    
    operations.forEach(op => {
      const cryptoAmount = parseFloat(op.crypto_amount);
      if (isNaN(cryptoAmount)) return;

      if (op.operation_type === 'Venta') {
        totalCryptoSold += cryptoAmount;
      } else if (op.operation_type === 'Compra') {
        totalCryptoBought += cryptoAmount;
      }
    });

    const totalProfitUsdt = totalCryptoSold - totalCryptoBought;

    // The rest of the dashboard stats will be based on this total profit
    // You may need to adjust the logic for best/worst operation and monthly profit
    // as they would require more granular calculations per transaction.
    // For now, these fields are placeholders or can be re-defined based on your needs.
    const successRate = totalProfitUsdt > 0 ? 100 : 0;
    const totalOperations = operations.length;
    
    return {
      total_operations: totalOperations,
      total_profit_usdt: totalProfitUsdt,
      total_profit_usd: totalProfitUsdt,
      best_operation: null,
      worst_operation: null,
      monthly_profit: totalProfitUsdt,
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
