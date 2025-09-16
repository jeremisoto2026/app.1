import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyC2ehh6VGue2Rme9wvB1LspxNiTVqEAXpk",
  authDomain: "jjxcapital-bf5a6.firebaseapp.com",
  projectId: "jjxcapital-bf5a6",
  storageBucket: "jjxcapital-bf5a6.firebasestorage.app",
  messagingSenderId: "338896648629",
  appId: "1:338896648629:web:2eb766cace7454099141fc",
  measurementId: "G-XED5HH0YEF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const analytics = getAnalytics(app);
export default app;