// src/services/userService.js
import { getAuth } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Crea o actualiza el perfil del usuario en Firestore.
 */
export const createOrUpdateUserProfile = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) return;

  const userRef = doc(db, "users", user.uid);

  // si el displayName existe lo partimos en nombre y apellido
  const [nombre, apellido] = user.displayName
    ? user.displayName.split(" ")
    : ["", ""];

  await setDoc(
    userRef,
    {
      nombre,
      apellido,
      email: user.email,
      plan: "Free",
      memberSince: serverTimestamp(),
      photoURL: user.photoURL || "",
    },
    { merge: true } // <-- no borra datos antiguos
  );
};