import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AuthForms from "./components/AuthForms";
import NavigationBar from "./components/NavigationBar";
import Dashboard from "./components/Dashboard";
import UnifiedSimulator from "./components/UnifiedSimulator";
import ArbitrageSessions from "./components/ArbitrageSessions";
import Operations from "./components/Operations";
import History from "./components/History";
import Profile from "./components/Profile";
import SectionErrorBoundary from "./components/SectionErrorBoundary";
import BinanceP2PAutoSync from "./components/BinanceP2PAutoSync";
import {
  FaArrowRight,
  FaCalculator,
  FaChartLine,
  FaCheck,
  FaFileAlt,
  FaLock,
  FaMoneyBillWave,
  FaMoon,
  FaSun,
  FaShieldAlt,
  FaSignInAlt,
  FaSyncAlt,
  FaKey,
} from "react-icons/fa";
import "./App.css";

const features = [
  {
    number: "01",
    icon: FaMoneyBillWave,
    title: "Operaciones bajo control",
    description:
      "Importa órdenes P2P completadas de Binance y registra también tus operaciones con sus datos claramente identificados.",
    tag: "BINANCE P2P + REGISTRO",
  },
  {
    number: "02",
    icon: FaChartLine,
    title: "Resultados comprensibles",
    description:
      "Consulta el beneficio realizado por moneda y separa los importes en USD, USDT, EUR y otras divisas.",
    tag: "CÁLCULO FIFO",
  },
  {
    number: "03",
    icon: FaCalculator,
    title: "Simula antes de actuar",
    description:
      "Evalúa operaciones P2P y escenarios de arbitraje con sus comisiones, sin ejecutar órdenes.",
    tag: "SIMULACIÓN",
  },
  {
    number: "04",
    icon: FaFileAlt,
    title: "Historial exportable",
    description:
      "Busca, filtra y descarga tus registros para revisarlos o analizarlos en una hoja de cálculo.",
    tag: "EXPORTACIÓN EXCEL",
  },
];

