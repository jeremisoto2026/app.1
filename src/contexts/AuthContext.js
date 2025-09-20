// src/contexts/AuthContext.js
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
import { auth } from "../firebase";
import { ensureUserDoc } from "../services/database"; // <-- nuevo

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
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      // cuando detectamos user, nos aseguramos que exista doc en Firestore
      if (u) {
        try {
          await ensureUserDoc({
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || "",
            photoURL: u.photoURL || ""
          });
        } catch (err) {
          console.error("Error ensureUserDoc on auth state change:", err);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email, password, firstName, lastName) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Actualizamos displayName en Auth profile
      await updateProfile(result.user, {
        displayName: `${firstName} ${lastName}`
      });

      // Creamos el documento en Firestore
      await ensureUserDoc({
        uid: result.user.uid,
        email: result.user.email,
        displayName: `${firstName} ${lastName}`,
        photoURL: result.user.photoURL || ""
      });

      return result;
    } catch (error) {
      console.error("Error creating account:", error);
      throw error;
    }
  };

  const signIn = async (email, password) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      // ensureUserDoc se llama en onAuthStateChanged, pero podemos llamar aquí si queremos
      return res;
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Asegurar documento Firestore (si no existe)
      const u = result.user;
      await ensureUserDoc({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || "",
        photoURL: u.photoURL || ""
      });

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

export default AuthContext;