import React, { useState } from 'react';
import { simulateP2P } from '../utils/simulations';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { CalculatorIcon, ArrowPathIcon, TrashIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const P2PSimulator = () => {
  const [formData, setFormData] = useState({
    crypto: '',
    fiat: '',
    operation_type: '',
    amount: '',
    exchange_rate: '',
    fee: '0'
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const cryptos = ['USDT', 'BTC', 'ETH', 'BNB', 'USDC'];
  const fiats = ['EUR', 'USD', 'VES', 'MXN', 'COP', 'ARS', 'BRL'];
  const operationTypes = ['Venta', 'Compra'];

  const handleInputChange = (field, value) => {
    setFormData((previous) => {
      const next = { ...previous, [field]: value };

      // La misma cifra puede representar cripto o fiat según la operación y el par.
      if (field === "operation_type" && value !== previous.operation_type) {
        next.amount = "";
        next.exchange_rate = "";
      } else if (field === "crypto" && value !== previous.crypto) {
        next.exchange_rate = "";
        if (previous.operation_type === "Venta") next.amount = "";
      } else if (field === "fiat" && value !== previous.fiat) {
        next.exchange_rate = "";
        if (previous.operation_type === "Compra") next.amount = "";
      }

      return next;
    });
    if (result) setResult(null);
    if (error) setError("");
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    
    // Validación de campos requeridos
    const requiredFields = ['crypto', 'fiat', 'operation_type', 'amount', 'exchange_rate'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      const fieldLabels = {
        crypto: "criptomoneda",
        fiat: "moneda fiat",
        operation_type: "tipo de operación",
        amount: "cantidad",
        exchange_rate: "tasa de cambio",
      };
      const missingLabels = missingFields.map((field) => fieldLabels[field] || field);
      setError(`Completa estos campos obligatorios: ${missingLabels.join(", ")}.`);
      return;
    }

    const amount = Number(formData.amount);
    const exchangeRate = Number(formData.exchange_rate);
    const feePercent = formData.fee === '' ? 0 : Number(formData.fee);

    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      setError('Las cantidades y la tasa de cambio deben ser números mayores que 0');
      return;
    }
    if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent >= 100) {
      setError('La comisión debe ser un porcentaje entre 0 y menos de 100');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const simulationResult = simulateP2P({
        crypto: formData.crypto,
        fiat: formData.fiat,
        operation_type: formData.operation_type,
        amount,
        exchange_rate: exchangeRate,
        fee: feePercent,
      });
      setResult(simulationResult);
    } catch (err) {
      console.error('Error en el simulador P2P:', err);
      setError(err.message || 'Error al realizar la simulación. Revisa los importes y la comisión.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      crypto: '',
      fiat: '',
      operation_type: '',
      amount: '',
      exchange_rate: '',
      fee: '0'
    });
    setResult(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-4">
            <CalculatorIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Simulador P2P
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Calcula las cantidades brutas y netas tras la comisión. Para conocer la ganancia real, también necesitas el coste al que adquiriste la criptomoneda.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Simulation Form */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-purple-500/20 shadow-xl">
            <CardHeader className="border-b border-purple-500/10">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <ChartBarIcon className="h-5 w-5 text-purple-400" />
                </div>
                Configuración de Simulación
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSimulate} className="space-y-5">
                {error && (
                  <Alert className="border-red-500/30 bg-red-900/20 text-red-400 rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Crypto */}
                  <div className="space-y-2">
                    <Label id="p2p-crypto-label" htmlFor="p2p-crypto" className="text-gray-300 font-medium">
                      Criptomoneda <span className="text-red-400">*</span>
                    </Label>
                    <Select 
                      value={formData.crypto} 
                      onValueChange={(value) => handleInputChange('crypto', value)}
                      disabled={loading}
                    >
                      <SelectTrigger id="p2p-crypto" aria-labelledby="p2p-crypto-label" className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl disabled:opacity-50">
                        <SelectValue placeholder="Seleccionar criptomoneda" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-purple-500/30 text-white">
                        {cryptos.map(crypto => (
                          <SelectItem key={crypto} value={crypto} className="rounded-lg focus:bg-purple-500/10">
                            {crypto}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fiat */}
                  <div className="space-y-2">
                    <Label id="p2p-fiat-label" htmlFor="p2p-fiat" className="text-gray-300 font-medium">
                      Moneda fiat <span className="text-red-400">*</span>
                    </Label>
                    <Select 
                      value={formData.fiat} 
                      onValueChange={(value) => handleInputChange('fiat', value)}
                      disabled={loading}
                    >
                      <SelectTrigger id="p2p-fiat" aria-labelledby="p2p-fiat-label" className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl disabled:opacity-50">
                        <SelectValue placeholder="Seleccionar moneda fiat" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-purple-500/30 text-white">
                        {fiats.map(fiat => (
                          <SelectItem key={fiat} value={fiat} className="rounded-lg focus:bg-purple-500/10">
                            {fiat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Operation Type */}
                <div className="space-y-2">
                  <Label id="p2p-operation-type-label" htmlFor="p2p-operation-type" className="text-gray-300 font-medium">
                    Tipo de Operación <span className="text-red-400">*</span>
                  </Label>
                  <Select 
                    value={formData.operation_type} 
                    onValueChange={(value) => handleInputChange('operation_type', value)}
                    disabled={loading}
                  >
                    <SelectTrigger id="p2p-operation-type" aria-labelledby="p2p-operation-type-label" className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl disabled:opacity-50">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-purple-500/30 text-white">
                      {operationTypes.map(type => (
                        <SelectItem key={type} value={type} className="rounded-lg focus:bg-purple-500/10">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount and Exchange Rate */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-gray-300 font-medium">
                      {formData.operation_type === 'Venta'
                        ? 'Cantidad de criptomoneda que vendes'
                        : formData.operation_type === 'Compra'
                          ? 'Importe en moneda fiat que inviertes'
                          : 'Cantidad'} <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.00000001"
                      placeholder="0.00000000"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      className="bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl disabled:opacity-50"
                      disabled={loading}
                    />
                  </div>

                  {/* Exchange Rate */}
                  <div className="space-y-2">
                    <Label htmlFor="exchange_rate" className="text-gray-300 font-medium">
                      Tasa de cambio <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="exchange_rate"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.exchange_rate}
                      onChange={(e) => handleInputChange('exchange_rate', e.target.value)}
                      className="bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl disabled:opacity-50"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500">
                      Indica cuántas unidades de {formData.fiat || 'moneda fiat'} equivalen a 1 {formData.crypto || 'unidad de cripto'}.
                    </p>
                  </div>
                </div>

                {/* Fee */}
                <div className="space-y-2">
                  <Label htmlFor="fee" className="text-gray-300 font-medium">
                    Comisión (%)
                  </Label>
                  <Input
                    id="fee"
                    type="number"
                    min="0"
                    max="99.99"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.fee}
                    onChange={(e) => handleInputChange('fee', e.target.value)}
                    className="bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl disabled:opacity-50"
                    disabled={loading}
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium h-11 rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/20 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Simulando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ArrowPathIcon className="h-4 w-4" />
                        Simular Operación
                      </div>
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={resetForm}
                    variant="outline"
                    aria-label="Limpiar formulario"
                    title="Limpiar formulario"
                    className="border-purple-500/30 text-gray-300 hover:bg-gray-700/50 h-11 rounded-xl disabled:opacity-50"
                    disabled={loading}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Results */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-purple-500/20 shadow-xl">
            <CardHeader className="border-b border-purple-500/10">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <ChartBarIcon className="h-5 w-5 text-blue-400" />
                </div>
                Resultados de Simulación
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-2xl mb-4 animate-pulse">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                  </div>
                  <h3 className="text-xl text-gray-300 mb-2">Procesando simulación</h3>
                  <p className="text-gray-500">
                    Calculando resultados...
                  </p>
                </div>
              ) : !result ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-2xl mb-4">
                    <CalculatorIcon className="h-8 w-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl text-gray-300 mb-2">Simula una operación P2P</h3>
                  <p className="text-gray-500">
                    Completa los campos del formulario y haz clic en "Simular" para ver los resultados
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Operation Summary */}
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-purple-500/20">
                    <h4 className="text-white font-medium mb-4 text-lg">Resumen de la operación</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center">
                        <span className="text-gray-400">Tipo:</span>
                        <Badge className="ml-2 bg-blue-500/20 text-blue-400 border-blue-500/30">
                          {result.operation_type}
                        </Badge>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-400">Par:</span>
                        <span className="text-white ml-2 font-medium">{result.crypto}/{result.fiat}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-400">Tasa:</span>
                        <span className="text-white ml-2 font-medium">{result.exchange_rate}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-400">Comisión:</span>
                        <span className="text-white ml-2 font-medium">{result.fee}% en {result.fee_currency || result.crypto}</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculation Details */}
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-purple-500/20">
                    <h4 className="text-white font-medium mb-4 text-lg">Detalles del cálculo</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Cantidad enviada:</span>
                        <span className="text-white font-medium">
                          {result.amount_sent !== undefined
                            ? (result.operation_type === 'Venta'
                                ? Number(result.amount_sent).toFixed(8) + ' ' + result.crypto
                                : Number(result.amount_sent).toFixed(2) + ' ' + result.fiat)
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Cantidad recibida (bruta):</span>
                        <span className="text-white font-medium">
                          {result.amount_received !== undefined
                            ? (result.operation_type === 'Venta'
                                ? Number(result.amount_received).toFixed(2) + ' ' + result.fiat
                                : Number(result.amount_received).toFixed(8) + ' ' + result.crypto)
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Comisión:</span>
                        <span className="text-red-400 font-medium">
                          {result.fee_amount !== undefined
                            ? ('-' + Number(result.fee_amount).toFixed(8) + ' ' + result.crypto)
                            : ('-' + result.fee + ' ' + result.crypto)}
                        </span>
                      </div>
                      <div className="border-t border-purple-500/20 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-medium">Cantidad neta:</span>
                          <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white text-lg px-3 py-1 rounded-lg">
                            {result.net_amount !== undefined
                              ? (result.operation_type === 'Venta'
                                  ? Number(result.net_amount).toFixed(2) + ' ' + result.fiat
                                  : Number(result.net_amount).toFixed(8) + ' ' + result.crypto)
                              : 'N/A'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* A positive conversion amount is not the same as a trading profit. */}
                  <div className="rounded-xl p-5 border bg-blue-900/20 border-blue-500/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <span className="text-2xl text-blue-400">ℹ️</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-lg text-blue-300">Conversión calculada</h4>
                        <p className="text-gray-400 text-sm">
                          El importe neto refleja la comisión, no el beneficio. Para calcular ganancias o pérdidas, registra también el coste de compra y la venta correspondiente.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default P2PSimulator;