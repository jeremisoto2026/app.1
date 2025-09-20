// src/components/Profile.js

import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { db } from "../services/database"; // ✅ corregido en minúscula
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

const OWNER_UID = "WYNmwLw2vwUfUaA2eRmsH3Biw0"; // UID del dueño

const Profile = () => {
  const { currentUser } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [operationsCount, setOperationsCount] = useState(0);
  const [plan, setPlan] = useState("Cargando...");

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        // 📌 Obtener datos del usuario en "users"
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserData(userSnap.data());

          // 📌 Determinar el plan
          if (currentUser.uid === OWNER_UID) {
            setPlan("Exclusivo");
          } else if (userSnap.data().plan === "premium") {
            setPlan("Premium");
          } else {
            setPlan("Gratuito");
          }
        }

        // 📌 Contar operaciones del usuario en "operations"
        const q = query(
          collection(db, "operations"),
          where("userId", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        setOperationsCount(querySnapshot.size);
      } catch (error) {
        console.error("Error al obtener datos del perfil:", error);
      }
    };

    fetchData();
  }, [currentUser]);

  if (!currentUser) {
    return <p>Debes iniciar sesión para ver tu perfil.</p>;
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <h2>Perfil del Usuario</h2>

      {/* Foto de perfil */}
      {currentUser.photoURL ? (
        <img
          src={currentUser.photoURL}
          alt="Foto de perfil"
          style={{ width: "100px", height: "100px", borderRadius: "50%" }}
        />
      ) : (
        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: "#ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "40px",
          }}
        >
          👤
        </div>
      )}

      {/* Datos básicos */}
      <p><strong>Nombre:</strong> {currentUser.displayName || "Sin nombre"}</p>
      <p><strong>Email:</strong> {currentUser.email}</p>
      <p><strong>Plan:</strong> {plan}</p>
      <p><strong>Operaciones realizadas:</strong> {operationsCount}</p>
    </div>
  );
};

export default Profile;