import React, { useState } from 'react';
import { simulateArbitrage } from '../services/database';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';

const ArbitrageSimulator = () => {
  const [formData, setFormData] = useState({
    buy_exchange: '',
    sell_exchange: '',
    crypto: '',
    amount: '',
    buy_price: '',
    sell_price: '',
    buy_fee: '0',
    sell_fee: '0'
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const exchanges = ['Binance', 'Bybit', 'OKX', 'KuCoin'];
  const cryptos = ['USDT', 'BTC', 'ETH', 'BNB'];

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
    const requiredFields = ['buy_exchange', 'sell_exchange', 'crypto', 'amount', 'buy_price', 'sell_price'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setError(`Por favor completa todos los campos requeridos: ${missingFields.join(', ')}`);
      return;
    }

    if (formData.buy_exchange === formData.sell_exchange) {
      setError('Los exchanges de compra y venta deben ser diferentes');
      return;
    }

    const amount = parseFloat(formData.amount);
    const buyPrice = parseFloat(formData.buy_price);
    const sellPrice = parseFloat(formData.sell_price);
    const buyFee = parseFloat(formData.buy_fee) || 0;
    const sellFee = parseFloat(formData.sell_fee) || 0;

    if (amount <= 0 || buyPrice <= 0 || sellPrice <= 0) {
      setError('Los montos y precios deben ser mayores a 0');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const arbitrageData = {
        buy_exchange: formData.buy_exchange,
        sell_exchange: formData.sell_exchange,
        crypto: formData.crypto,
        amount: amount,
        buy_price: buyPrice,
        sell_price: sellPrice,
        buy_fee: buyFee,
        sell_fee: sellFee
      };

      const arbitrageResult = simulateArbitrage(arbitrageData);
      setResult(arbitrageResult);

    } catch (err) {
      console.error('Error in arbitrage simulation:', err);
      setError('Error al realizar la simulación. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      buy_exchange: '',
      sell_exchange: '',
      crypto: '',
      amount: '',
      buy_price: '',
      sell_price: '',
      buy_fee: '0',
      sell_fee: '0'
    });
    setResult(null);
    setError('');
  };

  const getProfitabilityColor = (profit) => {
    if (profit > 0) return 'text-green-400';
    if (profit < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getProfitabilityBadgeColor = (profit) => {
    if (profit > 0) return 'bg-green-600';
    if (profit < 0) return 'bg-red-600';
    return 'bg-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">
            Simulador de Arbitraje ⚡
          </h1>
          <p className="text-gray-300">
            Calcula oportunidades de arbitraje entre diferentes exchanges y maximiza tus ganancias
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Simulation Form */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center gap-2">
                ⚙️ Configuración de Arbitraje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSimulate} className="space-y-4">
                {error && (
                  <Alert className="border-red-600 bg-red-900/20 text-red-400">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Exchange Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buy_exchange" className="text-white">
                      Exchange de Compra *
                    </Label>
                    <Select value={formData.buy_exchange} onValueChange={(value) => handleInputChange('buy_exchange', value)}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Comprar en" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {exchanges.map(exchange => (
                          <SelectItem key={exchange} value={exchange} className="text-white hover:bg-gray-600">
                            {exchange}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sell_exchange" className="text-white">
                      Exchange de Venta *
                    </Label>
                    <Select value={formData.sell_exchange} onValueChange={(value) => handleInputChange('sell_exchange', value)}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Vender en" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {exchanges.map(exchange => (
                          <SelectItem key={exchange} value={exchange} className="text-white hover:bg-gray-600">
                            {exchange}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Crypto and Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="crypto" className="text-white">
                      Criptomoneda *
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

                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-white">
                      Cantidad *
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
                </div>

                {/* Prices */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buy_price" className="text-white">
                      Precio de Compra *
                    </Label>
                    <Input
                      id="buy_price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.buy_price}
                      onChange={(e) => handleInputChange('buy_price', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sell_price" className="text-white">
                      Precio de Venta *
                    </Label>
                    <Input
                      id="sell_price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.sell_price}
                      onChange={(e) => handleInputChange('sell_price', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Fees */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buy_fee" className="text-white">
                      Comisión Compra
                    </Label>
                    <Input
                      id="buy_fee"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.buy_fee}
                      onChange={(e) => handleInputChange('buy_fee', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sell_fee" className="text-white">
                      Comisión Venta
                    </Label>
                    <Input
                      id="sell_fee"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.sell_fee}
                      onChange={(e) => handleInputChange('sell_fee', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Quick Calculation Preview */}
                {formData.buy_price && formData.sell_price && formData.amount && (
                  <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                    <div className="text-sm text-gray-300">
                      <span>Diferencia de precio: </span>
                      <span className={getProfitabilityColor(parseFloat(formData.sell_price) - parseFloat(formData.buy_price))}>
                        {(parseFloat(formData.sell_price) - parseFloat(formData.buy_price)).toFixed(2)}
                      </span>
                      <span className="ml-2">
                        ({(((parseFloat(formData.sell_price) - parseFloat(formData.buy_price)) / parseFloat(formData.buy_price)) * 100).toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                )}

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
                        Calculando...
                      </div>
                    ) : (
                      '⚡ Calcular Arbitraje'
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
                📊 Análisis de Arbitraje
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">⚡</div>
                  <h3 className="text-xl text-gray-300 mb-2">Calcula oportunidad de arbitraje</h3>
                  <p className="text-gray-400">
                    Completa los campos del formulario y haz clic en "Calcular Arbitraje" para ver los resultados
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Exchange Summary */}
                  <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <h4 className="text-white font-medium mb-3">Resumen del Arbitraje</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">Comprar en:</span>
                        <Badge className="ml-2 bg-blue-600">
                          {result.buy_exchange}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-400">Vender en:</span>
                        <Badge className="ml-2 bg-purple-600">
                          {result.sell_exchange}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">Criptomoneda:</span>
                        <span className="text-white ml-2 font-medium">{result.crypto}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <h4 className="text-white font-medium mb-3">Desglose Financiero</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Inversión Total:</span>
                        <span className="text-white font-medium">
                          ${result.investment.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Ingresos Totales:</span>
                        <span className="text-white font-medium">
                          ${result.revenue.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Comisiones Totales:</span>
                        <span className="text-red-400 font-medium">
                          -${result.total_fees.toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t border-gray-600 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-medium">Ganancia Fiat:</span>
                          <Badge className={`text-lg {getProfitabilityBadgeColor(result.profit)}`}>
                            {result.profit.toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profitability Analysis */}
                  <div className={`rounded-lg p-4 border ${
                    result.profit > 0 
                      ? 'bg-green-900/20 border-green-600' 
                      : result.profit < 0 
                      ? 'bg-red-900/20 border-red-600'
                      : 'bg-gray-900/20 border-gray-600'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">
                        {result.profit > 0 ? '📈' : result.profit < 0 ? '📉' : '➖'}
                      </span>
                      <div>
                        <h4 className={`font-medium ${getProfitabilityColor(result.profit)}`}>
                          {result.profit > 0 
                            ? 'Oportunidad Rentable' 
                            : result.profit < 0 
                            ? 'Operación con Pérdida'
                            : 'Punto de Equilibrio'
                          }
                        </h4>
                        <p className="text-gray-400 text-sm">
                          Rentabilidad: {result.profit_percentage.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    
                    {/* Profitability Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">ROI:</span>
                        <span className={`ml-2 font-medium {getProfitabilityColor(result.profit)}`}>
                          {result.profit_percentage.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Diferencia:</span>
                        <span className="text-white ml-2 font-medium">
                          {(result.revenue - result.investment).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-600">
                      <h5 className="text-white font-medium mb-2">💡 Recomendación</h5>
                      <p className="text-gray-300 text-sm">
                        {result.profit > 10 
                          ? "¡Excelente oportunidad! Esta operación tiene un potencial de ganancia significativo."
                          : result.profit > 0 
                          ? "Operación rentable. Considera los costos de transacción y el tiempo de ejecución."
                          : result.profit === 0
                          ? "Esta operación está en punto de equilibrio. No hay ganancia ni pérdida."
                          : "Esta operación resultaría en pérdida. Busca mejores oportunidades."
                        }
                      </p>
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

export default ArbitrageSimulator;