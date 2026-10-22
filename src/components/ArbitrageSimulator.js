import React, { useState } from "react";
import { calculateCryptoArbitrage } from "../utils/financialCalculations";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { CalculatorIcon, TrashIcon, ChartBarIcon, BoltIcon } from "@heroicons/react/24/outline";


const ArbitrageSimulator = () => {
  const [formData, setFormData] = useState({
    crypto: "",
    fiat_currency: "",
    amount: "",
    buy_price: "",
    sell_price: "",
    buy_fee: 0,
    sell_fee: 0,
  });

  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const cryptos = ["USDT", "USDC", "ETH", "BTC", "SOL", "BNB"];
  const fiatCurrencies = ["USD", "EUR", "VES", "COP", "MXN", "CLP", "ARS", "BRL"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    const { amount, buy_price, sell_price, crypto, fiat_currency } = formData;
    if (!amount || !buy_price || !sell_price || !crypto || !fiat_currency) {
      setError("Por favor, completa todos los campos obligatorios.");
      setResult(null);
      setLoading(false);
      return;
    }

    try {
      const calculatedResult = calculateCryptoArbitrage(formData); 
      setResult(calculatedResult);
      setError(null);
    } catch (err) {
      setError(err.message || "Error al calcular el arbitraje. Comprueba los importes y las comisiones.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({
      crypto: "",
      fiat_currency: "",
      amount: "",
      buy_price: "",
      sell_price: "",
      buy_fee: 0,
      sell_fee: 0,
    });
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black p-4 md:p-6 text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-4">
            <BoltIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Simulador de Arbitraje
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Simula vender tu cripto al precio de venta y recomprarla al precio de compra. El resultado muestra cuánta cripto ganas o pierdes después de ambas comisiones.
          </p>
        </div>
        
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-purple-500/20 shadow-xl p-6">
          <CardHeader className="p-0 mb-6 border-b border-purple-500/10 pb-4">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <ChartBarIcon className="h-5 w-5 text-purple-400" />
              </div>
              Configuración de Arbitraje
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="crypto" className="text-gray-300 font-medium">
                    Criptomoneda <span className="text-red-400 ml-1">*</span>
                  </Label>
                  <Select
                    name="crypto"
                    value={formData.crypto}
                    onValueChange={(value) => handleSelectChange("crypto", value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl">
                      <SelectValue placeholder="Seleccionar criptomoneda" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-purple-500/30 text-white">
                      {cryptos.map((c) => (
                        <SelectItem key={c} value={c} className="rounded-lg focus:bg-purple-500/10">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-gray-300 font-medium">
                    Cantidad <span className="text-red-400 ml-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.000001"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00000000"
                    className="w-full bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buy_price" className="text-gray-300 font-medium">
                    Precio de Compra (recompra) <span className="text-red-400 ml-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="buy_price"
                    value={formData.buy_price}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sell_price" className="text-gray-300 font-medium">
                    Precio de Venta (venta inicial) <span className="text-red-400 ml-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="sell_price"
                    value={formData.sell_price}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fiat_currency" className="text-gray-300 font-medium">
                    Moneda fiat <span className="text-red-400 ml-1">*</span>
                  </Label>
                  <Select
                    name="fiat_currency"
                    value={formData.fiat_currency}
                    onValueChange={(value) => handleSelectChange("fiat_currency", value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-purple-500/30 text-white">
                      {fiatCurrencies.map((f) => (
                        <SelectItem key={f} value={f} className="rounded-lg focus:bg-purple-500/10">
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buy_fee" className="text-gray-300 font-medium">Comisión de compra (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="buy_fee"
                    value={formData.buy_fee}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sell_fee" className="text-gray-300 font-medium">Comisión de venta (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="sell_fee"
                    value={formData.sell_fee}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl"
                    disabled={loading}
                  />
                </div>
              </div>
              
              {error && (
                <Alert className="border-red-500/30 bg-red-900/20 text-red-400 rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium h-11 rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/20"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Calculando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CalculatorIcon className="h-4 w-4" />
                      Calcular Arbitraje
                    </div>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleClear}
                  variant="outline"
                  className="border-purple-500/30 text-gray-300 hover:bg-gray-700/50 h-11 rounded-xl"
                  disabled={loading}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {loading && (
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-purple-500/20 shadow-xl p-6">
            <CardContent className="p-0 text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-2xl mb-4 animate-pulse">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
              </div>
              <h3 className="text-xl text-gray-300 mb-2">Calculando arbitraje</h3>
              <p className="text-gray-500">Procesando resultados...</p>
            </CardContent>
          </Card>
        )}

        {result && !loading && (
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-purple-500/20 shadow-xl p-6">
            <CardHeader className="p-0 mb-6 border-b border-purple-500/10 pb-4">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <ChartBarIcon className="h-5 w-5 text-blue-400" />
                </div>
                Resultados del Arbitraje
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 rounded-xl p-5 border border-purple-500/20">
                  <h4 className="text-white font-medium mb-4 text-lg">Resumen de la operación</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Criptomoneda:</span>
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                        {formData.crypto}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Moneda fiat:</span>
                      <span className="text-white font-medium">{formData.fiat_currency}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Comisión de compra:</span>
                      <span className="text-white font-medium">{formData.buy_fee}% en cripto</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Comisión de venta:</span>
                      <span className="text-white font-medium">{formData.sell_fee}% en fiat</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-5 border border-purple-500/20">
                  <h4 className="text-white font-medium mb-4 text-lg">Resultados financieros</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Cripto inicial:</span>
                      <span className="text-white font-medium">
                        {result.investment.toFixed(8)} {formData.crypto}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Cripto final tras recomprar:</span>
                      <span className="text-white font-medium">
                        {result.revenue.toFixed(8)} {formData.crypto}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Venta neta en fiat:</span>
                      <span className="text-white font-medium">
                        {result.net_fiat_proceeds.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.fiat_currency}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Comisión de venta:</span>
                      <span className="text-white font-medium">
                        {result.sell_fee_fiat.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.fiat_currency}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Comisión de compra:</span>
                      <span className="text-white font-medium">
                        {result.buy_fee_crypto.toFixed(8)} {formData.crypto}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Ganancia/Pérdida en {formData.crypto}:</span>
                      <Badge className={`text-lg font-semibold ${
                        result.profit > 0 
                          ? "bg-green-500/20 text-green-400 border-green-500/30" 
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      }`}>
                        {result.profit > 0 ? "+" : ""}{result.profit.toFixed(8)} {formData.crypto}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Equivalente estimado al precio de recompra:</span>
                      <span className={`font-medium ${result.profit_fiat_equivalent > 0 ? "text-green-400" : result.profit_fiat_equivalent < 0 ? "text-red-400" : "text-white"}`}>
                        {result.profit_fiat_equivalent.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {formData.fiat_currency}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Es una valoración estimada de la diferencia en cripto al precio de recompra; no es dinero fiat ya cobrado.
                    </p>
                    <div className="border-t border-purple-500/20 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">Rentabilidad sobre cripto inicial:</span>
                        <Badge className={`text-lg font-semibold ${
                          result.profit_percentage > 0 
                            ? "bg-gradient-to-r from-green-500 to-green-600 text-white" 
                            : "bg-gradient-to-r from-red-500 to-red-600 text-white"
                        }`}>
                          {result.profit_percentage > 0 ? "+" : ""}{result.profit_percentage.toFixed(2)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`mt-6 rounded-xl p-5 border ${
                result.profit > 0 
                  ? 'bg-green-900/20 border-green-500/30' 
                  : 'bg-red-900/20 border-red-500/30'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    result.profit > 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    <span className={`text-2xl ${result.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {result.profit > 0 ? '📈' : '📉'}
                    </span>
                  </div>
                  <div>
                    <h4 className={`font-medium text-lg ${
                      result.profit > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {result.profit > 0 ? 'Arbitraje Rentable' : 'Arbitraje No Rentable'}
                    </h4>
                    <p className="text-gray-400 text-sm">
                      {result.profit > 0 
                        ? 'Esta operación de arbitraje generaría ganancias.'
                        : 'Esta operación de arbitraje resultaría en pérdidas.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ArbitrageSimulator;