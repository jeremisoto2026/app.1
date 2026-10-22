import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveOperation } from '../services/database';
import { calculateOperationAmounts } from '../utils/financialCalculations';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { PlusCircleIcon, DocumentTextIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const Operations = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    order_id: '',
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
  const cryptos = ['USDT', 'BTC', 'ETH', 'BNB', 'USDC'];
  const fiats = ['EUR', 'USD', 'USDT', 'USDC', 'VES', 'MXN', 'COP', 'ARS', 'BRL'];

  const handleInputChange = (field, value) => {
    setFormData((previous) => {
      const next = { ...previous, [field]: value };

      // Evita reutilizar cantidades o comisiones calculadas con otra operación/unidad.
      if (field === "operation_type" && value !== previous.operation_type) {
        next.crypto_amount = "";
        next.fiat_amount = "";
        next.exchange_rate = "";
        next.fee = "0";
      } else if (field === "crypto" && value !== previous.crypto) {
        next.crypto_amount = "";
        next.exchange_rate = "";
        if (previous.operation_type === "Compra") next.fee = "0";
      } else if (field === "fiat" && value !== previous.fiat) {
        next.fiat_amount = "";
        next.exchange_rate = "";
        if (previous.operation_type === "Venta") next.fee = "0";
      }

      return next;
    });
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('Inicia sesión para registrar una operación.');
      return;
    }

    const requiredFields = ['exchange', 'operation_type', 'crypto', 'fiat', 'exchange_rate'];
    const amountField = formData.operation_type === 'Venta' ? 'crypto_amount' : 'fiat_amount';
    const missingFields = requiredFields.filter(field => !formData[field]);

    if (!formData[amountField]) {
      missingFields.push(amountField);
    }
    
    if (missingFields.length > 0) {
      const fieldLabels = {
        exchange: "plataforma",
        operation_type: "tipo de operación",
        crypto: "criptomoneda",
        fiat: "moneda de cotización",
        exchange_rate: "tasa de cambio",
        crypto_amount: "cantidad en cripto",
        fiat_amount: "importe en moneda de cotización",
      };
      const missingLabels = [...new Set(missingFields)].map((field) => fieldLabels[field] || field);
      setError(`Completa estos campos obligatorios: ${missingLabels.join(", ")}.`);
      return;
    }

    let calculatedAmounts;
    try {
      calculatedAmounts = calculateOperationAmounts({
        operation_type: formData.operation_type,
        amount: formData[amountField],
        exchange_rate: formData.exchange_rate,
        fee: formData.fee,
        crypto: formData.crypto,
        fiat: formData.fiat,
      });
    } catch (calculationError) {
      setError(calculationError.message || 'Revisa la cantidad, la tasa y la comisión.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const operationData = {
        order_id: formData.order_id.trim(),
        exchange: formData.exchange,
        operation_type: formData.operation_type,
        crypto: formData.crypto,
        fiat: formData.fiat,
        ...calculatedAmounts,
        // La ganancia real solo se conoce al emparejar una venta con su coste de compra (FIFO).
        timestamp: new Date()
      };

      await saveOperation(user.uid, operationData);
      
      setSuccess('La operación se ha guardado correctamente.');
      
      setFormData({
        order_id: '',
        exchange: '',
        operation_type: '',
        crypto: '',
        fiat: '',
        crypto_amount: '',
        fiat_amount: '',
        exchange_rate: '',
        fee: '0'
      });

    } catch (err) {
      console.error('Error al guardar la operación:', err);
      setError('Error al guardar la operación. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  let previewAmountCrypto = null;
  let previewAmountFiat = null;
  const previewFee = formData.fee === '' ? 0 : Number(formData.fee);
  const previewFeeCurrency = formData.operation_type === 'Venta' ? formData.fiat : formData.crypto;

  try {
    if (formData.operation_type) {
      const previewInput = formData.operation_type === 'Venta' ? formData.crypto_amount : formData.fiat_amount;
      const preview = calculateOperationAmounts({
        operation_type: formData.operation_type,
        amount: previewInput,
        exchange_rate: formData.exchange_rate,
        fee: formData.fee,
        crypto: formData.crypto,
        fiat: formData.fiat,
      });
      previewAmountCrypto = preview.crypto_amount;
      previewAmountFiat = preview.fiat_amount;
    }
  } catch {
    // Un formulario incompleto no debe mostrar importes calculados que parecen válidos.
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-4">
            <PlusCircleIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Nueva operación
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Registra tus compras y ventas, y mantén un historial de importes y comisiones
          </p>
          <p className="text-xs text-gray-500 max-w-2xl mx-auto mt-3">
            Registro manual: no se conecta a Binance ni se envían órdenes mediante API. Elegir Binance como plataforma solo etiqueta la operación que introduces.
          </p>
        </div>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-purple-500/20 shadow-xl">
          <CardHeader className="border-b border-purple-500/10 pb-6">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <DocumentTextIcon className="h-5 w-5 text-purple-400" />
              </div>
              Detalles de la Operación
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert className="border-red-500/30 bg-red-900/20 text-red-400 rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="border-green-500/30 bg-green-900/20 text-green-400 rounded-xl">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="order_id" className="text-gray-300 font-medium">
                    Número de orden (opcional)
                  </Label>
                  <Input
                    id="order_id"
                    type="text"
                    autoComplete="off"
                    placeholder="ID de la orden"
                    value={formData.order_id}
                    onChange={(e) => handleInputChange('order_id', e.target.value)}
                    className="bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label id="exchange-label" htmlFor="exchange" className="text-gray-300 font-medium">
                    Plataforma <span className="text-red-400">*</span>
                  </Label>
                  <Select value={formData.exchange} onValueChange={(value) => handleInputChange('exchange', value)} disabled={loading}>
                    <SelectTrigger id="exchange" aria-labelledby="exchange-label" className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl">
                      <SelectValue placeholder="Selecciona plataforma" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-purple-500/30 text-white">
                      {exchanges.map(exchange => (
                        <SelectItem key={exchange} value={exchange} className="rounded-lg focus:bg-purple-500/10">
                          {exchange}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label id="operation_type-label" htmlFor="operation_type" className="text-gray-300 font-medium">
                    Tipo de operación <span className="text-red-400">*</span>
                  </Label>
                  <Select value={formData.operation_type} onValueChange={(value) => handleInputChange('operation_type', value)} disabled={loading}>
                    <SelectTrigger id="operation_type" aria-labelledby="operation_type-label" className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl">
                      <SelectValue placeholder="Selecciona tipo" />
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

                <div className="space-y-2">
                  <Label id="crypto-label" htmlFor="crypto" className="text-gray-300 font-medium">
                    Criptomoneda <span className="text-red-400">*</span>
                  </Label>
                  <Select value={formData.crypto} onValueChange={(value) => handleInputChange('crypto', value)} disabled={loading}>
                    <SelectTrigger id="crypto" aria-labelledby="crypto-label" className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl">
                      <SelectValue placeholder="Selecciona criptomoneda" />
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

                <div className="space-y-2">
                  <Label id="fiat-label" htmlFor="fiat" className="text-gray-300 font-medium">
                    Moneda fiat <span className="text-red-400">*</span>
                  </Label>
                  <Select value={formData.fiat} onValueChange={(value) => handleInputChange('fiat', value)} disabled={loading}>
                    <SelectTrigger id="fiat" aria-labelledby="fiat-label" className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl">
                      <SelectValue placeholder="Selecciona moneda de cotización" />
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

                <div className="space-y-2">
                  <Label htmlFor="crypto_amount" className="text-gray-300 font-medium">
                    Cantidad en cripto {formData.operation_type === 'Venta' && <span className="text-red-400">*</span>}
                  </Label>
                  <Input
                    id="crypto_amount"
                    type="number"
                    min="0"
                    step="0.00000001"
                    placeholder="0.00000000"
                    value={formData.crypto_amount}
                    onChange={(e) => handleInputChange('crypto_amount', e.target.value)}
                    className="bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl"
                    disabled={formData.operation_type === 'Compra' || loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fiat_amount" className="text-gray-300 font-medium">
                    Importe en moneda de cotización {formData.operation_type === 'Compra' && <span className="text-red-400">*</span>}
                  </Label>
                  <Input
                    id="fiat_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.fiat_amount}
                    onChange={(e) => handleInputChange('fiat_amount', e.target.value)}
                    className="bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl"
                    disabled={formData.operation_type === 'Venta' || loading}
                  />
                </div>

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
                    className="bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fee" className="text-gray-300 font-medium">
                    Comisión ({formData.operation_type === 'Venta' ? (formData.fiat || 'moneda de cotización') : (formData.crypto || 'cripto')})
                  </Label>
                  <p className="text-xs text-gray-500">
                    {formData.operation_type === 'Venta'
                      ? 'Introduce la comisión en la moneda de cotización; se resta del importe recibido.'
                      : formData.operation_type === 'Compra'
                        ? 'Introduce la comisión como cantidad cripto; se resta de la cripto recibida.'
                        : 'La comisión es un importe fijo, no un porcentaje. La unidad depende de si compras o vendes.'}
                  </p>
                  <Input
                    id="fee"
                    type="number"
                    min="0"
                    step={formData.operation_type === 'Compra' ? '0.00000001' : '0.01'}
                    placeholder="0.00"
                    value={formData.fee}
                    onChange={(e) => handleInputChange('fee', e.target.value)}
                    className="bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl"
                    disabled={loading}
                  />
                </div>
              </div>

              <Card className="bg-gray-800/50 rounded-xl p-5 border border-purple-500/20">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <CurrencyDollarIcon className="h-4 w-4 text-blue-400" />
                    </div>
                    Previsión de la operación
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Cantidad en cripto:</span>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      {Number.isFinite(previewAmountCrypto) ? previewAmountCrypto.toFixed(8) + ' ' + (formData.crypto || '') : '—'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Importe en moneda de cotización:</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {Number.isFinite(previewAmountFiat) ? previewAmountFiat.toFixed(2) + ' ' + (formData.fiat || '') : '—'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Comisión:</span>
                    <Badge className="bg-gray-700 text-gray-300 border-gray-600">
                      {Number.isFinite(previewFee) ? previewFee.toFixed(formData.operation_type === 'Venta' ? 2 : 8) : '0.00'} {previewFeeCurrency || 'unidad'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium h-12 rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/20"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <PlusCircleIcon className="h-5 w-5" />
                    Guardar operación
                  </div>
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