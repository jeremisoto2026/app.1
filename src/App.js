import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AuthForms from "./components/AuthForms";
import NavigationBar from "./components/NavigationBar";
import Dashboard from "./components/Dashboard";
import P2PSimulator from "./components/P2PSimulator";
import ArbitrageSimulator from "./components/ArbitrageSimulator";
import Operations from "./components/Operations";
import History from "./components/History";
import Profile from "./components/Profile";
import {
  FaArrowRight,
  FaCalculator,
  FaChartLine,
  FaCheck,
  FaFileAlt,
  FaMoneyBillWave,
  FaShieldAlt,
  FaSignInAlt,
} from "react-icons/fa";
import "./App.css";

const features = [
  {
    number: "01",
    icon: FaMoneyBillWave,
    title: "Operaciones bajo control",
    description:
      "Registra compras y ventas con cantidades, precios, plataforma y comisiones claramente identificados.",
    tag: "REGISTRO MANUAL",
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
    tag: "EXPORTACIÓN CSV",
  },
];

const MainApp = () => {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!user) setActiveTab("dashboard");
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
            <span className="landing-brand-mark" aria-hidden="true">J</span>
            <span className="landing-brand-copy">
              <strong>JJXCAPITAL</strong>
              <small>CONTROL · ANÁLISIS · CLARIDAD</small>
            </span>
          </a>
          <div className="landing-header-actions">
            <span className="landing-header-note"><span className="status-dot" /> Espacio de trabajo personal</span>
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
                Tus operaciones.
                <br />
                <span>Tu visión.</span>
                <br />
                Todo en orden.
              </h1>
              <p className="landing-lead">
                Una forma más clara de registrar, revisar y analizar tus operaciones P2P y escenarios de arbitraje.
                Sin ruido. Con los datos en su moneda correcta.
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
                <span><FaCheck aria-hidden="true" /> Registro manual y transparente</span>
                <span><FaCheck aria-hidden="true" /> Sin órdenes automáticas</span>
                <span><FaCheck aria-hidden="true" /> Historial descargable</span>
              </div>
            </div>

            <div className="landing-preview-wrap">
              <div className="landing-preview-glow" aria-hidden="true" />
              <section className="landing-preview" aria-label="Vista previa del panel de la aplicación">
                <div className="preview-topbar">
                  <div className="preview-brand">
                    <span className="preview-brand-mark">J</span>
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
              <p>Funciones concretas para entender tus operaciones, sin prometer automatizaciones ni resultados que la plataforma no ofrece.</p>
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
              <span>Sin conexión de trading automática ni envío de órdenes.</span>
            </div>
          </section>

          <footer className="landing-footer">
            <a className="landing-brand landing-brand-footer" href="#inicio" aria-label="Volver al inicio de JJXCAPITAL">
              <span className="landing-brand-mark">J</span>
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
        {activeTab === "dashboard" && (
          <Dashboard
            onOpenProfile={() => handleTabChange("profile")}
            onOpenOperations={() => handleTabChange("operations")}
            onOpenHistory={() => handleTabChange("history")}
          />
        )}
        {activeTab === "p2p" && <P2PSimulator />}
        {activeTab === "arbitrage" && <ArbitrageSimulator />}
        {activeTab === "operations" && <Operations />}
        {activeTab === "history" && <History />}
        {activeTab === "profile" && <Profile />}
      </main>
      <NavigationBar activeTab={activeTab} onTabChange={handleTabChange} />
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
