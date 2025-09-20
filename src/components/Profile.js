// src/components/Profile.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getUserOperations,
  getUserPreferences,
  saveUserPreferences,
} from "../services/database";

const OWNER_UID = "WYNmwLw2vwUfUaA2eRmsH3Biw0";

const Profile = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    operationsCount: 0,
    exportsCount: 0,
  });
  const [plan, setPlan] = useState("Gratuito");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // 🔹 Cargar operaciones
        const operations = await getUserOperations(user.uid);
        const operationsCount = operations.length;

        // 🔹 Cargar preferencias (para contar exportaciones)
        const preferences = await getUserPreferences(user.uid);
        const exportsCount = preferences.exportsCount || 0;

        // 🔹 Plan según UID
        let userPlan = "Gratuito";
        if (user.uid === OWNER_UID) {
          userPlan = "Exclusivo";
        } else if (preferences.plan === "Premium") {
          userPlan = "Premium";
        }

        setStats({
          operationsCount,
          exportsCount,
        });
        setPlan(userPlan);
      } catch (error) {
        console.error("Error loading profile data:", error);
      }
    };

    fetchData();
  }, [user]);

  if (!user) {
    return <p>Cargando usuario...</p>;
  }

  return (
    <div className="profile">
      <h2>Perfil</h2>

      <div className="user-info">
        <p>
          <strong>Nombre:</strong> {user.displayName || "Sin nombre"}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
      </div>

      {/* 🔹 Plan y limitaciones */}
      <div className="plan-info">
        <h3>Tipo de Plan: {plan}</h3>

        {plan === "Gratuito" && (
          <div className="limitations">
            <p>
              <strong>Operaciones:</strong> {stats.operationsCount}/200
            </p>
            <p>
              <strong>Exportaciones:</strong> {stats.exportsCount}/200
            </p>
            <button>Actualizar tus Límites</button>
          </div>
        )}

        {plan === "Premium" && (
          <div className="premium-info">
            <p>✅ Operaciones y exportaciones ilimitadas.</p>
          </div>
        )}

        {plan === "Exclusivo" && (
          <div className="exclusive-info">
            <p>👑 Plan exclusivo para el dueño.</p>
          </div>
        )}
      </div>

      {/* 🔹 Oferta de plan Premium */}
      {plan === "Gratuito" && (
        <div className="premium-offer">
          <h3>Plan Premium - $13/mes</h3>
          <p>Accede a operaciones y exportaciones ilimitadas.</p>
          <div className="payment-methods">
            <button>Paypal</button>
            <button>Binance Pay</button>
            <button>Blockchain Pay</button>
          </div>
        </div>
      )}

      {/* 🔹 Soporte */}
      <div className="support">
        <h3>Soporte</h3>
        <button>Contactar Soporte</button>
      </div>
    </div>
  );
};

export default Profile;