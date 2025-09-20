import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc 
} from "firebase/firestore";
import { db } from "../firebase"; // Asegúrate de que esta ruta es correcta

// Obtener datos del usuario actual
export const getUserData = async () => {
  try {
    // Aquí debes obtener el UID del usuario autenticado
    // Esto es un ejemplo - ajusta según tu sistema de autenticación
    const userId = "user-123"; // Reemplaza con el UID real
    
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