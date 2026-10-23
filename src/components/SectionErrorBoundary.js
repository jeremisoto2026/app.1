import React from "react";

/**
 * Prevents a rendering error inside a workspace section from blanking the whole app.
 * The main navigation remains mounted so the user can recover without refreshing.
 */
export default class SectionErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Error al mostrar la sección:", error, info?.componentStack || "");
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="mx-auto flex min-h-[45vh] max-w-3xl items-center justify-center px-4 py-10 text-white">
        <section
          role="alert"
          className="w-full rounded-2xl border border-red-400/20 bg-slate-900/90 p-6 text-center shadow-xl sm:p-8"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-400/10 text-xl text-red-300" aria-hidden="true">
            !
          </div>
          <h2 className="text-xl font-semibold tracking-tight">No se pudo abrir esta sección</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-300">
            Ha ocurrido un error al mostrar esta pantalla. Tus operaciones guardadas no se eliminan por este aviso.
            Puedes volver al resumen o intentar abrir la sección de nuevo.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="rounded-xl border border-slate-600 px-4 py-2.5 font-medium text-slate-100 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              Intentar de nuevo
            </button>
            <button
              type="button"
              onClick={this.props.onReturn}
              className="rounded-xl bg-indigo-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              Volver al resumen
            </button>
          </div>
        </section>
      </div>
    );
  }
}
