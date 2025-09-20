// AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// 🔥 Creamos el contexto
const AuthContext = createContext();

// 📌 Hook para consumir el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// 📌 Función auxiliar: crear/actualizar perfil en Firestore
const createOrUpdateUserProfile = async (firebaseUser) => {
  if (!firebaseUser) return null;

  const userRef = doc(db, "users", firebaseUser.uid);

  // nombre y apellido (si existen en displayName)
  const [firstName = "", lastName = ""] = firebaseUser.displayName
    ? firebaseUser.displayName.split(" ")
    : ["", ""];

  const userData = {
    uid: firebaseUser.uid,
    firstName,
    lastName,
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL || "",
    plan: "Free", // default
    memberSince: serverTimestamp(),
  };

  await setDoc(userRef, userData, { merge: true });

  // devolvemos el doc actualizado
  return userData;
};

// 📌 Provider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // usuario con datos de Firestore
  const [loading, setLoading] = useState(true);

  // Escuchar cambios de sesión
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 🔥 cargar perfil de Firestore
        const userRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          setUser(snap.data());
        } else {
          const newUser = await createOrUpdateUserProfile(firebaseUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // 📌 Registro
  const signUp = async (email, password, firstName, lastName) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(result.user, {
        displayName: `${firstName} ${lastName}`,
      });

      const userData = await createOrUpdateUserProfile(result.user);
      setUser(userData);

      return result;
    } catch (error) {
      console.error("❌ Error creating account:", error);
      throw error;
    }
  };

  // 📌 Login con email
  const signIn = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      const userData = await createOrUpdateUserProfile(result.user);
      setUser(userData);

      return result;
    } catch (error) {
      console.error("❌ Error signing in:", error);
      throw error;
    }
  };

  // 📌 Login con Google
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const userData = await createOrUpdateUserProfile(result.user);
      setUser(userData);

      return result;
    } catch (error) {
      console.error("❌ Error signing in with Google:", error);
      throw error;
    }
  };

  // 📌 Logout
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error("❌ Error signing out:", error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;