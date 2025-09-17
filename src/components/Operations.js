import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveOperation } from '../services/database';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';

const Operations = ({ onOperationSaved }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    exchange: '',
    operation_type: '',
    crypto: '',
    fiat: '',
    amount: '',
    exchange_rate: '',
    fee: '0'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const exchanges = ['Binance', 'Bybit', 'OKX', 'KuCoin'];
  const operationTypes = ['Venta', 'Compra'];
  const cryptos = ['USDT', 'BTC', 'ETH', 'BNB'];
  const fiats = ['EUR', 'USD', 'VES', 'MXN', 'COP', 'ARS', 'BRL'];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const calculateFiatAmount = () => {
    const { operation_type, crypto_amount, exchange_rate, fee } = formData;
    const Amount = parseFloat(amount) || 0;
    const rate = parseFloat(exchange_rate) || 0;
    const feeAmount = parseFloat(fee) || 0;

    if (operation_type === 'Venta') {
      // Selling crypto, receiving fiat
      return (Amount * rate) - feeAmount;
    } else {
      // Buying crypto with fiat
      return (Amount / rate) - feeAmount;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('Debes iniciar sesión para crear operaciones');
      return;
    }

    // Validation
    const requiredFields = ['exchange', 'operation_type', 'crypto', 'fiat', 'amount', 'exchange_rate'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setError(`Por favor completa todos los campos requeridos: ${missingFields.join(', ')}`);
      return;
    }

    const Amount = parseFloat(formData.amount);
    const exchangeRate = parseFloat(formData.exchange_rate);
    const fee = parseFloat(formData.fee) || 0;

    if (Amount <= 0 || exchangeRate <= 0) {
      setError('Los montos y tasas de cambio deben ser mayores a 0');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const fiatAmount = calculateFiatAmount();
      
      const operationData = {
        exchange: formData.exchange,
        operation_type: formData.operation_type,
        crypto: formData.crypto,
        fiat: formData.fiat,
        amount: Amount,
        exchange_rate: exchangeRate,
        fee: fee,
        fiat_amount: fiatAmount,
        profit_loss: formData.operation_type === 'Venta' ? fiatAmount : -fiatAmount
      };

      await saveOperation(user.uid, operationData);
      
      setSuccess('¡Operación guardada exitosamente!');
      
      // Reset form
      setFormData({
        exchange: '',
        operation_type: '',
        crypto: '',
        fiat: '',
        amount: '',
        exchange_rate: '',
        fee: '0'
      });

      // Notify parent component
      if (onOperationSaved) {
        onOperationSaved();
      }

    } catch (err) {
      console.error('Error saving operation:', err);
      setError('Error al guardar la operación. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const previewFiatAmount = calculateFiatAmount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">
            Nueva Operación 📊
          </h1>
          <p className="text-gray-300">
            Registra tus operaciones de trading y mantén un seguimiento detallado
          </p>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-yellow-400 flex items-center gap-2">
              💼 Detalles de la Operación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Alert Messages */}
              {error && (
                <Alert className="border-red-600 bg-red-900/20 text-red-400">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="border-green-600 bg-green-900/20 text-green-400">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Exchange */}
                <div className="space-y-2">
                  <Label htmlFor="exchange" className="text-white">
                    Exchange *
                  </Label>
                  <Select value={formData.exchange} onValueChange={(value) => handleInputChange('exchange', value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Selecciona exchange" />
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

                {/* Operation Type */}
                <div className="space-y-2">
                  <Label htmlFor="operation_type" className="text-white">
                    Tipo de Operación *
                  </Label>
                  <Select value={formData.operation_type} onValueChange={(value) => handleInputChange('operation_type', value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Selecciona tipo" />
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

                {/* Crypto */}
                <div className="space-y-2">
                  <Label htmlFor="crypto" className="text-white">
                    Criptomoneda *
                  </Label>
                  <Select value={formData.crypto} onValueChange={(value) => handleInputChange('crypto', value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Selecciona crypto" />
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
                    Moneda Fiat *
                  </Label>
                  <Select value={formData.fiat} onValueChange={(value) => handleInputChange('fiat', value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Selecciona fiat" />
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

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-white">
                    Cantidad *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.00000001"
                    placeholder="0.000"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>

                {/* Exchange Rate */}
                <div className="space-y-2">
                  <Label htmlFor="exchange_rate" className="text-white">
                    Tasa de Cambio *
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
                <div className="space-y-2 md:col-span-2">
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
              </div>

              {/* Preview */}
              {formData.amount && formData.exchange_rate && (
                <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                  <h3 className="text-yellow-400 font-medium mb-3">Vista Previa</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Cantidad {formData.crypto}:</span>
                      <span className="text-white ml-2">{formData.amount}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Tasa:</span>
                      <span className="text-white ml-2">{formData.exchange_rate}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Comisión:</span>
                      <span className="text-white ml-2">{formData.fee}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Monto {formData}:</span>
                      <Badge className="ml-2 bg-yellow-600">
                        {previewFiatAmount.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-medium py-3"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    Guardando...
                  </div>
                ) : (
                  '💾 Guardar Operación'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Operations;