const MainApp = () => {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState(() => {
    try { return window.localStorage.getItem("jjx-theme") || "dark"; }
    catch { return "dark"; }
  });

  useEffect(() => {
    document.documentElement.dataset.jjxTheme = theme;
    try { window.localStorage.setItem("jjx-theme", theme); } catch { /* storage may be unavailable */ }
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setActiveTab("dashboard");
      return;
    }

    // Google can authenticate before its popup handler finishes. Close the
    // auth dialog from the confirmed Firebase session as a reliable fallback.
    setShowAuth(null);
  }, [user?.uid]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const openAuth = (mode) => setShowAuth(mode);
  const closeAuth = () => setShowAuth(null);

  if (!user) {
    return (
      <div className="jjx-landing">
        <div className="landing-atmosphere" aria-hidden="true">
          <span className="landing-orb landing-orb-one" />
          <span className="landing-orb landing-orb-two" />
          <span className="landing-grid" />
        </div>

        <header className={`landing-header ${scrolled ? "landing-header-scrolled" : ""}`}>
          <a className="landing-brand" href="#inicio" aria-label="JJXCAPITAL, inicio">
            <span className="landing-brand-mark" aria-hidden="true"><img src={`${process.env.PUBLIC_URL}/jjxcapital-mark.svg`} alt="" /></span>
            <span className="landing-brand-copy">
              <strong>JJXCAPITAL</strong>
              <small>CONTROL · ANÁLISIS · CLARIDAD</small>
            </span>
          </a>
          <div className="landing-header-actions">
            <span className="landing-header-note"><span className="status-dot" /> Acceso público · cuenta propia</span>
            <button className="landing-button landing-button-quiet" type="button" onClick={() => openAuth("login")}>
              <FaSignInAlt aria-hidden="true" />
              Iniciar sesión
            </button>
          </div>
        </header>

        <main id="inicio" className="landing-main">
          <section className="landing-hero">
            <div className="landing-hero-copy">
              <div className="landing-eyebrow">
                <span className="eyebrow-line" />
                GESTIÓN DE OPERACIONES CRIPTO
              </div>
              <h1>
                Binance P2P.
                <br />
                <span>Bajo tu control.</span>
                <br />
                Con claridad.
              </h1>
              <p className="landing-lead">
                JJXCAPITAL importa automáticamente tus nuevas órdenes P2P completadas mediante una API de solo lectura y las organiza junto a tus sesiones de arbitraje.
              </p>

              <div className="landing-hero-actions">
                <button
                  className="landing-button landing-button-primary"
                  type="button"
                  onClick={() => openAuth("register")}
                  aria-label="Crear una cuenta gratis"
                >
                  Crear cuenta gratis
                  <FaArrowRight aria-hidden="true" />
                </button>
                <button
                  className="landing-button landing-button-secondary"
                  type="button"
                  onClick={() => openAuth("login")}
                >
                  Ya tengo una cuenta
                </button>
              </div>

              <div className="landing-assurances">
                <span><FaCheck aria-hidden="true" /> Sin permisos para operar</span>
                <span><FaCheck aria-hidden="true" /> Sin permisos de retirada</span>
                <span><FaCheck aria-hidden="true" /> Historial organizado</span>
              </div>
            </div>

            <div className="landing-preview-wrap">
              <div className="landing-preview-glow" aria-hidden="true" />
              <section className="landing-preview" aria-label="Vista previa del panel de la aplicación">
                <div className="preview-topbar">
                  <div className="preview-brand">
                    <span className="preview-brand-mark"><img src={`${process.env.PUBLIC_URL}/jjxcapital-mark.svg`} alt="" /></span>
                    <span><strong>JJXCAPITAL</strong><small>RESUMEN DE CUENTA</small></span>
                  </div>
                  <span className="preview-pill"><span className="status-dot" /> Vista previa</span>
                </div>
                <div className="preview-welcome">
                  <div>
                    <span className="preview-overline">TU ACTIVIDAD, DE UN VISTAZO</span>
                    <h2>Panel financiero</h2>
                    <p>Una vista organizada de tus registros.</p>
                  </div>
                  <span className="preview-spark" aria-hidden="true"><FaChartLine /></span>
                </div>
                <div className="preview-metrics">
                  <div className="preview-metric preview-metric-featured">
                    <span>Beneficio realizado</span>
                    <strong>—</strong>
                    <small>Por moneda · cálculo FIFO</small>
                  </div>
                  <div className="preview-metric">
                    <span>Operaciones</span>
                    <strong>—</strong>
                    <small>Registros guardados</small>
                  </div>
                </div>
                <div className="preview-section-heading">
                  <span>ÁREAS DE TRABAJO</span>
                  <span>04 módulos</span>
                </div>
                <div className="preview-module-list">
                  <div className="preview-module"><span className="module-icon module-purple"><FaMoneyBillWave /></span><span><strong>Operaciones</strong><small>Compras y ventas</small></span><FaArrowRight className="module-arrow" /></div>
                  <div className="preview-module"><span className="module-icon module-blue"><FaCalculator /></span><span><strong>Simuladores</strong><small>P2P y arbitraje</small></span><FaArrowRight className="module-arrow" /></div>
                  <div className="preview-module"><span className="module-icon module-teal"><FaChartLine /></span><span><strong>Historial</strong><small>Filtros y exportación</small></span><FaArrowRight className="module-arrow" /></div>
                </div>
                <p className="preview-disclaimer">Vista ilustrativa · No representa datos de una cuenta real</p>
              </section>
              <div className="landing-preview-caption"><span className="caption-lock"><FaLock aria-hidden="true" /></span> Diseñado para mantener cada operación clara y trazable.</div>
            </div>
          </section>

          <section className="landing-binance" aria-labelledby="landing-binance-title">
            <div className="landing-binance-copy">
              <span className="landing-eyebrow"><span className="eyebrow-line" /> INTEGRACIÓN BINANCE P2P</span>
              <h2 id="landing-binance-title">Tus órdenes, <span>en su sitio.</span></h2>
              <p>
                Conecta una API limitada a consulta. Mientras usas JJXCAPITAL, la plataforma comprueba nuevas órdenes completadas y las incorpora a tu historial para que puedas analizarlas.
              </p>
              <ul className="landing-binance-assurances">
                <li><FaCheck aria-hidden="true" /><span>Importación automática de órdenes completadas desde que conectas la API.</span></li>
                <li><FaCheck aria-hidden="true" /><span>La clave no necesita permisos para crear operaciones ni retirar fondos.</span></li>
                <li><FaCheck aria-hidden="true" /><span>Los registros se mantienen dentro de tu cuenta de JJXCAPITAL.</span></li>
              </ul>
              <button className="landing-button landing-button-secondary landing-binance-cta" type="button" onClick={() => openAuth("register")}>
                Conocer la plataforma <FaArrowRight aria-hidden="true" />
              </button>
            </div>

            <div className="landing-binance-visual" aria-label="Vista ilustrativa del flujo de sincronización P2P">
              <div className="binance-card-glow" aria-hidden="true" />
              <div className="binance-card">
                <div className="binance-card-header">
                  <div className="binance-provider-icon"><FaSyncAlt aria-hidden="true" /></div>
                  <div className="binance-provider-copy"><strong>Binance P2P</strong><span>Conexión de historial</span></div>
                  <span className="binance-readonly-pill"><FaKey aria-hidden="true" /> Solo lectura</span>
                </div>
                <div className="binance-card-divider" />
                <div className="binance-flow-heading"><span>FLUJO DE SINCRONIZACIÓN</span><span>3 pasos</span></div>
                <div className="binance-flow">
                  <div className="binance-flow-step"><span className="binance-flow-index"><FaKey aria-hidden="true" /></span><span><strong>Conectas tu API</strong><small>Permisos de consulta</small></span><FaCheck className="binance-flow-check" aria-hidden="true" /></div>
                  <div className="binance-flow-connector" aria-hidden="true" />
                  <div className="binance-flow-step"><span className="binance-flow-index"><FaSyncAlt aria-hidden="true" /></span><span><strong>Se importan las nuevas órdenes</strong><small>Solo órdenes P2P completadas</small></span><FaCheck className="binance-flow-check" aria-hidden="true" /></div>
                  <div className="binance-flow-connector" aria-hidden="true" />
                  <div className="binance-flow-step"><span className="binance-flow-index"><FaChartLine aria-hidden="true" /></span><span><strong>Revisas y analizas</strong><small>Desde tu historial JJXCAPITAL</small></span><FaArrowRight className="binance-flow-arrow" aria-hidden="true" /></div>
                </div>
                <div className="binance-card-footer"><FaShieldAlt aria-hidden="true" /><span>La API no puede operar ni retirar fondos</span></div>
              </div>
              <p className="binance-visual-caption">La sincronización requiere conectar tu cuenta de Binance.</p>
            </div>
          </section>

          <section className="landing-principles" aria-label="Principios de JJXCAPITAL">
            <div className="principle-item">
              <span className="principle-number">01</span>
              <div><strong>Claridad financiera</strong><p>USD, USDT y EUR no se mezclan como si fueran la misma moneda.</p></div>
            </div>
            <div className="principle-item">
              <span className="principle-number">02</span>
              <div><strong>Decisiones informadas</strong><p>Simula resultados y revisa las comisiones antes de sacar conclusiones.</p></div>
            </div>
            <div className="principle-item">
              <span className="principle-number">03</span>
              <div><strong>Control de tus datos</strong><p>Consulta tus registros y exporta el historial cuando lo necesites.</p></div>
            </div>
          </section>

          <section className="landing-features" id="funciones">
            <div className="landing-section-heading">
              <span className="landing-eyebrow"><span className="eyebrow-line" /> TODO LO ESENCIAL, BIEN ORGANIZADO</span>
              <h2>Herramientas para trabajar<br /><span>con más perspectiva.</span></h2>
              <p>Herramientas para organizar operaciones manuales y órdenes P2P sincronizadas, revisar resultados y simular escenarios con claridad.</p>
            </div>
            <div className="landing-feature-grid">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article className="landing-feature-card" key={feature.number}>
                    <div className="feature-card-top">
                      <span className="feature-icon"><Icon aria-hidden="true" /></span>
                      <span className="feature-number">{feature.number}</span>
                    </div>
                    <span className="feature-tag">{feature.tag}</span>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                    <span className="feature-bottom-line" aria-hidden="true" />
                  </article>
                );
              })}
            </div>
          </section>

          <section className="landing-cta">
            <div className="cta-emblem"><FaShieldAlt aria-hidden="true" /></div>
            <div className="cta-copy">
              <span className="landing-eyebrow"><span className="eyebrow-line" /> EMPIEZA CON ORDEN</span>
              <h2>Todo empieza con<br /><span>un buen registro.</span></h2>
              <p>Crea tu cuenta y organiza tus operaciones desde un espacio de trabajo claro y accesible.</p>
            </div>
            <div className="cta-actions">
              <button className="landing-button landing-button-primary" type="button" onClick={() => openAuth("register")}>
                Crear cuenta gratis <FaArrowRight aria-hidden="true" />
              </button>
              <span>La conexión de Binance solo sincroniza historial; nunca ejecuta órdenes.</span>
            </div>
          </section>

          <footer className="landing-footer">
            <a className="landing-brand landing-brand-footer" href="#inicio" aria-label="Volver al inicio de JJXCAPITAL">
              <span className="landing-brand-mark" aria-hidden="true"><img src={`${process.env.PUBLIC_URL}/jjxcapital-mark.svg`} alt="" /></span>
              <span className="landing-brand-copy"><strong>JJXCAPITAL</strong><small>CONTROL · ANÁLISIS · CLARIDAD</small></span>
            </a>
            <p>Herramienta de organización y simulación financiera. No constituye asesoramiento de inversión.</p>
            <a href="mailto:soportejjxcapital@gmail.com">Contactar con soporte</a>
          </footer>
        </main>

        {showAuth && (
          <AuthForms
            mode={showAuth}
            onClose={closeAuth}
            onSwitchMode={(newMode) => setShowAuth(newMode)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="app-content">
        <SectionErrorBoundary key={activeTab} onReturn={() => handleTabChange("dashboard")}>
          {activeTab === "dashboard" && (
            <Dashboard
              theme={theme}
              onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
              onOpenProfile={() => handleTabChange("profile")}
              onOpenOperations={() => handleTabChange("operations")}
              onOpenHistory={() => handleTabChange("history")}
              onOpenArbitrages={() => handleTabChange("sessions")}
            />
          )}
          {activeTab === "simulator" && <UnifiedSimulator />}
          {activeTab === "sessions" && <ArbitrageSessions onOpenOperations={(sessionId) => {
            setSelectedSessionId(sessionId);
            handleTabChange("operations");
          }} />}
          {activeTab === "operations" && <Operations initialSessionId={selectedSessionId} onOpenArbitrages={() => handleTabChange("sessions")} />}
          {activeTab === "history" && <History />}
          {activeTab === "profile" && <Profile />}
        </SectionErrorBoundary>
      </main>
      <NavigationBar activeTab={activeTab} onTabChange={handleTabChange} />
      <BinanceP2PAutoSync />
      {showAuth && (
        <AuthForms
          mode={showAuth}
          onClose={closeAuth}
          onSwitchMode={(newMode) => setShowAuth(newMode)}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
