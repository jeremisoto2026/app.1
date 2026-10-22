// Database service using Firestore
import { 
  collection, 
  addDoc, 
  getDocs, 
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { calculateDashboardMetrics, calculateCryptoArbitrage, getOperationDate } from "../utils/financialCalculations";
import { simulateP2P as runP2PSimulation } from "../utils/simulations";

// --- Operations CRUD ---

export const saveOperation = async (userId, operationData) => {
  try {
    const userOperationsCollection = collection(db, "users", userId, "operations");

    const docRef = await addDoc(userOperationsCollection, {
      ...operationData,
      timestamp: serverTimestamp(),
    });

    // Leer el documento recién creado con los datos finales (incluido el timestamp real)
    const newDoc = await getDoc(docRef);
    return { id: docRef.id, ...newDoc.data() };
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
    const querySnapshot = await getDocs(userOperationsCollection);
    const operations = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    operations.sort((a, b) => {
      const dateA = getOperationDate(a.timestamp)?.getTime() ?? Number.NEGATIVE_INFINITY;
      const dateB = getOperationDate(b.timestamp)?.getTime() ?? Number.NEGATIVE_INFINITY;
      return dateB - dateA;
    });

    return operations;
  } catch (error) {
    console.error("Error getting user operations:", error);
    throw error;
  }
};

// --- Dashboard stats calculation ---
// Profit is expressed per fiat currency and calculated from FIFO-matched sales.
// It is intentionally not exposed as one "USDT/USD" number when the underlying
// operations may be denominated in EUR, VES, MXN, or other currencies.
export const getDashboardStats = async (userId) => {
  try {
    const operations = await getUserOperations(userId);
    const metrics = calculateDashboardMetrics(operations);

    return {
      total_operations: metrics.totalOperations,
      profit_by_currency: metrics.profitByCurrency,
      monthly_profit_by_currency: metrics.monthlyProfitByCurrency,
      best_operation_by_currency: metrics.bestOperationByCurrency,
      worst_operation_by_currency: metrics.worstOperationByCurrency,
      closed_sales: metrics.closedSales,
      winning_sales: metrics.winningSales,
      success_rate: metrics.successRate,
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    throw error;
  }
};

// --- P2P Simulation (shared calculation) ---
export const simulateP2P = (simulationData) => {
  try {
    return runP2PSimulation(simulationData);
  } catch (error) {
    console.error("Error in P2P simulation:", error);
    throw error;
  }
};

// --- Arbitrage Calculation (shared calculation) ---
export const simulateArbitrage = (arbitrageData) => {
  try {
    return {
      buy_exchange: arbitrageData.buy_exchange,
      sell_exchange: arbitrageData.sell_exchange,
      crypto: arbitrageData.crypto,
      ...calculateCryptoArbitrage(arbitrageData),
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