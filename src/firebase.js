// Configuración de Firebase para autenticación y base de datos
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración pública del proyecto de Firebase
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

// Servicios utilizados por la aplicación
export const auth = getAuth(app);
export const db = getFirestore(app);

// Proveedor de inicio de sesión con Google
export const googleProvider = new GoogleAuthProvider();

export default app;