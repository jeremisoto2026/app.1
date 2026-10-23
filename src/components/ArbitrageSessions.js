import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { ArrowDownTrayIcon, PlusIcon, CheckCircleIcon, PlayIcon, TrashIcon } from "@heroicons/react/24/outline";
import { serializeCsv } from "../utils/csv";

const CURRENCIES = ["USDT", "USDC", "USD", "EUR", "VES"];
const money = (value, currency) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(value) + " " + currency;

export default function ArbitrageSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ name: "", currency: "USDT", initialCapital: "100" });
  const [selected, setSelected] = useState("");
  const [cycle, setCycle] = useState({ description: "", profit: "" });

  const sessionsRef = () => collection(db, "users", user.uid, "sessions");
  const loadSessions = async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError("");
    try {
      const snap = await getDocs(query(sessionsRef(), orderBy("createdAt", "desc")));
      const records = snap.docs.map(item => ({ id: item.id, ...item.data() }));
      setSessions(records);
      setSelected(current => records.some(item => item.id === current) ? current : records.find(item => item.status === "active")?.id || records[0]?.id || "");
    } catch (e) {
      console.error("Error loading arbitrage sessions:", e);
      setError("No se pudieron cargar las sesiones. Comprueba las reglas de Firestore y vuelve a intentarlo.");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadSessions(); }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSession = sessions.find(item => item.id === selected);
  const stats = useMemo(() => {
    if (!selectedSession) return { profit: 0, capital: 0, cycles: 0, percentage: 0 };
    const cycles = Array.isArray(selectedSession.cycles) ? selectedSession.cycles : [];
    const profit = cycles.reduce((sum, item) => sum + (Number.isFinite(Number(item.profit)) ? Number(item.profit) : 0), 0);
    const initial = Number(selectedSession.initialCapital) || 0;
    return { profit, capital: initial + profit, cycles: cycles.length, percentage: initial > 0 ? profit / initial * 100 : 0 };
  }, [selectedSession]);

  const createSession = async (event) => {
    event.preventDefault();
    const initialCapital = Number(draft.initialCapital);
    if (!draft.name.trim() || !Number.isFinite(initialCapital) || initialCapital <= 0) {
      setError("Introduce un nombre y un capital inicial mayor que cero.");
      return;
    }
    setSaving(true); setError("");
    try {
      const created = await addDoc(sessionsRef(), {
        name: draft.name.trim(), currency: draft.currency, initialCapital,
        status: "active", cycles: [], createdAt: serverTimestamp(), closedAt: null,
      });
      setDraft({ name: "", currency: "USDT", initialCapital: "100" });
      setShowCreate(false);
      await loadSessions();
      setSelected(created.id);
    } catch (e) {
      console.error("Error creating session:", e);
      setError("No se pudo crear la sesión. Comprueba las reglas de Firestore.");
    } finally { setSaving(false); }
  };

  const addCycle = async (event) => {
    event.preventDefault();
    if (!selectedSession || selectedSession.status !== "active") return;
    const profit = Number(cycle.profit);
    if (!Number.isFinite(profit) || cycle.profit.trim() === "") {
      setError("Introduce un beneficio o pérdida realizado válido.");
      return;
    }
    setSaving(true); setError("");
    try {
      const cycles = [...(Array.isArray(selectedSession.cycles) ? selectedSession.cycles : []), {
        id: crypto.randomUUID(), description: cycle.description.trim() || "Ciclo de arbitraje",
        profit, recordedAt: new Date().toISOString(),
      }];
      await updateDoc(doc(db, "users", user.uid, "sessions", selectedSession.id), { cycles });
      setCycle({ description: "", profit: "" });
      await loadSessions();
    } catch (e) {
      console.error("Error saving session cycle:", e);
      setError("No se pudo guardar el movimiento de la sesión.");
    } finally { setSaving(false); }
  };

  const closeSession = async () => {
    if (!selectedSession || selectedSession.status !== "active") return;
    setSaving(true); setError("");
    try {
      await updateDoc(doc(db, "users", user.uid, "sessions", selectedSession.id), { status: "closed", closedAt: new Date().toISOString() });
      await loadSessions();
    } catch (e) {
      console.error("Error closing session:", e);
      setError("No se pudo cerrar la sesión.");
    } finally { setSaving(false); }
  };

  const resumeSession = async () => {
    if (!selectedSession || selectedSession.status !== "closed") return;
    setSaving(true); setError("");
    try {
      await updateDoc(doc(db, "users", user.uid, "sessions", selectedSession.id), { status: "active", closedAt: null });
      await loadSessions();
    } catch (e) {
      console.error("Error resuming session:", e);
      setError("No se pudo reanudar la sesión.");
    } finally { setSaving(false); }
  };

  const removeSession = async () => {
    if (!selectedSession || !window.confirm("¿Eliminar esta sesión y todos sus movimientos? Esta acción no se puede deshacer.")) return;
    setSaving(true); setError("");
    try {
      await deleteDoc(doc(db, "users", user.uid, "sessions", selectedSession.id));
      setSelected("");
      await loadSessions();
    } catch (e) {
      console.error("Error deleting session:", e);
      setError("No se pudo eliminar la sesión.");
    } finally { setSaving(false); }
  };

  const exportSession = () => {
    if (!selectedSession) return;
    const cycles = Array.isArray(selectedSession.cycles) ? selectedSession.cycles : [];
    const csv = serializeCsv(
      ["Sesión", "Estado", "Capital inicial", "Moneda", "Movimiento", "Beneficio realizado", "Fecha"],
      cycles.map(item => [selectedSession.name, selectedSession.status, selectedSession.initialCapital, selectedSession.currency, item.description, item.profit, item.recordedAt]),
      [0, 1, 3, 4, 6]
    );
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "JJXCAPITAL-sesion-" + selectedSession.name.replace(/[^a-z0-9_-]/gi, "-") + ".csv";
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  };

  return (
    <div className="jjx-page min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="jjx-panel p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><span className="jjx-eyebrow">CONTROL POR PERIODOS</span><h1 className="mt-2 text-3xl font-semibold text-white">Sesiones de arbitraje</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Separa cada ciclo de trabajo, registra el beneficio ya realizado y consulta cómo evoluciona el capital de esa sesión.</p></div>
            <button type="button" onClick={() => setShowCreate(value => !value)} className="jjx-button-primary"><PlusIcon className="h-4 w-4" /> Nueva sesión</button>
          </div>
        </header>

        {error && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-sm text-rose-200">{error}</div>}

        {showCreate && <form onSubmit={createSession} className="jjx-panel grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-300">Nombre de sesión<input value={draft.name} onChange={e => setDraft(v => ({ ...v, name: e.target.value }))} required maxLength={80} placeholder="Arbitraje de octubre" className="jjx-input mt-2 w-full" /></label>
          <label className="text-sm text-slate-300">Capital inicial<input type="number" min="0.00000001" step="any" value={draft.initialCapital} onChange={e => setDraft(v => ({ ...v, initialCapital: e.target.value }))} required className="jjx-input mt-2 w-full" /></label>
          <label className="text-sm text-slate-300">Moneda del capital<select value={draft.currency} onChange={e => setDraft(v => ({ ...v, currency: e.target.value }))} className="jjx-input mt-2 w-full">{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></label>
          <div className="flex items-end gap-2"><button disabled={saving} type="submit" className="jjx-button-primary flex-1">{saving ? "Guardando…" : "Crear sesión"}</button><button type="button" onClick={() => setShowCreate(false)} className="jjx-button-secondary">Cancelar</button></div>
        </form>}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.85fr_1.5fr]">
          <section className="jjx-panel p-5"><h2 className="text-lg font-semibold text-white">Tus sesiones</h2><p className="mb-4 mt-1 text-xs text-slate-500">Cada sesión mantiene su propio capital y movimientos.</p>
            {loading ? <p className="py-8 text-sm text-slate-400">Cargando sesiones…</p> : sessions.length === 0 ? <p className="py-8 text-sm text-slate-400">Todavía no tienes sesiones. Crea una para empezar, por ejemplo con 100 USDT.</p> : <div className="space-y-2">{sessions.map(item => <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={"w-full rounded-xl border p-4 text-left transition " + (selected === item.id ? "border-violet-400/40 bg-violet-400/10" : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05]")}><span className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-white">{item.name}</strong><span className={"text-xs " + (item.status === "active" ? "text-emerald-300" : "text-slate-400")}>{item.status === "active" ? "Activa" : "Cerrada"}</span></span><span className="mt-2 block text-xs text-slate-400">Capital inicial: {money(Number(item.initialCapital) || 0, item.currency)}</span></button>)}</div>}
          </section>

          <section className="space-y-5">
            {!selectedSession ? <div className="jjx-panel p-8 text-center"><h2 className="text-lg font-semibold text-white">Selecciona una sesión</h2><p className="mt-2 text-sm text-slate-400">Aquí verás su capital, resultado y movimientos.</p></div> : <>
              <div className="jjx-panel p-6">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="jjx-eyebrow">{selectedSession.status === "active" ? "SESIÓN EN CURSO" : "SESIÓN CERRADA"}</span><h2 className="mt-2 text-2xl font-semibold text-white">{selectedSession.name}</h2></div><div className="flex flex-wrap gap-2"><button type="button" onClick={exportSession} className="jjx-button-secondary"><ArrowDownTrayIcon className="h-4 w-4" /> Exportar CSV</button>{selectedSession.status === "active" ? <button type="button" disabled={saving} onClick={closeSession} className="jjx-button-secondary"><CheckCircleIcon className="h-4 w-4" /> Cerrar sesión</button> : <button type="button" disabled={saving} onClick={resumeSession} className="jjx-button-secondary"><PlayIcon className="h-4 w-4" /> Reanudar</button>}<button type="button" disabled={saving} onClick={removeSession} aria-label="Eliminar sesión" className="jjx-button-secondary"><TrashIcon className="h-4 w-4" /></button></div></div>
                <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4"><div className="jjx-inset"><p className="jjx-field-label">Capital inicial</p><p className="mt-2 text-lg font-semibold text-white">{money(Number(selectedSession.initialCapital) || 0, selectedSession.currency)}</p></div><div className="jjx-inset"><p className="jjx-field-label">Beneficio realizado</p><p className={"mt-2 text-lg font-semibold " + (stats.profit >= 0 ? "text-emerald-300" : "text-rose-300")}>{money(stats.profit, selectedSession.currency)}</p></div><div className="jjx-inset"><p className="jjx-field-label">Capital estimado</p><p className="mt-2 text-lg font-semibold text-white">{money(stats.capital, selectedSession.currency)}</p></div><div className="jjx-inset"><p className="jjx-field-label">Rentabilidad realizada</p><p className={"mt-2 text-lg font-semibold " + (stats.percentage >= 0 ? "text-emerald-300" : "text-rose-300")}>{stats.percentage.toFixed(2)}%</p></div></div>
              </div>
              {selectedSession.status === "active" && <form onSubmit={addCycle} className="jjx-panel p-6"><h3 className="text-base font-semibold text-white">Registrar ciclo completado</h3><p className="mt-1 text-xs leading-5 text-slate-500">Introduce la ganancia o pérdida realizada del ciclo, después de comisiones. Un valor negativo registra una pérdida.</p><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-sm text-slate-300">Descripción<input value={cycle.description} onChange={e => setCycle(v => ({ ...v, description: e.target.value }))} maxLength={120} placeholder="Compra y venta completadas" className="jjx-input mt-2 w-full" /></label><label className="text-sm text-slate-300">Beneficio / pérdida ({selectedSession.currency})<input type="number" step="any" value={cycle.profit} onChange={e => setCycle(v => ({ ...v, profit: e.target.value }))} required placeholder="3.20 o -1.50" className="jjx-input mt-2 w-full" /></label></div><button type="submit" disabled={saving} className="jjx-button-primary mt-4">{saving ? "Guardando…" : "Añadir movimiento"}</button></form>}
              <div className="jjx-panel p-6"><h3 className="text-base font-semibold text-white">Movimientos de la sesión <span className="ml-2 text-sm font-normal text-slate-400">({stats.cycles})</span></h3>{!stats.cycles ? <p className="mt-4 text-sm text-slate-400">Aún no hay ciclos registrados.</p> : <div className="mt-4 space-y-2">{[...(selectedSession.cycles || [])].slice().reverse().map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><div><p className="text-sm font-medium text-white">{item.description}</p><p className="mt-1 text-xs text-slate-500">{item.recordedAt ? new Date(item.recordedAt).toLocaleString("es-ES") : "Fecha no disponible"}</p></div><strong className={"text-sm " + (Number(item.profit) >= 0 ? "text-emerald-300" : "text-rose-300")}>{Number(item.profit) > 0 ? "+" : ""}{money(Number(item.profit) || 0, selectedSession.currency)}</strong></div>)}</div>}</div>
              <p className="px-1 text-xs leading-5 text-slate-500">El capital estimado suma el capital inicial y los beneficios/pérdidas realizados que introduces. No valora posiciones abiertas ni sincroniza datos de exchanges.</p>
            </>}
          </section>
        </div>
      </div>
    </div>
  );
}
