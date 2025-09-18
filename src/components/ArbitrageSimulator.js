import React, { useState } from "react";
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
import { Bolt } from "lucide-react";

// Nueva función de cálculo para la ganancia en criptomonedas
const calculateCryptoArbitrage = (data) => {
  const { amount, buy_price, sell_price, buy_fee, sell_fee } = data;
  
  // Convertimos todos los valores a números flotantes
  const initial_investment = parseFloat(amount);
  const sell_price_num = parseFloat(sell_price);
  const buy_price_num = parseFloat(buy_price);
  const buy_fee_num = parseFloat(buy_fee) / 100;
  const sell_fee_num = parseFloat(sell_fee) / 100;

  // Paso 1: Venta
  const result1 = initial_investment * sell_price_num;

  // Paso 2: Restar la comisión de venta
  const result2 = result1 - (result1 * sell_fee_num);

  // Paso 3: Comprar
  const result3 = result2 / buy_price_num;

  // Paso 4: Restar la comisión de compra
  const final_amount = result3 - (result3 * buy_fee_num);
  
  // Ganancia en criptomoneda
  const crypto_profit = final_amount - initial_investment;
  
  // Porcentaje de ganancia
  const profit_percentage = (crypto_profit / initial_investment) * 100;

  return {
    investment: initial_investment,
    revenue: final_amount,
    profit: crypto_profit,
    profit_percentage: profit_percentage,
  };
};

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

  const cryptos = ["USDT", "ETH", "BTC", "SOL", "BNB"];
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

    const { amount, buy_price, sell_price, crypto, fiat_currency } = formData;
    if (!amount || !buy_price || !sell_price || !crypto || !fiat_currency) {
      setError("Por favor, completa todos los campos obligatorios.");
      setResult(null);
      return;
    }

    try {
      const calculatedResult = calculateCryptoArbitrage(formData); 
      setResult(calculatedResult);
      setError(null);
    } catch (err) {
      setError("Error al calcular el arbitraje. Revisa los valores.");
      setResult(null);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-4 text-gray-100"> {/* Texto claro para mejor legibilidad */}
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-yellow-400 flex items-center justify-center">
            <Bolt className="h-8 w-8 mr-2" />
            Simulador de Arbitraje
          </h1>
          <p className="text-gray-300 mt-2">
            Calcula oportunidades de arbitraje entre diferentes exchanges y maximiza tus ganancias
          </p>
        </div>
        
        <Card className="bg-gray-800 border-gray-700 p-6">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl font-semibold text-yellow-400 flex items-center gap-2">
              <Bolt className="h-5 w-5" /> Configuración de Arbitraje
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="crypto" className="text-gray-300 flex items-center">
                    Criptomoneda <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select
                    name="crypto"
                    value={formData.crypto}
                    onValueChange={(value) => handleSelectChange("crypto", value)}
                  >
                    <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white mt-1">
                      <SelectValue placeholder="Crypto" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 text-white">
                      {cryptos.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount" className="text-gray-300 flex items-center">
                    Cantidad <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.000001"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00000000"
                    className="w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="buy_price" className="text-gray-300 flex items-center">
                    Precio de Compra <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="buy_price"
                    value={formData.buy_price}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400 mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="sell_price" className="text-gray-300 flex items-center">
                    Precio de Venta <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="sell_price"
                    value={formData.sell_price}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fiat_currency" className="text-gray-300 flex items-center">
                    Moneda Fiat <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select
                    name="fiat_currency"
                    value={formData.fiat_currency}
                    onValueChange={(value) => handleSelectChange("fiat_currency", value)}
                  >
                    <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white mt-1">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 text-white">
                      {fiatCurrencies.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="buy_fee" className="text-gray-300">Comisión Compra</Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="buy_fee"
                    value={formData.buy_fee}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400 mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="sell_fee" className="text-gray-300">Comisión Venta</Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="sell_fee"
                    value={formData.sell_fee}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400 mt-1"
                  />
                </div>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-red-300">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button type="submit" className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
                  <Bolt className="h-5 w-5 mr-2" /> Calcular Arbitraje
                </Button>
                <Button type="button" onClick={handleClear} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold">
                  Limpiar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card className="bg-gray-800 border-gray-700 p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-xl font-semibold text-yellow-400 flex items-center gap-2">
                Análisis de Arbitraje
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <div>
                <Label className="block text-sm text-gray-400">Inversión Total</Label>
                <Badge className="text-lg font-bold bg-gray-700 text-white">
                  {result.investment.toFixed(2)} {formData.crypto}
                </Badge>
              </div>
              <div>
                <Label className="block text-sm text-gray-400">Ingresos Totales</Label>
                <Badge className="text-lg font-bold bg-gray-700 text-white">
                  {result.revenue.toFixed(2)} {formData.crypto}
                </Badge>
              </div>
              <div>
                <Label className="block text-sm text-gray-400">Ganancia Cripto</Label>
                <Badge
                  className={`text-lg font-bold ${
                    result.profit > 0 ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  {result.profit.toFixed(2)} {formData.crypto}
                </Badge>
              </div>
              <div>
                <Label className="block text-sm text-gray-400">Porcentaje de Ganancia</Label>
                <Badge
                  className={`text-lg font-bold ${
                    result.profit_percentage > 0 ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  {result.profit_percentage.toFixed(2)}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ArbitrageSimulator;