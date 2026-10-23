import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Error al renderizar una sección de JJXCAPITAL:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="jjx-page flex min-h-[60vh] items-center justify-center px-4 py-10" role="alert">
          <div className="jjx-panel w-full max-w-lg p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/10 text-rose-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M10.3 3.9 2.5 17.4A1.8 1.8 0 0 0 4 20h16a1.8 1.8 0 0 0 1.5-2.6L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-white">No se ha podido mostrar esta sección</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Ha ocurrido un error inesperado. El resto de JJXCAPITAL sigue protegido; vuelve al resumen para continuar.</p>
            <button
              type="button"
              className="jjx-button-primary mt-6"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onBack?.();
              }}
            >
              Volver al resumen
            </button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
