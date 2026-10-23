// AuthContext mejorado basado en JJXCAPITAL-main
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  updateProfile
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de un AuthProvider.");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // 🔹 Registro con email y contraseña
  const signUp = async (email, password, firstName, lastName) => {
    try {
      // 1️⃣ Crear usuario en Auth
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // 2️⃣ Actualizar nombre en el perfil de Auth
      await updateProfile(result.user, {
        displayName: `${firstName} ${lastName}`
      });

      // 3️⃣ Guardar en Firestore
      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        email: result.user.email,
        nombre: firstName,
        apellido: lastName,
        photoURL: result.user.photoURL || "",
        plan: "free",          // 👈 solo plan, sin role
        exportsUsed: 0,        // 👈 contador inicial
        createdAt: serverTimestamp()
      });

      return result;
    } catch (error) {
      console.error("Error al crear la cuenta:", error);
      throw error;
    }
  };

  // 🔹 Inicio de sesión con email y contraseña
  const signIn = async (email, password) => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      throw error;
    }
  };

  // 🔹 Inicio de sesión con Google
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Crear el perfil solo si no existe. Nunca reiniciar el plan, el contador
      // de exportaciones ni la fecha de alta al iniciar sesión de nuevo.
      const userRef = doc(db, "users", result.user.uid);
      const existingProfile = await getDoc(userRef);

      if (existingProfile.exists()) {
        await setDoc(
          userRef,
          {
            uid: result.user.uid,
            email: result.user.email,
            photoURL: result.user.photoURL || existingProfile.data().photoURL || "",
          },
          { merge: true }
        );
      } else {
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email,
          nombre: result.user.displayName?.split(" ")[0] || "",
          apellido: result.user.displayName?.split(" ").slice(1).join(" ") || "",
          photoURL: result.user.photoURL || "",
          plan: "free",
          exportsUsed: 0,
          createdAt: serverTimestamp(),
        });
      }

      return result;
    } catch (error) {
      console.error("Error al iniciar sesión con Google:", error);
      throw error;
    }
  };

  // 🔹 Cerrar sesión
  const signOut = async () => {
    try {
      return await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// ✅ Exportar también el contexto para evitar errores de importación
export { AuthContext };