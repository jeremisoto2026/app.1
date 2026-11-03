// Configuración de Firebase para autenticación y base de datos.
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const isPreviewBuild = process.env.REACT_APP_VERCEL_ENV === "preview";

const previewFirebaseConfig = {
  apiKey: String(process.env.REACT_APP_FIREBASE_PREVIEW_API_KEY || "").trim(),
  authDomain: String(process.env.REACT_APP_FIREBASE_PREVIEW_AUTH_DOMAIN || "").trim(),
  projectId: String(process.env.REACT_APP_FIREBASE_PREVIEW_PROJECT_ID || "").trim(),
  storageBucket: String(process.env.REACT_APP_FIREBASE_PREVIEW_STORAGE_BUCKET || "").trim(),
  messagingSenderId: String(process.env.REACT_APP_FIREBASE_PREVIEW_MESSAGING_SENDER_ID || "").trim(),
  appId: String(process.env.REACT_APP_FIREBASE_PREVIEW_APP_ID || "").trim(),
  measurementId: String(process.env.REACT_APP_FIREBASE_PREVIEW_MEASUREMENT_ID || "").trim(),
};

const requiredPreviewFields = [
  "apiKey",
  "authDomain",
  "projectId",
  "messagingSenderId",
  "appId",
];

const missingPreviewFields = requiredPreviewFields.filter(
  (field) => !previewFirebaseConfig[field]
);
const previewUsesProductionProject = previewFirebaseConfig.projectId === "jjxcapital-2";
const previewFirebaseReady = missingPreviewFields.length === 0 && !previewUsesProductionProject;

export const firebaseEnvironmentStatus = Object.freeze({
  isPreview: isPreviewBuild,
  ready: !isPreviewBuild || previewFirebaseReady,
  missingFields: isPreviewBuild ? missingPreviewFields : [],
  reason: !isPreviewBuild
    ? null
    : previewUsesProductionProject
      ? "production-project-rejected"
      : missingPreviewFields.length
        ? "preview-project-not-configured"
        : null,
});

// The Preview placeholder is deliberately not a real Firebase project. It lets
// the public landing shell load while App renders a setup notice, without ever
// falling back to the Production project or its browser credentials.
const isolatedPlaceholderConfig = {
  apiKey: "preview-not-configured",
  authDomain: "preview-not-configured.invalid",
  projectId: "preview-not-configured",
  storageBucket: "preview-not-configured.invalid",
  messagingSenderId: "0",
  appId: "1:0:web:preview-not-configured",
};

const productionFirebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBMHC2YuUO3mwHQORDDGZaQ84-k4tmJGjY",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "jjxcapital-2.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "jjxcapital-2",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "jjxcapital-2.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "842768954334",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:842768954334:web:63248c0a432f583abf234f",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-VVYKFN4WPD",
};

const firebaseConfig = isPreviewBuild
  ? (previewFirebaseReady ? previewFirebaseConfig : isolatedPlaceholderConfig)
  : productionFirebaseConfig;

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
