import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../services/database";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

const OWNER_UID = "WYNmwLw2vwUfUaA2eRmsH3Biw0";

const Profile = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [operationsCount, setOperationsCount] = useState(0);
  const [exportsCount, setExportsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        let plan = "free";

        // 🔹 Si es el dueño → plan exclusivo
        if (user.uid === OWNER_UID) {
          plan = "exclusive";
          setUserData({
            name: "Jeremi",
            lastName: "Soto",
            email: user.email,
            plan: "exclusive",
          });
        } else {
          // 🔹 Datos normales del usuario desde Firestore
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            plan = data.plan || "free";
            setUserData({ ...data, email: user.email, plan });
          } else {
            setUserData({ plan: "free", email: user.email });
          }
        }

        // 🔹 Contar operaciones (subcolección dentro del usuario)
        const opsRef = collection(db, "users", user.uid, "operations");
        const opsSnap = await getDocs(opsRef);
        setOperationsCount(opsSnap.size);

        // 🔹 Contar exportaciones (subcolección dentro del usuario)
        const exportsRef = collection(db, "users", user.uid, "exports");
        const exportsSnap = await getDocs(exportsRef);
        setExportsCount(exportsSnap.size);

      } catch (error) {
        console.error("Error cargando datos del usuario:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  if (loading) return <p>Cargando datos...</p>;
  if (!userData) return <p>No se pudieron cargar los datos del usuario.</p>;

  return (
    <div className="profile-container">
      <h2>Perfil del Usuario</h2>
      <p><strong>Nombre:</strong> {userData.name || "No registrado"}</p>
      <p><strong>Apellido:</strong> {userData.lastName || "No registrado"}</p>
      <p><strong>Email:</strong> {userData.email}</p>

      <div className="limits-card">
        <h3>Plan Actual: {userData.plan === "free" ? "Gratuito" : userData.plan}</h3>

        {userData.plan === "free" && (
          <>
            <p>Operaciones: {operationsCount} / 200</p>
            <p>Exportaciones: {exportsCount} / 40</p>
            <button>Actualizar tus Límites</button>
          </>
        )}

        {userData.plan === "premium" && (
          <p>✅ Operaciones y Exportaciones Ilimitadas</p>
        )}

        {userData.plan === "exclusive" && (
          <p>👑 Plan Exclusivo — Sin límites (Dueño)</p>
        )}
      </div>

      {userData.plan !== "exclusive" && (
        <div className="premium-card">
          <h3>Plan Premium</h3>
          <p>Acceso ilimitado por solo <strong>13$/mes</strong></p>
          <button>PayPal</button>
          <button>Binance Pay</button>
          <button>Blockchain Pay</button>
        </div>
      )}

      <div className="support-card">
        <h3>Soporte</h3>
        <button>Contactar Soporte</button>
      </div>
    </div>
  );
};

export default Profile;