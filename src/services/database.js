// src/services/database.js
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  orderBy,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase";

const OWNER_UID = "WYNmwLw2vwUfUaA2eRmsH3Biw0";

// --- Usuarios / Perfil ---

/**
 * Crea o asegura el documento de usuario en /users/{uid}
 * userObj = { uid, email, displayName, photoURL }
 */
export const ensureUserDoc = async (userObj) => {
  try {
    const userRef = doc(db, "users", userObj.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      const nameParts = (userObj.displayName || "").trim().split(" ");
      const nombre = nameParts[0] || "";
      const apellido = nameParts.slice(1).join(" ") || "";

      const plan = userObj.uid === OWNER_UID ? "exclusive" : "free";

      const data = {
        uid: userObj.uid,
        email: userObj.email || "",
        nombre,
        apellido,
        photoURL: userObj.photoURL || "",
        plan,
        createdAt: serverTimestamp(),
        limiteOperaciones: plan === "free" ? 200 : null,
        limiteExportaciones: plan === "free" ? 40 : null
      };

      await setDoc(userRef, data);
      return data;
    } else {
      return snap.data();
    }
  } catch (error) {
    console.error("ensureUserDoc error:", error);
    throw error;
  }
};

export const getUserProfile = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    return snap.exists() ? { uid: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error("getUserProfile error:", error);
    throw error;
  }
};

/**
 * Actualiza el plan de un usuario (por ejemplo, de free → premium)
 */
export const updateUserPlan = async (uid, plan = "premium") => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      plan,
      limiteOperaciones: plan === "free" ? 200 : null,
      limiteExportaciones: plan === "free" ? 40 : null
    });
  } catch (error) {
    console.error("updateUserPlan error:", error);
    throw error;
  }
};

// --- Operaciones ---

/**
 * Guarda operación en colección raíz "operations" con userId y createdAt.
 * Verifica límite si el usuario es 'free' (200 ops) — owner y premium no limitan.
 */
export const saveOperation = async (userId, operationData) => {
  try {
    // Obtener plan del usuario
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;
    const plan = userData?.plan || "free";

    // Si es free y no es owner, contar operaciones y validar límite
    if (plan === "free" && userId !== OWNER_UID) {
      const qCount = query(
        collection(db, "operations"),
        where("userId", "==", userId)
      );
      const snapshot = await getDocs(qCount);
      if (snapshot.size >= 200) {
        const err = new Error("Límite alcanzado: plan Gratuito permite máximo 200 operaciones.");
        err.code = "LIMIT_REACHED";
        throw err;
      }
    }

    const docRef = await addDoc(collection(db, "operations"), {
      ...operationData,
      userId,
      createdAt: serverTimestamp()
    });

    return { id: docRef.id, ...operationData };
  } catch (error) {
    console.error("saveOperation error:", error);
    throw error;
  }
};

export const getUserOperations = async (userId) => {
  try {
    const q = query(
      collection(db, "operations"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("getUserOperations error:", error);
    throw error;
  }
};

export const getUserOperationsCount = async (userId) => {
  try {
    const q = query(collection(db, "operations"), where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.size;
  } catch (error) {
    console.error("getUserOperationsCount error:", error);
    throw error;
  }
};

// --- Exports (contador de exportaciones) ---

export const saveExport = async (userId) => {
  try {
    // Obtener plan del usuario
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;
    const plan = userData?.plan || "free";

    // Validar límite para Free
    if (plan === "free" && userId !== OWNER_UID) {
      const exportsCount = await getUserExportsCount(userId);
      if (exportsCount >= 40) {
        const err = new Error("Límite alcanzado: plan Gratuito permite máximo 40 exportaciones.");
        err.code = "LIMIT_REACHED";
        throw err;
      }
    }

    await addDoc(collection(db, "exports"), {
      userId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("saveExport error:", error);
    throw error;
  }
};

export const getUserExportsCount = async (userId) => {
  try {
    const q = query(collection(db, "exports"), where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.size;
  } catch (error) {
    console.error("getUserExportsCount error:", error);
    throw error;
  }
};