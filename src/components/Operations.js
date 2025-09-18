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
    crypto_amount: '',
    fiat_amount: '',
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
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('Debes iniciar sesión para crear operaciones');
      return;
    }

    const requiredFields = ['exchange', 'operation_type', 'crypto', 'fiat', 'exchange_rate'];
    const amountField = formData.operation_type === 'Venta' ? 'crypto_amount' : 'fiat_amount';
    const missingFields = requiredFields.filter(field => !formData[field]);

    if (!formData[amountField]) {
      missingFields.push(amountField);
    }
    
    if (missingFields.length > 0) {
      setError(`Por favor completa todos los campos requeridos: ${missingFields.join(', ')}`);
      return;
    }

    const exchangeRate = parseFloat(formData.exchange_rate);
    const fee = parseFloat(formData.fee) || 0;
    
    if (exchangeRate <= 0 || parseFloat(formData[amountField]) <= 0) {
      setError('Los montos y tasas de cambio deben ser mayores a 0');
      return;
    }

    let cryptoAmount = 0;
    let fiatAmount = 0;

    if (formData.operation_type === 'Venta') {
      cryptoAmount = parseFloat(formData.crypto_amount);
      fiatAmount = (cryptoAmount * exchangeRate) - fee;
    } else {
      fiatAmount = parseFloat(formData.fiat_amount);
      cryptoAmount = (fiatAmount / exchangeRate) - fee;
    }

    try {
      setLoading(true);
      setError('');

      const operationData = {
        exchange: formData.exchange,
        operation_type: formData.operation_type,
        crypto: formData.crypto,
        fiat: formData.fiat,
        crypto_amount: cryptoAmount,
        fiat_amount: fiatAmount,
        exchange_rate: exchangeRate,
        fee: fee,
        profit: 0,
        timestamp: new Date()
      };

      await saveOperation(user.uid, operationData);
      
      setSuccess('¡Operación guardada exitosamente!');
      
      setFormData({
        exchange: '',
        operation_type: '',
        crypto: '',
        fiat: '',
        crypto_amount: '',
        fiat_amount: '',
        exchange_rate: '',
        fee: '0'
      });

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

  let previewAmountCrypto = 0;
  let previewAmountFiat = 0;

  if (formData.operation_type === 'Venta') {
    previewAmountCrypto = parseFloat(formData.crypto_amount) || 0;
    previewAmountFiat = (previewAmountCrypto * parseFloat(formData.exchange_rate)) - (parseFloat(formData.fee) || 0);
  } else if (formData.operation_type === 'Compra') {
    previewAmountFiat = parseFloat(formData.fiat_amount) || 0;
    previewAmountCrypto = (previewAmountFiat / parseFloat(formData.exchange_rate)) - (parseFloat(formData.fee) || 0);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="space-y-2">
                  <Label htmlFor="crypto_amount" className="text-white">
                    Cantidad Cripto {formData.operation_type === 'Venta' ? '*' : ''}
                  </Label>
                  <Input
                    id="crypto_amount"
                    type="number"
                    step="0.00000001"
                    placeholder="0.000"
                    value={formData.crypto_amount}
                    onChange={(e) => handleInputChange('crypto_amount', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    disabled={formData.operation_type === 'Compra'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fiat_amount" className="text-white">
                    Cantidad Fiat {formData.operation_type === 'Compra' ? '*' : ''}
                  </Label>
                  <Input
                    id="fiat_amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.fiat_amount}
                    onChange={(e) => handleInputChange('fiat_amount', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    disabled={formData.operation_type === 'Venta'}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
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

              {/* Vista Previa */}
              {formData.exchange_rate && (formData.crypto_amount || formData.fiat_amount) && (
                <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                  <h3 className="text-yellow-400 font-medium mb-3">Vista Previa</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Cantidad {formData.crypto}:</span>
                      <span className="text-white ml-2">
                        {/* ✅ Ajuste para mostrar 3 decimales */}
                        {previewAmountCrypto.toFixed(3)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Cantidad {formData.fiat}:</span>
                      <span className="text-white ml-2">
                        {previewAmountFiat.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Tasa:</span>
                      <span className="text-white ml-2">{formData.exchange_rate}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Comisión:</span>
                      <Badge className="ml-2 bg-yellow-600">
                        {parseFloat(formData.fee).toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

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