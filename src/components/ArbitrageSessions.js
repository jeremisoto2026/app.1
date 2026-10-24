import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { ArrowDownTrayIcon, PlusIcon, CheckCircleIcon, PlayIcon, TrashIcon, BoltIcon, DocumentPlusIcon } from "@heroicons/react/24/outline";
import { calculateDashboardMetrics, getOperationDate } from "../utils/financialCalculations";
import { buildExcelXml, downloadExcelXml } from "../utils/spreadsheet";

const FIAT_CURRENCIES = ["EUR", "USD", "VES", "COP", "ARS", "MXN", "BRL", "PEN", "CLP", "GBP"];
const CRYPTO_CURRENCIES = ["USDT", "USDC", "BTC", "ETH", "BNB", "DAI"];
const ARBITRAGE_TYPES = ["Comercio P2P", "P2P entre plataformas"];
const money = (value, currency) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(Number.isFinite(Number(value)) ? Number(value) : 0) + " " + currency;
const formatDate = (value) => {
  const date = getOperationDate(value);
  return date ? date.toLocaleString("es-ES") : "Fecha no disponible";
};

export default function ArbitrageSessions({ onOpenOperations }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState({ name: "", strategy: "Comercio P2P", fiat: "EUR", crypto: "USDT", initialCapital: "100" });

  const loadData = async () => {
    if (!user?.uid) {
      setSessions([]);
      setOperations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [sessionSnapshot, operationSnapshot] = await Promise.all([
        getDocs(collection(db, "users", user.uid, "sessions")),
        getDocs(collection(db, "users", user.uid, "operations")),
      ]);
      const records = sessionSnapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      records.sort((a, b) => (getOperationDate(b.createdAt)?.getTime() || 0) - (getOperationDate(a.createdAt)?.getTime() || 0));
      const savedOperations = operationSnapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      savedOperations.sort((a, b) => (getOperationDate(b.timestamp)?.getTime() || 0) - (getOperationDate(a.timestamp)?.getTime() || 0));
      setSessions(records);
      setOperations(savedOperations);
      setSelected(current => records.some(item => item.id === current) ? current : (records.find(item => item.status === "active")?.id || records[0]?.id || ""));
    } catch (loadError) {
      console.error("Error loading arbitrages:", loadError);
      setError(loadError?.code === "permission-denied"
        ? "Firebase ha rechazado el acceso. Hay que desplegar las reglas de Firestore actualizadas para sesiones y operaciones."
        : "No se pudieron cargar tus arbitrajes y movimientos. Comprueba la conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user?.uid]);

  const activeSessions = sessions.filter(item => item.status === "active");
  const selectedSession = sessions.find(item => item.id === selected);
  const sessionOperations = useMemo(
    () => selectedSession ? operations.filter(item => item.sessionId === selectedSession.id) : [],
    [operations, selectedSession]
  );
  const stats = useMemo(() => {
    if (!selectedSession) return { profit: 0, buyFiat: 0, sellFiat: 0, buyCrypto: 0, sellCrypto: 0, fiatBalance: 0, cryptoBalance: 0, percentage: 0, count: 0 };
    const calculations = calculateDashboardMetrics(sessionOperations);
    const add = (type, field) => sessionOperations
      .filter(item => item.operation_type === type)
      .reduce((total, item) => total + (Number.isFinite(Number(item[field])) ? Number(item[field]) : 0), 0);
    const initialCapital = Number(selectedSession.initialCapital) || 0;
    const profit = calculations.profitByCurrency?.[selectedSession.fiat] || 0;
    const profitCrypto = sessionOperations
      .filter(item => item.operation_type === "Venta")
      .reduce((total, item) => {
        const realized = calculations.realizedProfitByOperation?.[item.id];
        const rate = Number(item.exchange_rate);
        return realized && Number.isFinite(rate) && rate > 0
          ? total + realized.profit / rate
          : total;
      }, 0);
    return {
      profit,
      profitCrypto,
      buyFiat: add("Compra", "fiat_amount"),
      sellFiat: add("Venta", "fiat_amount"),
      buyCrypto: add("Compra", "crypto_amount"),
      sellCrypto: add("Venta", "crypto_amount"),
      fiatBalance: initialCapital + add("Venta", "fiat_amount") - add("Compra", "fiat_amount"),
      cryptoBalance: add("Compra", "crypto_amount") - add("Venta", "crypto_amount"),
      percentage: initialCapital > 0 ? profit / initialCapital * 100 : 0,
      count: sessionOperations.length,
    };
  }, [selectedSession, sessionOperations]);

  const createSession = async (event) => {
    event.preventDefault();
    if (!user?.uid) return;
    const initialCapital = Number(draft.initialCapital);
    if (!Number.isFinite(initialCapital) || initialCapital <= 0 || draft.crypto === draft.fiat) {
      setError("Introduce un capital inicial mayor que cero y selecciona dos monedas diferentes.");
      return;
    }
    const name = draft.name.trim() || (draft.fiat + " / " + draft.crypto + " · " + new Date().toLocaleDateString("es-ES"));
    setSaving(true);
    setError("");
    try {
      const created = await addDoc(collection(db, "users", user.uid, "sessions"), {
        name,
        strategy: draft.strategy,
        fiat: draft.fiat,
        crypto: draft.crypto,
        initialCapital,
        status: "active",
        createdAt: serverTimestamp(),
        closedAt: null,
      });
      setDraft({ name: "", strategy: "Comercio P2P", fiat: "EUR", crypto: "USDT", initialCapital: "100" });
      setShowCreate(false);
      setSelected(created.id);
      await loadData();
      setSelected(created.id);
    } catch (saveError) {
      console.error("Error creating arbitrage:", saveError);
      setError(saveError?.code === "permission-denied"
        ? "No se pudo crear el arbitraje porque Firebase denegó el permiso. Despliega las reglas de Firestore actualizadas y vuelve a intentarlo."
        : "No se pudo crear el arbitraje. Comprueba la conexión y las reglas de Firestore.");
    } finally {
      setSaving(false);
    }
  };

  const setSessionStatus = async (status) => {
    if (!selectedSession || !user?.uid) return;
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "users", user.uid, "sessions", selectedSession.id), {
        status,
        closedAt: status === "closed" ? serverTimestamp() : null,
      });
      await loadData();
      setSelected(selectedSession.id);
    } catch (statusError) {
      console.error("Error updating arbitrage status:", statusError);
      setError("No se pudo actualizar el estado del arbitraje.");
    } finally {
      setSaving(false);
    }
  };

  const removeSession = async () => {
    if (!selectedSession || !user?.uid) return;
    const linkedOperations = operations.filter(item => item.sessionId === selectedSession.id);
    if (linkedOperations.length) {
      setError("Este arbitraje ya tiene operaciones. Ciérralo para conservar su historial; no se puede eliminar mientras tenga movimientos.");
      return;
    }
    if (!window.confirm("¿Eliminar este arbitraje vacío? Esta acción no se puede deshacer.")) return;
    setSaving(true);
    setError("");
    try {
      await deleteDoc(doc(db, "users", user.uid, "sessions", selectedSession.id));
      setSelected("");
      await loadData();
    } catch (deleteError) {
      console.error("Error deleting arbitrage:", deleteError);
      setError("No se pudo eliminar el arbitraje.");
    } finally {
      setSaving(false);
    }
  };

  const exportSession = () => {
    if (!selectedSession) return;
    const headers = ["Arbitraje", "Estado", "Tipo", "Cripto", "Fiat", "Movimiento", "Plataforma", "Cantidad cripto", "Precio", "Importe fiat", "Comisión", "Fecha"];
    const rows = sessionOperations.map(item => [
      selectedSession.name, selectedSession.status, selectedSession.strategy || "Comercio P2P",
      item.crypto || selectedSession.crypto, item.fiat || selectedSession.fiat,
      item.operation_type || "", item.exchange || "", item.crypto_amount ?? "", item.exchange_rate ?? "",
      item.fiat_amount ?? "", item.fee ?? "", formatDate(item.timestamp),
    ]);
    const excelXml = buildExcelXml(headers, rows);
    downloadExcelXml("JJXCAPITAL-arbitraje-" + selectedSession.name.replace(/[^a-z0-9_-]/gi, "-") + ".xls", excelXml);
  };

  const renderOperationTable = (items, type) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-3 font-medium">Fecha</th>
            <th className="px-3 py-3 font-medium">Cantidad cripto</th>
            <th className="px-3 py-3 font-medium">Precio</th>
            <th className="px-3 py-3 font-medium">Importe fiat</th>
            <th className="px-3 py-3 font-medium">Plataforma</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan="5" className="px-3 py-6 text-center text-slate-500">Todavía no hay {type.toLowerCase()} en este arbitraje.</td></tr>
          ) : items.map(item => (
            <tr key={item.id} className="border-t border-white/[0.06] text-slate-300">
              <td className="px-3 py-3 whitespace-nowrap">{formatDate(item.timestamp)}</td>
              <td className="px-3 py-3 whitespace-nowrap">{money(item.crypto_amount, item.crypto || selectedSession.crypto)}</td>
              <td className="px-3 py-3 whitespace-nowrap">{money(item.exchange_rate, selectedSession.fiat)}</td>
              <td className="px-3 py-3 whitespace-nowrap">{money(item.fiat_amount, item.fiat || selectedSession.fiat)}</td>
              <td className="px-3 py-3">{item.exchange || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-400" role="status">Cargando tus arbitrajes y operaciones…</div>;
  }

  const buyOperations = sessionOperations.filter(item => item.operation_type === "Compra");
  const sellOperations = sessionOperations.filter(item => item.operation_type === "Venta");

  return (
    <div className="mx-auto min-h-screen max-w-6xl space-y-5 bg-transparent px-4 pb-28 pt-5 md:pt-24">
      <header className="jjx-panel p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="jjx-eyebrow">ESPACIOS INDEPENDIENTES DE TRABAJO</span>
            <h1 className="mt-2 text-3xl font-semibold text-white">Mis arbitrajes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Cada arbitraje tiene su par de monedas, sus compras y ventas, su saldo y su resultado. Al terminarlo, queda guardado con todo su historial.</p>
          </div>
          <button type="button" onClick={() => setShowCreate(value => !value)} className="jjx-button-primary"><PlusIcon className="h-4 w-4" /> Nuevo arbitraje</button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-sm text-rose-200">{error}</div>}

      {showCreate && (
        <form onSubmit={createSession} className="jjx-panel grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm text-slate-300">Nombre (opcional)
            <input value={draft.name} onChange={e => setDraft(v => ({ ...v, name: e.target.value }))} maxLength={80} placeholder="EUR / USDT · turno de mañana" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white focus:border-violet-400 focus:outline-none" />
          </label>
          <label className="text-sm text-slate-300">Tipo de arbitraje
            <select value={draft.strategy} onChange={e => setDraft(v => ({ ...v, strategy: e.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white focus:border-violet-400 focus:outline-none">
              {ARBITRAGE_TYPES.map(type => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-300">Moneda fiat
            <select value={draft.fiat} onChange={e => setDraft(v => ({ ...v, fiat: e.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white focus:border-violet-400 focus:outline-none">
              {FIAT_CURRENCIES.map(currency => <option key={currency}>{currency}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-300">Moneda cripto
            <select value={draft.crypto} onChange={e => setDraft(v => ({ ...v, crypto: e.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white focus:border-violet-400 focus:outline-none">
              {CRYPTO_CURRENCIES.map(currency => <option key={currency}>{currency}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-300">Capital inicial ({draft.fiat})
            <input type="number" min="0.00000001" step="any" value={draft.initialCapital} onChange={e => setDraft(v => ({ ...v, initialCapital: e.target.value }))} required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white focus:border-violet-400 focus:outline-none" />
          </label>
          <div className="flex items-end gap-2">
            <button disabled={saving} type="submit" className="jjx-button-primary flex-1">{saving ? "Guardando…" : "Crear arbitraje"}</button>
            <button type="button" onClick={() => setShowCreate(false)} className="jjx-button-secondary">Cancelar</button>
          </div>
          <p className="sm:col-span-2 lg:col-span-3 text-xs leading-5 text-slate-500">Los movimientos de este espacio solo se contabilizan con los de este mismo arbitraje. El capital inicial se expresa en la moneda fiat elegida.</p>
        </form>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.82fr_1.55fr]">
        <section className="jjx-panel p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Tus arbitrajes</h2>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-400">{sessions.length}</span>
          </div>
          <p className="mb-4 mt-1 text-xs text-slate-500">Selecciona uno para consultar sus propios números.</p>
          {sessions.length === 0 ? (
            <div className="py-7 text-sm text-slate-400">Todavía no tienes arbitrajes. Crea uno, por ejemplo EUR / USDT, para empezar.</div>
          ) : (
            <div className="space-y-2">
              {sessions.map(item => (
                <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={"w-full rounded-xl border p-4 text-left transition " + (selected === item.id ? "border-violet-400/40 bg-violet-400/10" : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05]")}>
                  <span className="flex items-center justify-between gap-2">
                    <strong className="truncate text-sm text-white">{item.name}</strong>
                    <span className={"text-xs " + (item.status === "active" ? "text-emerald-300" : "text-slate-400")}>{item.status === "active" ? "En curso" : "Terminado"}</span>
                  </span>
                  <span className="mt-2 block text-xs text-slate-400">{item.fiat || "EUR"} / {item.crypto || "USDT"} · {item.strategy || "Comercio P2P"}</span>
                  <span className="mt-1 block text-xs text-slate-500">{operations.filter(op => op.sessionId === item.id).length} movimientos registrados</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-5">
          {!selectedSession ? (
            <div className="jjx-panel p-8 text-center">
              <BoltIcon className="mx-auto h-9 w-9 text-violet-300" />
              <h2 className="mt-3 text-lg font-semibold text-white">Crea tu primer arbitraje</h2>
              <p className="mt-2 text-sm text-slate-400">Por ejemplo, EUR / USDT hoy y USDC / VES mañana. Cada uno conservará sus propias operaciones.</p>
              <button type="button" onClick={() => setShowCreate(true)} className="jjx-button-primary mt-5"><PlusIcon className="h-4 w-4" /> Crear arbitraje</button>
            </div>
          ) : (
            <>
              <div className="jjx-panel p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="jjx-eyebrow">{selectedSession.status === "active" ? "ARBITRAJE EN CURSO" : "ARBITRAJE TERMINADO"}</span>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{selectedSession.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">{selectedSession.strategy || "Comercio P2P"} · {selectedSession.fiat || "EUR"} / {selectedSession.crypto || "USDT"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSession.status === "active" && <button type="button" onClick={() => onOpenOperations?.(selectedSession.id)} className="jjx-button-primary"><DocumentPlusIcon className="h-4 w-4" /> Registrar compra/venta</button>}
                    <button type="button" onClick={exportSession} className="jjx-button-secondary"><ArrowDownTrayIcon className="h-4 w-4" /> Exportar CSV</button>
                    {selectedSession.status === "active"
                      ? <button type="button" disabled={saving} onClick={() => setSessionStatus("closed")} className="jjx-button-secondary"><CheckCircleIcon className="h-4 w-4" /> Terminar</button>
                      : <button type="button" disabled={saving} onClick={() => setSessionStatus("active")} className="jjx-button-secondary"><PlayIcon className="h-4 w-4" /> Reabrir</button>}
                    <button type="button" disabled={saving || stats.count > 0} onClick={removeSession} aria-label="Eliminar arbitraje vacío" title={stats.count > 0 ? "Un arbitraje con movimientos se conserva en el historial" : "Eliminar arbitraje vacío"} className="jjx-button-secondary disabled:cursor-not-allowed disabled:opacity-40"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <div className="jjx-inset"><p className="jjx-field-label">Capital inicial</p><p className="mt-2 text-lg font-semibold text-white">{money(selectedSession.initialCapital, selectedSession.fiat || "EUR")}</p></div>
                  <div className="jjx-inset"><p className="jjx-field-label">Beneficio realizado</p><p className={"mt-2 text-lg font-semibold " + (stats.profit >= 0 ? "text-emerald-300" : "text-rose-300")}>{money(stats.profit, selectedSession.fiat || "EUR")}</p><p className="mt-1 text-xs text-slate-500">FIFO · ventas emparejadas</p></div>
                  <div className="jjx-inset"><p className="jjx-field-label">Beneficio equivalente en cripto</p><p className={"mt-2 text-lg font-semibold " + (stats.profitCrypto >= 0 ? "text-emerald-300" : "text-rose-300")}>{money(stats.profitCrypto, selectedSession.crypto || "USDT")}</p><p className="mt-1 text-xs text-slate-500">Estimado al precio de cada venta</p></div>
                  <div className="jjx-inset"><p className="jjx-field-label">Saldo fiat estimado</p><p className={"mt-2 text-lg font-semibold " + (stats.fiatBalance >= 0 ? "text-white" : "text-rose-300")}>{money(stats.fiatBalance, selectedSession.fiat || "EUR")}</p></div>
                  <div className="jjx-inset"><p className="jjx-field-label">Cripto neta</p><p className="mt-2 text-lg font-semibold text-white">{money(stats.cryptoBalance, selectedSession.crypto || "USDT")}</p></div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{stats.count} movimientos · Compras: {money(stats.buyFiat, selectedSession.fiat || "EUR")} · Ventas: {money(stats.sellFiat, selectedSession.fiat || "EUR")}</span>
                  <span>Rentabilidad realizada sobre capital inicial: {stats.percentage.toFixed(2)}%</span>
                </div>
              </div>

              <div className="jjx-panel p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold text-white">Compras</h3><span className="text-xs text-slate-500">{buyOperations.length} registros</span></div>
                {renderOperationTable(buyOperations, "compras")}
              </div>
              <div className="jjx-panel p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold text-white">Ventas</h3><span className="text-xs text-slate-500">{sellOperations.length} registros</span></div>
                {renderOperationTable(sellOperations, "ventas")}
              </div>
              <p className="px-1 text-xs leading-5 text-slate-500">El beneficio se calcula con ventas emparejadas con compras previas del mismo arbitraje y par de monedas (FIFO), descontando las comisiones incluidas en los importes registrados. El saldo fiat estimado parte del capital inicial y suma ventas netas menos compras; no incluye saldos de cuentas o billeteras externas.</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
