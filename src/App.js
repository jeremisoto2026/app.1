import React, { useEffect, useState } from "react";
import { firebaseEnvironmentStatus } from "./firebase";
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
      "Importa automáticamente órdenes P2P completadas de Binance y Bybit, y organiza también tus operaciones manuales.",
    tag: "BINANCE + BYBIT P2P",
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
                Binance + Bybit.
                <br />
                <span>P2P bajo tu control.</span>
                <br />
                Con claridad.
              </h1>
              <p className="landing-lead">
                Conecta Binance P2P y Bybit P2P con APIs de solo lectura. JJXCAPITAL importa automáticamente las órdenes completadas desde el momento de conexión y las organiza junto a tus sesiones de arbitraje.
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
                <span><FaCheck aria-hidden="true" /> Binance y Bybit P2P</span>
                <span><FaCheck aria-hidden="true" /> APIs de solo lectura</span>
                <span><FaCheck aria-hidden="true" /> Importación automática</span>
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

          <section className="landing-binance landing-exchanges" aria-labelledby="landing-exchanges-title">
            <div className="landing-binance-copy">
              <span className="landing-eyebrow"><span className="eyebrow-line" /> INTEGRACIONES BINANCE + BYBIT P2P</span>
              <h2 id="landing-exchanges-title">Tus exchanges, <span>en automático.</span></h2>
              <p>
                Conecta Binance y/o Bybit mediante APIs limitadas a consulta. JJXCAPITAL comprueba las órdenes P2P completadas y las incorpora a tu historial desde el momento en que conectas cada API.
              </p>
              <ul className="landing-binance-assurances">
                <li><FaCheck aria-hidden="true" /><span>Importación automática de nuevas órdenes P2P completadas de Binance y Bybit.</span></li>
                <li><FaCheck aria-hidden="true" /><span>Permisos de solo lectura: la API no puede crear órdenes, realizar pagos ni liberar activos.</span></li>
                <li><FaCheck aria-hidden="true" /><span>Las operaciones quedan organizadas en tu historial y pueden vincularse a sesiones compatibles.</span></li>
              </ul>
              <button className="landing-button landing-button-secondary landing-binance-cta" type="button" onClick={() => openAuth("register")}>
                Crear cuenta y conectar <FaArrowRight aria-hidden="true" />
              </button>
            </div>

            <div className="landing-binance-visual" aria-label="Vista ilustrativa de las integraciones Binance y Bybit P2P">
              <div className="binance-card-glow" aria-hidden="true" />
              <div className="binance-card exchange-promo-card">
                <div className="exchange-promo-heading">
                  <div>
                    <span>CONEXIONES P2P</span>
                    <strong>Dos exchanges. Un historial.</strong>
                  </div>
                  <span className="binance-readonly-pill"><FaKey aria-hidden="true" /> Solo lectura</span>
                </div>
                <div className="exchange-provider-grid">
                  <div className="exchange-provider-tile exchange-provider-tile-binance">
                    <span className="exchange-provider-monogram">BN</span>
                    <span className="exchange-provider-name"><strong>Binance</strong><small>Binance P2P</small></span>
                    <FaCheck className="exchange-provider-check" aria-hidden="true" />
                  </div>
                  <div className="exchange-provider-tile exchange-provider-tile-bybit">
                    <span className="exchange-provider-monogram">BY</span>
                    <span className="exchange-provider-name"><strong>Bybit</strong><small>Bybit P2P</small></span>
                    <FaCheck className="exchange-provider-check" aria-hidden="true" />
                  </div>
                </div>
                <div className="binance-card-divider" />
                <div className="binance-flow-heading"><span>ASÍ FUNCIONA</span><span>3 pasos</span></div>
                <div className="binance-flow">
                  <div className="binance-flow-step"><span className="binance-flow-index"><FaKey aria-hidden="true" /></span><span><strong>Conectas tus APIs</strong><small>Permisos de consulta únicamente</small></span><FaCheck className="binance-flow-check" aria-hidden="true" /></div>
                  <div className="binance-flow-connector" aria-hidden="true" />
                  <div className="binance-flow-step"><span className="binance-flow-index"><FaSyncAlt aria-hidden="true" /></span><span><strong>Se importan nuevas órdenes</strong><small>Solo operaciones P2P completadas</small></span><FaCheck className="binance-flow-check" aria-hidden="true" /></div>
                  <div className="binance-flow-connector" aria-hidden="true" />
                  <div className="binance-flow-step"><span className="binance-flow-index"><FaChartLine aria-hidden="true" /></span><span><strong>Analizas tu actividad</strong><small>Operaciones, sesiones y resultados</small></span><FaArrowRight className="binance-flow-arrow" aria-hidden="true" /></div>
                </div>
                <div className="binance-card-footer"><FaShieldAlt aria-hidden="true" /><span>Las APIs no pueden operar ni retirar fondos</span></div>
              </div>
              <p className="binance-visual-caption">La importación comienza al conectar cada API en tu perfil.</p>
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
              <span>Las conexiones de Binance y Bybit solo consultan historial; nunca ejecutan órdenes ni retiran fondos.</span>
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

function FirebasePreviewSetupNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-slate-100">
      <section className="w-full max-w-2xl rounded-3xl border border-amber-300/20 bg-slate-900/90 p-7 shadow-2xl sm:p-10" role="alert">
        <div className="mb-5 inline-flex rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
          Entorno de pruebas protegido
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">JJXCAPITAL Preview aún no está conectado</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Para proteger tus datos, esta versión no utiliza el proyecto Firebase de Producción. El acceso permanecerá bloqueado hasta configurar un proyecto Firebase independiente para pruebas.
        </p>
        {firebaseEnvironmentStatus.reason === "production-project-rejected" ? (
          <p className="mt-5 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm leading-6 text-rose-100">
            Se ha detectado el identificador del proyecto de Producción. La aplicación lo ha rechazado y no intentará conectarse.
          </p>
        ) : (
          <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold text-white">Configuración pendiente</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Faltan los datos públicos de la aplicación web Firebase de Preview. No introduzcas aquí las credenciales de Producción.
            </p>
            {firebaseEnvironmentStatus.missingFields.length > 0 && (
              <p className="mt-3 break-words font-mono text-xs leading-6 text-slate-500">
                Campos pendientes: {firebaseEnvironmentStatus.missingFields.join(", ")}
              </p>
            )}
          </div>
        )}
        <p className="mt-6 text-xs leading-6 text-slate-500">
          Producción continúa funcionando de forma independiente. Esta pantalla no modifica ni elimina información.
        </p>
      </section>
    </main>
  );
}

function App() {
  if (!firebaseEnvironmentStatus.ready) return <FirebasePreviewSetupNotice />;

  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
