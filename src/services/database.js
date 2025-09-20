import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  addDoc,    // 👈 para guardar operaciones
  serverTimestamp // 👈 para fecha de creación
} from "firebase/firestore";
import { db } from "../firebase"; // Asegúrate de que esta ruta es correcta

// Guardar una operación
export const saveOperation = async (userId, operationData) => {
  try {
    await addDoc(collection(db, "operations"), {
      ...operationData,
      userId,
      createdAt: serverTimestamp() // 👈 fecha automática
    });
  } catch (error) {
    console.error("Error guardando la operación:", error);
    throw error;
  }
};

// Obtener datos del usuario actual
export const getUserData = async () => {
  try {
    const userId = "user-123"; // 🔹 Reemplaza con el UID real de Firebase Auth
    const userDoc = await getDoc(doc(db, "users", userId));
    
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    } else {
      throw new Error("Usuario no encontrado");
    }
  } catch (error) {
    console.error("Error obteniendo datos del usuario:", error);
    throw error;
  }
};

// Obtener operaciones del usuario
export const getUserOperations = async (userId) => {
  try {
    const q = query(
      collection(db, "operations"),
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    const operations = [];
    
    querySnapshot.forEach((doc) => {
      operations.push({ id: doc.id, ...doc.data() });
    });
    
    return operations;
  } catch (error) {
    console.error("Error obteniendo operaciones:", error);
    throw error;
  }
};

// Simulación de operación P2P (no toca Firebase)
export const simulateP2P = (data) => {
  const { crypto, fiat, operation_type, amount, exchange_rate, fee } = data;

  // Cantidad enviada depende del tipo de operación
  const amountSent = amount;

  // Cantidad recibida (bruta)
  const amountReceived = operation_type === "Venta"
    ? amount * exchange_rate
    : amount / exchange_rate;

  // Restar comisión
  const netAmount = amountReceived - fee;

  // Retornar resultado de simulación
  return {
    crypto,
    fiat,
    operation_type,
    amount_sent: amountSent,
    amount_received: amountReceived,
    exchange_rate,
    fee,
    net_amount: netAmount
  };
};