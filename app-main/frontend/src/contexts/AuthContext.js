import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider, microsoftProvider, appleProvider } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
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
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, {
        displayName: `${firstName} ${lastName}`
      });
      return result;
    } catch (error) {
      throw error;
    }
  };

  const signIn = async (email, password) => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      return await signInWithPopup(auth, googleProvider);
    } catch (error) {
      throw error;
    }
  };

  const signInWithMicrosoft = async () => {
    try {
      return await signInWithPopup(auth, microsoftProvider);
    } catch (error) {
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      return await signInWithPopup(auth, appleProvider);
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      return await firebaseSignOut(auth);
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithMicrosoft,
    signInWithApple,
    signOut,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};