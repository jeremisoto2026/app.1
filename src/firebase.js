// Firebase configuration from JJXCAPITAL-main (improved version)
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

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
export const messaging = getMessaging(app);

// Proveedores de autenticación
export const googleProvider = new GoogleAuthProvider();

// Función para pedir permiso de notificaciones y obtener token
export const requestNotificationPermission = async () => {
  console.log("🔔 Solicitando permiso de notificaciones...");
  try {
    const currentToken = await getToken(messaging, {
      vapidKey:
        "BH_HM4VrMVNom-lbZrBNbJSsZp5xIj4jJiASY0IxxDSqasnrRX8UgRrjZgjZuk_tL-g1GQABjVI3Xror9v-zdiE",
    });

    if (currentToken) {
      console.log("✅ Token FCM generado:", currentToken);
      // 👉 Aquí puedes guardarlo en Firestore o en tu backend
      return currentToken;
    } else {
      console.warn("⚠️ No se pudo generar el token FCM.");
      return null;
    }
  } catch (error) {
    console.error("❌ Error al obtener el token FCM:", error);
    return null;
  }
};

// Escuchar notificaciones en primer plano
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("📩 Notificación recibida en foreground:", payload);
      resolve(payload);
    });
  });

export default app;