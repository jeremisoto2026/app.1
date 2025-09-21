
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
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

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
        plan: "free",
        createdAt: serverTimestamp()
      });

      return result;
    } catch (error) {
      console.error("Error creating account:", error);
      throw error;
    }
  };

  const signIn = async (email, password) => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // ✅ Si el usuario entra con Google, también lo guardamos en la base
      await setDoc(
        doc(db, "users", result.user.uid),
        {
          uid: result.user.uid,
          email: result.user.email,
          nombre: result.user.displayName?.split(" ")[0] || "",
          apellido: result.user.displayName?.split(" ")[1] || "",
          photoURL: result.user.photoURL || "",
          plan: "free",
          createdAt: serverTimestamp()
        },
        { merge: true } // para no sobrescribir si ya existe
      );

      return result;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      return await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
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
