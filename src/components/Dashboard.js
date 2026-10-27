import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { calculateDashboardSummaryMetrics } from "../utils/financialCalculations";
import {
  ArrowDownTrayIcon,
  ArrowRightIcon,
  ArrowTrendingUpIcon,
  ChartBarSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  BoltIcon,
  CurrencyDollarIcon,
  DocumentPlusIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

const emptyMetrics = {
  totalOperations: 0,
  profitByCurrency: {},
  monthlyProfitByCurrency: {},
  successRate: 0,
  closedSales: 0,
  winningSales: 0,
};

const Dashboard = ({ onOpenProfile, onOpenOperations, onOpenHistory, onOpenArbitrages }) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [activeArbitrages, setActiveArbitrages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionsWarning, setSessionsWarning] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchDashboard = async () => {
      if (!user) {
        setMetrics(emptyMetrics);
        setActiveArbitrages(0);
        setError("");
        setSessionsWarning("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setSessionsWarning("");
      try {
        const snapshot = await getDocs(collection(db, "users", user.uid, "operations"));
        const operations = snapshot.docs.map((operationDoc) => ({
          id: operationDoc.id,
          ...operationDoc.data(),
        }));
        let activeCount = 0;
        let sessions = [];
        try {
          const sessionsSnapshot = await getDocs(collection(db, "users", user.uid, "sessions"));
          sessions = sessionsSnapshot.docs.map((sessionDoc) => ({
            id: sessionDoc.id,
            ...sessionDoc.data(),
          }));
          activeCount = sessions.filter((session) => session.status === "active").length;
        } catch (sessionsError) {
          // Keep operation-level figures available if session access is denied.
          console.warn("No se pudieron cargar los arbitrajes del resumen:", sessionsError);
          if (!cancelled) setSessionsWarning("No se pudieron cargar los arbitrajes. Las métricas de operaciones siguen visibles, pero los resultados de sesiones iniciadas en cripto y el contador de arbitrajes pueden estar incompletos. Comprueba las reglas de Firestore.");
        }
        const calculated = calculateDashboardSummaryMetrics(operations, sessions);
        if (!cancelled) {
          setMetrics(calculated);
          setActiveArbitrages(activeCount);
        }
      } catch (loadError) {
        console.error("Error al cargar el resumen:", loadError);
        if (!cancelled) setError("No se ha podido cargar el resumen. Comprueba tu conexión y vuelve a intentarlo.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDashboard();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const profitEntries = useMemo(
    () => Object.entries(metrics.profitByCurrency || {}).filter(([, amount]) => Number.isFinite(amount))
      .sort(([a], [b]) => a.localeCompare(b)),
    [metrics.profitByCurrency]
  );
  const monthlyEntries = useMemo(
    () => Object.entries(metrics.monthlyProfitByCurrency || {}).filter(([, amount]) => Number.isFinite(amount))
      .sort(([a], [b]) => a.localeCompare(b)),
    [metrics.monthlyProfitByCurrency]
  );
  const monthlyScale = Math.max(1, ...monthlyEntries.map(([, amount]) => Math.abs(amount)));

  const formatAmount = (amount, currency) => {
    const formatted = new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${formatted} ${currency}`;
  };

  if (loading) {
    return (
      <div className="dashboard-state" role="status" aria-live="polite">
        <span className="dashboard-loader" aria-hidden="true" />
        <strong>Preparando tu resumen</strong>
        <p>Estamos cargando tus operaciones guardadas.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-state dashboard-state-error" role="alert">
        <span className="dashboard-state-icon"><ChartBarSquareIcon aria-hidden="true" /></span>
        <h2>No se pudo cargar el resumen</h2>
        <p>{error}</p>
        <button type="button" className="dashboard-action dashboard-action-primary" onClick={() => window.location.reload()}>
          Volver a intentar <ArrowRightIcon aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {sessionsWarning && (
          <div role="status" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-900/10 p-4 text-sm text-amber-100">
            {sessionsWarning}
          </div>
        )}
        <header className="dashboard-topbar">
          <div className="dashboard-brand">
            <span className="dashboard-brand-mark" aria-hidden="true">J</span>
            <span><strong>JJXCAPITAL</strong><small>ESPACIO DE TRABAJO</small></span>
          </div>
          <button
            type="button"
            className="dashboard-profile-button"
            onClick={onOpenProfile}
            aria-label="Abrir perfil y configuración de cuenta"
          >
            {user?.photoURL
              ? <img src={user.photoURL} alt="" className="dashboard-avatar" />
              : <UserCircleIcon aria-hidden="true" />}
            <span>Mi perfil</span>
          </button>
        </header>

        <section className="dashboard-welcome">
          <div>
            <div className="dashboard-eyebrow"><span /> RESUMEN DE ACTIVIDAD</div>
            <h1>Tu actividad, <span>bajo control.</span></h1>
            <p>
              {user?.displayName
                ? `Hola, ${user.displayName.split(" ")[0]}. Aquí tienes el estado de tus operaciones.`
                : "Consulta tus registros y resultados desde un solo lugar."}
            </p>
          </div>
          <div className="dashboard-welcome-actions">
            <button type="button" className="dashboard-action dashboard-action-primary" onClick={onOpenOperations}>
              <DocumentPlusIcon aria-hidden="true" /> Registrar operación
            </button>
            <button type="button" className="dashboard-action dashboard-action-secondary" onClick={onOpenHistory}>
              Ver historial <ArrowRightIcon aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="dashboard-metrics" aria-label="Indicadores principales">
          <article className="dashboard-metric-card">
            <div className="metric-card-heading">
              <span>Operaciones registradas</span>
              <span className="metric-icon metric-icon-blue"><ChartBarSquareIcon aria-hidden="true" /></span>
            </div>
            <strong className="metric-primary-value">{metrics.totalOperations}</strong>
            <p>Compras y ventas guardadas</p>
            <span className="metric-card-foot"><CheckCircleIcon aria-hidden="true" /> Datos de tu historial</span>
          </article>

          <article className="dashboard-metric-card dashboard-metric-featured">
            <div className="metric-card-heading">
              <span>Beneficio realizado</span>
              <span className="metric-icon metric-icon-purple"><CurrencyDollarIcon aria-hidden="true" /></span>
            </div>
            <div className="metric-currency-values">
              {profitEntries.length ? profitEntries.map(([currency, amount]) => (
                <strong key={currency} className={amount > 0 ? "metric-positive" : amount < 0 ? "metric-negative" : ""}>
                  {formatAmount(amount, currency)}
                </strong>
              )) : <strong className="metric-no-data">Sin datos suficientes</strong>}
            </div>
            <p>Por unidad de cuenta: fiat o cripto</p>
            <span className="metric-card-foot"><ShieldCheckIcon aria-hidden="true" /> Fiat por FIFO; cripto según el resultado neto de su sesión</span>
          </article>

          <article className="dashboard-metric-card">
            <div className="metric-card-heading">
              <span>Operaciones cerradas</span>
              <span className="metric-icon metric-icon-teal"><CheckCircleIcon aria-hidden="true" /></span>
            </div>
            <strong className="metric-primary-value">{metrics.closedSales}</strong>
            <p>Ventas cubiertas y ciclos cripto completados</p>
            <span className="metric-card-foot"><ClockIcon aria-hidden="true" /> Excluye ventas parciales y ciclos sin recompra</span>
          </article>

          <article className="dashboard-metric-card">
            <div className="metric-card-heading">
              <span>Tasa de éxito</span>
              <span className="metric-icon metric-icon-blue"><ArrowTrendingUpIcon aria-hidden="true" /></span>
            </div>
            <strong className="metric-primary-value">
              {metrics.closedSales ? `${metrics.successRate.toFixed(1)}%` : "—"}
            </strong>
            <p>{metrics.closedSales ? `${metrics.winningSales || 0} operaciones cerradas con resultado positivo` : "Se calculará al cerrar ventas cubiertas o completar ciclos cripto"}</p>
            <span className="metric-card-foot"><ShieldCheckIcon aria-hidden="true" /> No representa una garantía futura</span>
          </article>

          <article className="dashboard-metric-card">
            <div className="metric-card-heading">
              <span>Arbitrajes en curso</span>
              <span className="metric-icon metric-icon-purple"><BoltIcon aria-hidden="true" /></span>
            </div>
            <strong className="metric-primary-value">{activeArbitrages}</strong>
            <p>Espacios de trabajo aún abiertos</p>
            <button type="button" className="dashboard-text-action mt-2" onClick={onOpenArbitrages}>Gestionar arbitrajes <ArrowRightIcon aria-hidden="true" /></button>
          </article>
        </section>

        <section className="dashboard-lower-grid">
          <article className="dashboard-panel">
            <header className="dashboard-panel-heading">
              <div>
                <span className="dashboard-panel-kicker">EVOLUCIÓN RECIENTE</span>
                <h2>Últimos 30 días</h2>
                <p>Beneficio realizado, agrupado por moneda.</p>
              </div>
              <span className="panel-heading-icon"><ArrowTrendingUpIcon aria-hidden="true" /></span>
            </header>

            {monthlyEntries.length ? (
              <div className="monthly-profit-list">
                {monthlyEntries.map(([currency, amount]) => (
                  <div className="monthly-profit-row" key={currency}>
                    <div className="monthly-profit-label">
                      <span className="currency-code">{currency}</span>
                      <strong className={amount > 0 ? "metric-positive" : amount < 0 ? "metric-negative" : ""}>
                        {formatAmount(amount, currency)}
                      </strong>
                    </div>
                    <div className="monthly-profit-track" aria-label={`Magnitud relativa del resultado en ${currency}`}>
                      <span
                        className={amount < 0 ? "monthly-profit-bar monthly-profit-bar-negative" : "monthly-profit-bar"}
                        style={{ width: `${Math.max(3, Math.abs(amount) / monthlyScale * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <span className="empty-state-icon"><ClockIcon aria-hidden="true" /></span>
                <strong>Aún no hay resultados recientes</strong>
                <p>Cuando registres compras y ventas con fechas y costes válidos, este espacio mostrará el beneficio calculado.</p>
                <button type="button" className="dashboard-text-action" onClick={onOpenOperations}>
                  Registrar una operación <ArrowRightIcon aria-hidden="true" />
                </button>
              </div>
            )}
            <p className="dashboard-panel-note">Cada moneda se muestra por separado; las magnitudes del gráfico no son comparables entre divisas.</p>
          </article>

          <article className="dashboard-panel">
            <header className="dashboard-panel-heading">
              <div>
                <span className="dashboard-panel-kicker">FLUJO RECOMENDADO</span>
                <h2>Un registro fiable empieza aquí</h2>
                <p>Pequeños pasos para que los cálculos tengan sentido.</p>
              </div>
              <span className="panel-heading-icon"><ShieldCheckIcon aria-hidden="true" /></span>
            </header>
            <div className="dashboard-guidance-list">
              <div className="guidance-item">
                <span className="guidance-index">01</span>
                <div><strong>Registra primero las compras</strong><p>Guarda la cantidad recibida, el coste y las comisiones.</p></div>
              </div>
              <div className="guidance-item">
                <span className="guidance-index">02</span>
                <div><strong>Introduce ventas con sus datos reales</strong><p>Usa la moneda de cotización correcta y la fecha de la operación.</p></div>
              </div>
              <div className="guidance-item">
                <span className="guidance-index">03</span>
                <div><strong>Revisa y exporta el historial</strong><p>Comprueba los filtros y conserva una copia de tus registros.</p></div>
              </div>
            </div>
            <button type="button" className="dashboard-panel-link" onClick={onOpenHistory}>
              <ArrowDownTrayIcon aria-hidden="true" /> Abrir historial y exportación <ArrowRightIcon aria-hidden="true" />
            </button>
          </article>
        </section>

        <footer className="dashboard-disclaimer">
          <ShieldCheckIcon aria-hidden="true" />
          <p>JJXCAPITAL organiza operaciones que introduces manualmente. Los simuladores son estimaciones; no conectan con exchanges ni ejecutan órdenes.</p>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
