// src/components/Profile.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

const OWNER_UID = "WYNmwLw2vwUfUaA2eRmsH3Biw0";

const Profile = () => {
  const { user, signOut } = useAuth();
  const [operationsCount, setOperationsCount] = useState(0);
  const [exportsCount, setExportsCount] = useState(0);
  const [plan, setPlan] = useState("Gratuito");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Si es el dueño
        if (user.uid === OWNER_UID) {
          setPlan("Exclusivo");
          setOperationsCount("∞");
          setExportsCount("∞");
          return;
        }

        // ✅ Contar operaciones directamente desde Firestore
        const operationsRef = collection(db, "users", user.uid, "operations");
        const operationsSnap = await getDocs(operationsRef);
        setOperationsCount(operationsSnap.size);

        // ✅ Obtener exportaciones y plan desde el doc del usuario
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setExportsCount(data.exportsCount || 0);
          setPlan(data.plan || "Gratuito");
        }
      } catch (error) {
        console.error("Error cargando perfil:", error);
      }
    };

    fetchData();
  }, [user]);

  if (!user) {
    return <p>Cargando perfil...</p>;
  }

  return (
    <div className="profile-container" style={{ padding: "20px", color: "white" }}>
      <h1 style={{ color: "#FFD700", textAlign: "center" }}>⚡ JJXCAPITAL ⚡</h1>
      <p style={{ textAlign: "center" }}>Seguridad, velocidad y confianza</p>

      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <h2>
          Hola, <span style={{ color: "#FFD700" }}>{user.displayName}</span> 👋
        </h2>
        <button
          onClick={signOut}
          style={{
            background: "red",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: "5px",
            cursor: "pointer",
            marginTop: "10px",
          }}
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Datos del perfil */}
      <div style={{ marginTop: "20px" }}>
        <h3>Perfil</h3>
        <p><strong>Nombre:</strong> {user.displayName}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Tipo de Plan:</strong> {plan}</p>

        {plan !== "Exclusivo" && (
          <>
            <p><strong>Operaciones:</strong> {operationsCount}/200</p>
            <p><strong>Exportaciones:</strong> {exportsCount}/40</p>
            <small style={{ color: "#bbb" }}>Actualizar tus Límites</small>
          </>
        )}

        {plan === "Exclusivo" && (
          <>
            <p><strong>Operaciones:</strong> {operationsCount}</p>
            <p><strong>Exportaciones:</strong> {exportsCount}</p>
          </>
        )}
      </div>

      {/* Plan Premium solo si no es dueño */}
      {plan !== "Exclusivo" && (
        <div style={{ marginTop: "30px" }}>
          <h3>Plan Premium - $13/mes</h3>
          <p>Accede a operaciones y exportaciones ilimitadas.</p>
          <p style={{ fontSize: "14px", color: "#bbb" }}>
            Métodos de pago: Paypal | Binance Pay | Blockchain Pay
          </p>
          <button
            style={{
              background: "#FFD700",
              color: "#000",
              padding: "10px 20px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              marginTop: "10px",
            }}
          >
            Actualizar a Premium
          </button>
        </div>
      )}

      {/* Soporte */}
      <div style={{ marginTop: "30px" }}>
        <h3>Soporte</h3>
        <p style={{ color: "#bbb" }}>Contactar Soporte</p>
      </div>
    </div>
  );
};

export default Profile;