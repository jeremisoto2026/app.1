import React, { useEffect, useState } from "react";
import "./App.css";
import { useAuth } from "./contexts/AuthContext";
import { saveOperation, loadOperations } from "./db";

type Op = {
  id?: string;
  base: string;
  quote: string;
  priceBuy: number;
  priceSell: number;
  profit: number;
  ts?: any;
};

export default function App() {
  const { user, loginWithGoogle, logout } = useAuth();
  const [ops, setOps] = useState<Op[]>([]);
  const [form, setForm] = useState({
    base: "",
    quote: "",
    priceBuy: "",
    priceSell: ""
  });

  // Cuando el usuario inicia sesión, cargar operaciones
  useEffect(() => {
    async function fetchOps() {
      if (!user) {
        setOps([]);
        return;
      }
      const list = await loadOperations(user.uid);
      setOps(list as Op[]);
    }
    fetchOps();
  }, [user]);

  // Guardar operación
  async function handleSaveOp() {
    if (!user) return alert("Inicia sesión para guardar operaciones");
    const base = form.base.trim();
    const quote = form.quote.trim();
    const priceBuy = parseFloat(form.priceBuy || "0");
    const priceSell = parseFloat(form.priceSell || "0");

    if (!base || !quote) return alert("Base y Quote son obligatorios");

    try {
      await saveOperation(user.uid, base, quote, priceBuy, priceSell);
      setForm({ base: "", quote: "", priceBuy: "", priceSell: "" });
      const list = await loadOperations(user.uid);
      setOps(list as Op[]);
    } catch (e: any) {
      alert("Error guardando operación: " + e.message);
    }
  }

  return (
    <div>
      {/* HERO */}
      <section id="hero">
        <div className="logo">JJXCAPITAL ⚡</div>
        <p className="tagline">Seguridad, velocidad y confianza</p>
        <button
          id="btn-simulador"
          onClick={() => alert("Simulador (pendiente)")}
        >
          🔄 Ir al Simulador
        </button>

        {!user && (
          <div id="auth-buttons">
            <button id="btn-login" onClick={loginWithGoogle}>
              🚀 Iniciar Sesión con Google
            </button>
          </div>
        )}
      </section>

      {/* PROFILE */}
      {user && (
        <section id="profile">
          <h2>👤 Mi Perfil</h2>
          <p>Nombre: <span>{user?.displayName ?? "—"}</span></p>
          <p>Email: <span>{user?.email ?? "—"}</span></p>
          <p>
            Miembro desde:{" "}
            <span>
              {user?.metadata?.creationTime
                ? new Date(user.metadata.creationTime).toLocaleDateString()
                : "—"}
            </span>
          </p>
          <p>Estado: <span>Plan Gratuito</span></p>
          <button onClick={logout}>🚪 Cerrar Sesión</button>
        </section>
      )}

      {/* PAYMENTS */}
      {user && (
        <section id="payments">
          <h2>💎 Plan PREMIUM - $15 USD/mes</h2>
          <div className="payment-methods">
            <div className="payment-method">
              <h4>💳 PayPal</h4>
              <div id="paypal-button-container">(PayPal)</div>
            </div>
          </div>
        </section>
      )}

      {/* DASHBOARD / OPERATIONS */}
      {user && (
        <section id="dashboard">
          <h2>📊 Mis Operaciones</h2>
          <div style={{ marginBottom: 12 }}>
            <input
              id="base"
              placeholder="Base (BTC)"
              value={form.base}
              onChange={(e) => setForm({ ...form, base: e.target.value })}
            />
            <input
              id="quote"
              placeholder="Quote (USDT)"
              value={form.quote}
              onChange={(e) => setForm({ ...form, quote: e.target.value })}
            />
            <input
              id="price-buy"
              type="number"
              step="0.01"
              placeholder="Precio Compra"
              value={form.priceBuy}
              onChange={(e) =>
                setForm({ ...form, priceBuy: e.target.value })
              }
            />
            <input
              id="price-sell"
              type="number"
              step="0.01"
              placeholder="Precio Venta"
              value={form.priceSell}
              onChange={(e) =>
                setForm({ ...form, priceSell: e.target.value })
              }
            />
            <button id="btn-save-op" onClick={handleSaveOp}>
              💾 Guardar
            </button>
          </div>
          <ul id="ops-list">
            {ops.map((o, i) => (
              <li key={i}>
                {o.base}/{o.quote} → Profit: {o.profit}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* NAV */}
      {user && (
        <nav id="app-nav">
          <a href="#dashboard">
            🏠 <span className="nav-label">Dashboard</span>
          </a>
          <a href="#arbitraje">
            ⚡ <span className="nav-label">Arbitraje</span>
          </a>
          <a href="#historial">
            📜 <span className="nav-label">Historial</span>
          </a>
          <a href="#p2p">
            🤝 <span className="nav-label">P2P</span>
          </a>
          <a href="#premium">
            💎 <span className="nav-label">Premium</span>
          </a>
        </nav>
      )}
    </div>
  );
}