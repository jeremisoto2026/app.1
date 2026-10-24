import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CalculatorIcon, ArrowsRightLeftIcon, BoltIcon } from "@heroicons/react/24/outline";

const CRYPTOS = ["USDT", "USDC", "BTC", "ETH", "BNB", "SOL", "XRP", "LTC"];
const FIATS = ["EUR", "USD", "VES", "MXN", "COP", "ARS", "BRL", "CLP"];
const EXCHANGES = ["Binance", "Bybit", "Bitget", "OKX", "KuCoin", "Otro"];
const money = (value, currency) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 8 }).format(value) + " " + currency;

export default function UnifiedSimulator() {
  const [mode, setMode] = useState("p2p");
  const [startWith, setStartWith] = useState("fiat");
  const [crypto, setCrypto] = useState("USDT");
  const [fiat, setFiat] = useState("EUR");
  const [capital, setCapital] = useState("100");
  const [buyPrice, setBuyPrice] = useState("0.92");
  const [sellPrice, setSellPrice] = useState("0.95");
  const [buyFee, setBuyFee] = useState("0");
  const [sellFee, setSellFee] = useState("0");
  const [source, setSource] = useState("Binance");
  const [destination, setDestination] = useState("Bybit");
  const [error, setError] = useState("");

  const result = useMemo(() => {
    const c = Number(capital), b = Number(buyPrice), s = Number(sellPrice);
    const bf = Number(buyFee || 0), sf = Number(sellFee || 0);
    if (![c,b,s,bf,sf].every(Number.isFinite) || c <= 0 || b <= 0 || s <= 0 || bf < 0 || sf < 0 || bf >= 100 || sf >= 100) return null;
    if (mode === "cross" && source === destination) return null;
    const feeBuy = bf / 100, feeSell = sf / 100;
    if (startWith === "crypto") {
      const cryptoIn = c;
      const fiatAfterSell = cryptoIn * s * (1 - feeSell);
      const cryptoAfterRebuy = fiatAfterSell / b * (1 - feeBuy);
      return { initial: cryptoIn, finalCrypto: cryptoAfterRebuy, finalFiat: fiatAfterSell, profitCrypto: cryptoAfterRebuy - cryptoIn, profitFiat: (cryptoAfterRebuy - cryptoIn) * b, percent: (cryptoAfterRebuy / cryptoIn - 1) * 100 };
    }
    const cryptoBought = c / b * (1 - feeBuy);
    const fiatAfterSell = cryptoBought * s * (1 - feeSell);
    return { initial: c, cryptoBought, finalCrypto: cryptoBought, finalFiat: fiatAfterSell, profitFiat: fiatAfterSell - c, profitCrypto: (fiatAfterSell - c) / s, percent: (fiatAfterSell / c - 1) * 100 };
  }, [mode, startWith, capital, buyPrice, sellPrice, buyFee, sellFee, source, destination]);

  const changeMode = (next) => { setMode(next); setError(""); };
  const submit = (event) => {
    event.preventDefault();
    if (!result) { setError(mode === "cross" && source === destination ? "Selecciona exchanges de origen y destino diferentes." : "Revisa el capital, los precios y las comisiones."); return; }
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black p-4 pt-24 text-white md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600"><CalculatorIcon className="h-7 w-7" /></div>
          <h1 className="text-3xl font-bold md:text-4xl">Simulador integrado</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-400">Un solo espacio para comparar una operativa P2P o un arbitraje entre plataformas. Simulación manual: no conecta exchanges ni ejecuta órdenes.</p>
        </header>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button type="button" onClick={() => changeMode("p2p")} className={"rounded-2xl border p-4 text-left " + (mode === "p2p" ? "border-purple-400 bg-purple-500/10" : "border-white/10 bg-gray-900/60")}>
            <span className="flex items-center gap-2 font-semibold"><ArrowsRightLeftIcon className="h-5 w-5" /> Comercio P2P</span><span className="mt-1 block text-sm text-gray-400">Elige si comienzas con fiat o con criptomoneda.</span>
          </button>
          <button type="button" onClick={() => changeMode("cross")} className={"rounded-2xl border p-4 text-left " + (mode === "cross" ? "border-purple-400 bg-purple-500/10" : "border-white/10 bg-gray-900/60")}>
            <span className="flex items-center gap-2 font-semibold"><BoltIcon className="h-5 w-5" /> P2P entre plataformas</span><span className="mt-1 block text-sm text-gray-400">Define exchanges de origen/destino, cripto y capital.</span>
          </button>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="border-purple-500/20 bg-gray-900/80 text-white">
            <CardHeader><CardTitle>{mode === "p2p" ? "Configuración P2P" : "Ruta entre plataformas"}</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={submit}>
                {mode === "cross" && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Exchange de origen</Label><Select value={source} onValueChange={setSource}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EXCHANGES.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Exchange de destino</Label><Select value={destination} onValueChange={setDestination}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EXCHANGES.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
                </div>}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Criptomoneda</Label><Select value={crypto} onValueChange={setCrypto}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CRYPTOS.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Moneda fiat de referencia</Label><Select value={fiat} onValueChange={setFiat}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FIATS.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="space-y-2"><Label>Capital inicial en</Label><Select value={startWith} onValueChange={setStartWith}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fiat">Fiat ({fiat})</SelectItem><SelectItem value="crypto">Criptomoneda ({crypto})</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Capital inicial ({startWith === "fiat" ? fiat : crypto})</Label><Input type="number" min="0.00000001" step="any" value={capital} onChange={e=>setCapital(e.target.value)} required /></div>
                <p className="text-xs leading-5 text-gray-400">Introduce los precios manuales: precio de compra/recompra y precio de venta. Las comisiones se aplican como porcentaje del importe de cada operación.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Precio de compra / recompra ({fiat}/{crypto})</Label><Input type="number" min="0.00000001" step="any" value={buyPrice} onChange={e=>setBuyPrice(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Precio de venta ({fiat}/{crypto})</Label><Input type="number" min="0.00000001" step="any" value={sellPrice} onChange={e=>setSellPrice(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Comisión compra (%)</Label><Input type="number" min="0" max="99.99" step="any" value={buyFee} onChange={e=>setBuyFee(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Comisión venta (%)</Label><Input type="number" min="0" max="99.99" step="any" value={sellFee} onChange={e=>setSellFee(e.target.value)} /></div>
                </div>
                {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
                <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 font-semibold">Calcular escenario</button>
              </form>
            </CardContent>
          </Card>
          <Card className="border-purple-500/20 bg-gray-900/80 text-white">
            <CardHeader><CardTitle>Resultado estimado</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!result ? <p className="text-sm text-gray-400">Completa valores válidos para ver el resultado. El cálculo se actualiza automáticamente.</p> : <>
                {mode === "cross" && <div className="rounded-xl border border-white/10 p-3 text-sm text-gray-300">{source} → {destination}</div>}
                <div className="rounded-xl border border-white/10 p-4"><p className="text-xs text-gray-400">Beneficio estimado en fiat</p><p className={"mt-1 text-2xl font-bold " + (result.profitFiat >= 0 ? "text-emerald-300" : "text-rose-300")}>{money(result.profitFiat, fiat)}</p></div>
                <div className="rounded-xl border border-white/10 p-4"><p className="text-xs text-gray-400">Beneficio estimado en cripto (equivalente al precio de referencia)</p><p className={"mt-1 text-2xl font-bold " + (result.profitCrypto >= 0 ? "text-emerald-300" : "text-rose-300")}>{money(result.profitCrypto, crypto)}</p></div>
                <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/5 p-3"><p className="text-xs text-gray-400">Rentabilidad</p><p className="mt-1 font-semibold">{result.percent.toFixed(4)}%</p></div><div className="rounded-xl bg-white/5 p-3"><p className="text-xs text-gray-400">Capital final estimado</p><p className="mt-1 font-semibold">{money(startWith === "crypto" ? result.finalCrypto : result.finalFiat, startWith === "crypto" ? crypto : fiat)}</p></div></div>
                <p className="text-xs leading-5 text-gray-500">Estimación matemática con los precios y comisiones introducidos. El beneficio en cripto es una equivalencia de referencia, no una valoración de cartera ni una garantía de ejecución.</p>
              </>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
