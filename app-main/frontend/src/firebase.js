import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyC2ehh6VGue2Rme9wvB1LspxNiTVqEAXpk",
  authDomain: "jjxcapital-bf5a6.firebaseapp.com",
  projectId: "jjxcapital-bf5a6",
  storageBucket: "jjxcapital-bf5a6.firebasestorage.app",
  messagingSenderId: "338896648629",
  appId: "1:338896648629:web:2eb766cace7454099141fc",
  measurementId: "G-XED5HH0YEF"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

// Proveedores de autenticación
export const googleProvider = new GoogleAuthProvider();
export const microsoftProvider = new OAuthProvider('microsoft.com');
export const appleProvider = new OAuthProvider('apple.com');

export default app;