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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (result) setResult(null);
    if (error) setError('');
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    
    // Validación de campos requeridos
    const requiredFields = ['crypto', 'fiat', 'operation_type', 'amount', 'exchange_rate'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setError(`Por favor completa todos los campos requeridos: ${missingFields.join(', ')}`);
      return;
    }

    const amount = parseFloat(formData.amount);
    const exchangeRate = parseFloat(formData.exchange_rate);
    const feePercent = parseFloat(formData.fee) || 0;

    if (amount <= 0 || exchangeRate <= 0) {
      setError('Los montos y tasas de cambio deben ser mayores a 0');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // --- Nueva lógica: la comisión SIEMPRE será cobrada en la cripto seleccionada ---
      // Mantendremos las mismas etiquetas del UI:
      // - "Cantidad Enviada": lo que el usuario entrega (crypto si Venta, fiat si Compra)
      // - "Cantidad Recibida (Bruta)": valor bruto antes de aplicar comisión (fiat para Venta, crypto para Compra)
      // - "Comisión": se muestra y calcula siempre en la criptomoneda seleccionada
      // - "Cantidad Neta": cantidad final (en la unidad que la UI ya mostraba: fiat para Venta, crypto para Compra)
      let amount_sent, amount_received, fee_amount, net_amount;

      if (formData.operation_type === 'Venta') {
        // Usuario vende cripto → entrega 'amount' en CRIPTO y recibe fiat
        amount_sent = amount; // en cripto
        // bruto fiat (antes de comisión)
        amount_received = amount * exchangeRate; // en fiat

        // comisión en cripto (porcentaje sobre la cantidad enviada en cripto)
        fee_amount = (amount * feePercent) / 100; // en cripto

        // cantidad neta en cripto (cripto - comisión en cripto)
        const net_crypto = amount - fee_amount; // en cripto

        // cantidad neta en fiat (lo que realmente recibe el usuario en fiat después de cobrar comisión en cripto)
        net_amount = net_crypto * exchangeRate; // en fiat (UI espera net en fiat para 'Venta')
        
        // guardamos también valores auxiliares si los quieres usar en UI (por compatibilidad)
        setResult({
          crypto: formData.crypto,
          fiat: formData.fiat,
          operation_type: formData.operation_type,
          exchange_rate: exchangeRate,
          fee: feePercent,
          amount, // amount original (cripto)
          amount_sent, // crypto
          amount_received, // bruto fiat
          fee_amount, // crypto
          net_amount, // fiat (para mostrar en UI donde net se muestra en fiat para Venta)
          // Proporcionamos también net_crypto por si quieres usarlo en otro lugar
          net_crypto
        });
      } else {
        // Compra: usuario entrega fiat (amount) y recibe cripto
        amount_sent = amount; // en fiat
        // bruto crypto antes de comisión
        amount_received = amount / exchangeRate; // en crypto

        // comisión en cripto (porcentaje sobre la cantidad bruta recibida en cripto)
        fee_amount = (amount_received * feePercent) / 100; // en cripto

        // cantidad neta en cripto (cripto bruto - comisión en cripto)
        net_amount = amount_received - fee_amount; // en crypto (UI espera net en crypto para 'Compra')

        setResult({
          crypto: formData.crypto,
          fiat: formData.fiat,
          operation_type: formData.operation_type,
          exchange_rate: exchangeRate,
          fee: feePercent,
          amount, // amount original (fiat)
          amount_sent, // fiat
          amount_received, // bruto crypto
          fee_amount, // crypto
          net_amount // crypto
        });
      }

      // Nota: no eliminé la importación de simulateP2P en caso de que la uses en otro flujo.
    } catch (err) {
      console.error('Error in P2P simulation:', err);
      setError('Error al realizar la simulación. Por favor intenta de nuevo.');
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
            Simula operaciones peer-to-peer y calcula ganancias/pérdidas en tiempo real con nuestra tecnología avanzada
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
                    <Label htmlFor="crypto" className="text-gray-300 font-medium">
                      Criptomoneda <span className="text-red-400">*</span>
                    </Label>
                    <Select 
                      value={formData.crypto} 
                      onValueChange={(value) => handleInputChange('crypto', value)}
                      disabled={loading}
                    >
                      <SelectTrigger className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl disabled:opacity-50">
                        <SelectValue placeholder="Seleccionar crypto" />
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
                    <Label htmlFor="fiat" className="text-gray-300 font-medium">
                      Moneda Fiat <span className="text-red-400">*</span>
                    </Label>
                    <Select 
                      value={formData.fiat} 
                      onValueChange={(value) => handleInputChange('fiat', value)}
                      disabled={loading}
                    >
                      <SelectTrigger className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl disabled:opacity-50">
                        <SelectValue placeholder="Seleccionar fiat" />
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
                  <Label htmlFor="operation_type" className="text-gray-300 font-medium">
                    Tipo de Operación <span className="text-red-400">*</span>
                  </Label>
                  <Select 
                    value={formData.operation_type} 
                    onValueChange={(value) => handleInputChange('operation_type', value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl disabled:opacity-50">
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
                      Cantidad <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="amount"
                      type="number"
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
                      Tasa de Cambio <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="exchange_rate"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.exchange_rate}
                      onChange={(e) => handleInputChange('exchange_rate', e.target.value)}
                      className="bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl disabled:opacity-50"
                      disabled={loading}
                    />
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
                    <h4 className="text-white font-medium mb-4 text-lg">Resumen de Operación</h4>
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
                        <span className="text-white ml-2 font-medium">{result.fee}% en {result.crypto}</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculation Details */}
                  <div className="bg-gray-800/50 rounded-xl p-5 border border-purple-500/20">
                    <h4 className="text-white font-medium mb-4 text-lg">Detalles del Cálculo</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Cantidad Enviada:</span>
                        <span className="text-white font-medium">
                          {result.amount_sent !== undefined
                            ? (result.operation_type === 'Venta'
                                ? Number(result.amount_sent).toFixed(8) + ' ' + result.crypto
                                : Number(result.amount_sent).toFixed(2) + ' ' + result.fiat)
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Cantidad Recibida (Bruta):</span>
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
                          <span className="text-white font-medium">Cantidad Neta:</span>
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

                  {/* Profitability Indicator */}
                  <div className={`rounded-xl p-5 border ${ (typeof result.net_amount === 'number' ? result.net_amount : 0) > 0 ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${ (typeof result.net_amount === 'number' ? result.net_amount : 0) > 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        <span className={`text-2xl ${ (typeof result.net_amount === 'number' ? result.net_amount : 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(typeof result.net_amount === 'number' ? result.net_amount : 0) > 0 ? '📈' : '📉'}
                        </span>
                      </div>
                      <div>
                        <h4 className={`font-medium text-lg ${ (typeof result.net_amount === 'number' ? result.net_amount : 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(typeof result.net_amount === 'number' ? result.net_amount : 0) > 0 ? 'Operación Rentable' : 'Operación con Pérdida'}
                        </h4>
                        <p className="text-gray-400 text-sm">
                          {result.operation_type === 'Venta' 
                            ? 'Vendiendo criptomonedas por moneda fiat'
                            : 'Comprando criptomonedas con moneda fiat'
                          }
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