// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- pega tu firebaseConfig aquí (valores que ya tienes en tu repo) ---
const firebaseConfig = {
  apiKey: "AIzaSyBMHC2YuUO3mwHQORDDGZaQ84-k4tmJGjY",
  authDomain: "jjxcapital-2.firebaseapp.com",
  projectId: "jjxcapital-2",
  storageBucket: "jjxcapital-2.appspot.com", // asegúrate que termina en .appspot.com
  messagingSenderId: "842768954334",
  appId: "1:842768954334:web:63248c0a432f583abf234f",
  measurementId: "G-VVYKFN4WPD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;