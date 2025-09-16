// Firebase configuration from JJXCAPITAL-main (improved version)
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración mejorada de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBMHC2YuUO3mwHQORDDGZaQ84-k4tmJGjY",
  authDomain: "jjxcapital-2.firebaseapp.com",
  projectId: "jjxcapital-2",
  storageBucket: "jjxcapital-2.appspot.com",
  messagingSenderId: "842768954334",
  appId: "1:842768954334:web:63248c0a432f583abf234f",
  measurementId: "G-VVYKFN4WPD"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Servicios Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);

// Proveedores de autenticación
export const googleProvider = new GoogleAuthProvider();

export default app;