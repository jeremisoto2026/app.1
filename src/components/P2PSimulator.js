import React, { useState } from 'react';
import { simulateP2P } from '../services/database';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';

const P2PSimulator = () => {
  const [formData, setFormData] = useState({
    crypto: '',
    fiat: '',
    // exchange: '', <--- Eliminado
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
  // const exchanges = ['Binance', 'Bybit', 'OKX', 'KuCoin']; <--- Eliminado
  const operationTypes = ['Venta', 'Compra'];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear result and error when input changes
    if (result) setResult(null);
    if (error) setError('');
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    
    // Validation
    const requiredFields = ['crypto', 'fiat', 'operation_type', 'amount', 'exchange_rate'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setError(`Por favor completa todos los campos requeridos: ${missingFields.join(', ')}`);
      return;
    }

    const amount = parseFloat(formData.amount);
    const exchangeRate = parseFloat(formData.exchange_rate);
    const fee = parseFloat(formData.fee) || 0;

    if (amount <= 0 || exchangeRate <= 0) {
      setError('Los montos y tasas de cambio deben ser mayores a 0');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const simulationData = {
        crypto: formData.crypto,
        fiat: formData.fiat,
        // exchange: formData.exchange, <--- Eliminado
        operation_type: formData.operation_type,
        amount: amount,
        exchange_rate: exchangeRate,
        fee: fee
      };

      const simulationResult = simulateP2P(simulationData);
      setResult(simulationResult);

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
      // exchange: '', <--- Eliminado
      operation_type: '',
      amount: '',
      exchange_rate: '',
      fee: '0'
    });
    setResult(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">
            Simulador P2P 🤝
          </h1>
          <p className="text-gray-300">
            Simula operaciones peer-to-peer y calcula ganancias/pérdidas en tiempo real
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Simulation Form */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center gap-2">
                ⚙️ Configuración de Simulación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSimulate} className="space-y-4">
                {error && (
                  <Alert className="border-red-600 bg-red-900/20 text-red-400">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Crypto */}
                  <div className="space-y-2">
                    <Label htmlFor="crypto" className="text-white">
                      Criptomoneda <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.crypto} onValueChange={(value) => handleInputChange('crypto', value)}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Crypto" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {cryptos.map(crypto => (
                          <SelectItem key={crypto} value={crypto} className="text-white hover:bg-gray-600">
                            {crypto}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fiat */}
                  <div className="space-y-2">
                    <Label htmlFor="fiat" className="text-white">
                      Moneda Fiat <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.fiat} onValueChange={(value) => handleInputChange('fiat', value)}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Fiat" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {fiats.map(fiat => (
                          <SelectItem key={fiat} value={fiat} className="text-white hover:bg-gray-600">
                            {fiat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Operation Type */}
                  <div className="space-y-2">
                    <Label htmlFor="operation_type" className="text-white">
                      Tipo <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.operation_type} onValueChange={(value) => handleInputChange('operation_type', value)}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Operación" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {operationTypes.map(type => (
                          <SelectItem key={type} value={type} className="text-white hover:bg-gray-600">
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-white">
                    Cantidad <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.00000001"
                    placeholder="0.00000000"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                {/* Exchange Rate */}
                <div className="space-y-2">
                  <Label htmlFor="exchange_rate" className="text-white">
                    Tasa de Cambio <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="exchange_rate"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.exchange_rate}
                    onChange={(e) => handleInputChange('exchange_rate', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                {/* Fee */}
                <div className="space-y-2">
                  <Label htmlFor="fee" className="text-white">
                    Comisión
                  </Label>
                  <Input
                    id="fee"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.fee}
                    onChange={(e) => handleInputChange('fee', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black font-medium"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                        Simulando...
                      </div>
                    ) : (
                      '🔄 Simular'
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={resetForm}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    🗑️ Limpiar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Results */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center gap-2">
                📊 Resultados de Simulación
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🤝</div>
                  <h3 className="text-xl text-gray-300 mb-2">Simula una operación P2P</h3>
                  <p className="text-gray-400">
                    Completa los campos del formulario y haz clic en "Simular" para ver los resultados
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Operation Summary */}
                  <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <h4 className="text-white font-medium mb-3">Resumen de Operación</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">Tipo:</span>
                        <Badge className="ml-2 bg-blue-600">
                          {result.operation_type}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-400">Par:</span>
                        <span className="text-white ml-2">{result.crypto}/{result.fiat}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Tasa:</span>
                        <span className="text-white ml-2">{result.exchange_rate}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Comisión:</span>
                        <span className="text-white ml-2">{result.fee}</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculation Details */}
                  <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <h4 className="text-white font-medium mb-3">Detalles del Cálculo</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Cantidad Enviada:</span>
                        <span className="text-white font-medium">
                          {result.amount_sent.toFixed(2)} {result.operation_type === 'Venta' ? result.crypto : result.fiat}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Cantidad Recibida (Bruta):</span>
                        <span className="text-white font-medium">
                          {result.amount_received.toFixed(2)} {result.operation_type === 'Venta' ? result.fiat : result.crypto}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Comisión:</span>
                        <span className="text-red-400 font-medium">
                          -{result.fee.toFixed(2)} {result.operation_type === 'Venta' ? result.fiat : result.crypto}
                        </span>
                      </div>
                      <div className="border-t border-gray-600 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-medium">Cantidad Neta:</span>
                          <Badge className="bg-green-600 text-lg">
                            {result.net_amount.toFixed(2)} {result.operation_type === 'Venta' ? result.fiat : result.crypto}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profitability Indicator */}
                  <div className={`rounded-lg p-4 border ${result.net_amount > result.amount_sent ? 'bg-green-900/20 border-green-600' : 'bg-red-900/20 border-red-600'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {result.net_amount > result.amount_sent ? '📈' : '📉'}
                      </span>
                      <div>
                        <h4 className={`font-medium ${result.net_amount > result.amount_sent ? 'text-green-400' : 'text-red-400'}`}>
                          {result.net_amount > result.amount_sent ? 'Operación Favorable' : 'Operación con Pérdida'}
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