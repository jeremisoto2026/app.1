import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { saveOperation } from '../services/database';
import { calculateOperationAmounts, calculateArbitrageSessionBalances } from '../utils/financialCalculations';
import { formatCryptoAmount, formatFiatAmount } from '../utils/numberFormatting';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { PlusCircleIcon, DocumentTextIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const Operations = ({ initialSessionId = '', onOpenArbitrages }) => {
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
  const [sessions, setSessions] = useState([]);
  const [sessionOperations, setSessionOperations] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadSessions = async () => {
      if (!user?.uid) {
        setSessions([]);
        setSessionOperations([]);
        setSelectedSessionId('');
        setSessionsLoading(false);
        return;
      }
      setSessionsLoading(true);
      try {
        const [snapshot, operationsSnapshot] = await Promise.all([
          getDocs(collection(db, 'users', user.uid, 'sessions')),
          getDocs(collection(db, 'users', user.uid, 'operations')),
        ]);
        const records = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        const operationRecords = operationsSnapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        const active = records.filter(item => item.status === 'active');
        if (!cancelled) {
          setSessions(records);
          setSessionOperations(operationRecords);
          const next = active.find(item => item.id === initialSessionId) || active[0];
          setSelectedSessionId(next?.id || '');
        }
      } catch (loadError) {
        console.error('Error al cargar los arbitrajes para Operaciones:', loadError);
        if (!cancelled) setError('No se pudieron cargar tus arbitrajes. Comprueba las reglas de Firestore.');
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    };
    loadSessions();
    return () => { cancelled = true; };
  }, [user?.uid, initialSessionId]);

  const activeSessions = sessions.filter(item => item.status === 'active');
  const selectedSession = activeSessions.find(item => item.id === selectedSessionId);
  const selectedSessionOperations = selectedSession
    ? sessionOperations.filter(item => item.sessionId === selectedSession.id)
    : [];
  const sessionBalances = selectedSession
    ? calculateArbitrageSessionBalances(selectedSession, selectedSessionOperations)
    : { fiatBalance: 0, cryptoBalance: 0, nextOperationType: 'Compra', operationCount: 0 };
  const selectedSessionOperationCount = selectedSessionOperations.length;
  const isFirstSessionOperation = Boolean(selectedSession) && selectedSessionOperationCount === 0;
  const operationType = selectedSession ? sessionBalances.nextOperationType : 'Compra';
  const currentOperationAmount = Number(operationType === 'Venta' ? formData.crypto_amount : formData.fiat_amount);

  useEffect(() => {
    if (!selectedSession) return;
    setFormData(previous => ({
      ...previous,
      crypto: selectedSession.crypto || 'USDT',
      fiat: selectedSession.fiat || 'EUR',
      operation_type: selectedSession.initialCapitalType === 'crypto' ? 'Venta' : 'Compra',
      crypto_amount: '',
      fiat_amount: '',
      exchange_rate: '',
      fee: '0',
    }));
    setError('');
    setSuccess('');
  }, [selectedSession?.id, selectedSession?.crypto, selectedSession?.fiat, selectedSession?.initialCapitalType]);

  const exchanges = ['Binance', 'Bybit', 'OKX', 'KuCoin'];
    // Deben coincidir con las monedas permitidas al crear una sesión de arbitraje.
  const cryptos = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'DAI'];
  const fiats = ['EUR', 'USD', 'VES', 'COP', 'ARS', 'MXN', 'BRL', 'PEN', 'CLP', 'GBP'];

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

    if (!selectedSession || selectedSession.status !== 'active') {
      setError('Selecciona un arbitraje activo antes de registrar una compra o venta.');
      return;
    }

    if (!Number.isFinite(currentOperationAmount) || currentOperationAmount <= 0) {
      setError(operationType === 'Venta'
        ? 'Introduce una cantidad de criptomoneda mayor que cero para vender.'
        : 'Introduce un importe fiat mayor que cero para comprar.');
      return;
    }

    const requiredFields = ['exchange', 'exchange_rate'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
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
        operation_type: operationType,
        amount: currentOperationAmount,
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
        operation_type: operationType,
        crypto: formData.crypto,
        fiat: formData.fiat,
        sessionId: selectedSession.id,
        amount: currentOperationAmount,
        sessionName: selectedSession.name,
        arbitrageType: selectedSession.strategy || 'Comercio P2P',
        ...calculatedAmounts,
        // La ganancia real solo se conoce al emparejar una venta con su coste de compra (FIFO).
        timestamp: new Date()
      };

      const savedOperation = await saveOperation(user.uid, operationData);
      setSessionOperations(previous => [...previous, {
        ...operationData,
        ...(savedOperation || {}),
        id: savedOperation?.id || ('local-' + Date.now()),
      }]);
      
      setSuccess('La operación se ha guardado correctamente.');
      
      setFormData({
        order_id: '',
        exchange: '',
        // Facilita continuar el ciclo: tras comprar, sugerir vender y viceversa.
        operation_type: operationType === 'Compra' ? 'Venta' : 'Compra',
        crypto: selectedSession.crypto || 'USDT',
        fiat: selectedSession.fiat || 'EUR',
        crypto_amount: '',
        fiat_amount: '',
        exchange_rate: '',
        fee: '0'
      });

    } catch (err) {
      console.error('Error al guardar la operación:', err);
      setError(err?.message || 'Error al guardar la operación. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  let previewAmountCrypto = null;
  let previewAmountFiat = null;
  const previewFee = formData.fee === '' ? 0 : Number(formData.fee);
  const previewFeeCurrency = operationType === 'Venta' ? (selectedSession?.fiat || formData.fiat) : (selectedSession?.crypto || formData.crypto);
  try {
    if (selectedSession && Number(formData.exchange_rate) > 0 && Number.isFinite(currentOperationAmount) && currentOperationAmount > 0) {
      const preview = calculateOperationAmounts({
        operation_type: operationType,
        amount: currentOperationAmount,
        exchange_rate: formData.exchange_rate,
        fee: formData.fee,
        crypto: selectedSession.crypto || 'USDT',
        fiat: selectedSession.fiat || 'EUR',
      });
      previewAmountCrypto = preview.crypto_amount;
      previewAmountFiat = preview.fiat_amount;
    }
  } catch {
    // A partial form must never look like a valid financial calculation.
  }

  if (sessionsLoading) {
    return <div className="min-h-screen bg-gray-950 p-10 text-center text-gray-300" role="status">Cargando arbitrajes…</div>;
  }

  if (!activeSessions.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black p-4 pt-24 md:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-purple-500/20 bg-gray-900 p-8 text-center">
          <h1 className="text-3xl font-bold text-white">Operaciones</h1>
          <p className="mx-auto mt-3 max-w-xl text-gray-400">Primero crea un arbitraje. Las compras y ventas se guardarán dentro de ese espacio y no se mezclarán con otros pares de monedas.</p>
          {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
          <button type="button" onClick={onOpenArbitrages} className="mt-6 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 font-medium text-white">Crear mi primer arbitraje</button>
        </div>
      </div>
    );
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

        <div className="mb-6 rounded-2xl border border-purple-500/20 bg-gray-900/80 p-4">
          <label htmlFor="active-arbitrage" className="mb-2 block text-sm font-medium text-gray-300">Arbitraje al que pertenece esta operación</label>
          <select id="active-arbitrage" value={selectedSessionId} onChange={event => setSelectedSessionId(event.target.value)} className="h-11 w-full rounded-xl border border-purple-500/30 bg-gray-800 px-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400">
            {activeSessions.map(item => <option key={item.id} value={item.id}>{item.name} · {item.fiat || 'EUR'} / {item.crypto || 'USDT'}</option>)}
          </select>
          <p className="mt-2 text-xs text-gray-500">Esta compra o venta solo afectará a las cuentas, el saldo y el beneficio del arbitraje seleccionado.</p>
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

              {selectedSession && (
                <div className="rounded-xl border border-purple-500/20 bg-purple-950/30 px-4 py-3 text-sm text-gray-300">
                  {selectedSession.initialCapitalType === 'crypto'
                    ? <>Este arbitraje comienza por el lado cripto: la primera operación es una venta. Introduce solo la cantidad de {selectedSession.crypto} que realmente quieras vender; después podrás comprar la cantidad que decidas.</>
                    : <>Este arbitraje comienza por el lado fiat: la primera operación es una compra. Introduce solo el importe de {selectedSession.fiat} que realmente quieras invertir; después podrás vender la cantidad de cripto que decidas.</>}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{Number(selectedSession?.initialCapital) > 0 ? "Saldo fiat estimado (sesión anterior)" : "Flujo neto fiat registrado"}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{formatFiatAmount(sessionBalances.fiatBalance)} {selectedSession?.fiat || 'EUR'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{Number(selectedSession?.initialCapital) > 0 ? "Saldo cripto estimado (sesión anterior)" : "Variación neta cripto registrada"}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{formatCryptoAmount(sessionBalances.cryptoBalance)} {selectedSession?.crypto || 'USDT'}</p>
                </div>
                <p className="text-xs leading-5 text-gray-500 sm:col-span-2">Los importes aquí reflejan los movimientos registrados, no el saldo real de tu exchange. En cada operación introduces manualmente la cantidad que vas a mover.</p>
              </div>

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
                  <Label id="operation_type-label" className="text-gray-300 font-medium">Tipo de operación</Label>
                  <div id="operation_type" aria-readonly="true" className="flex h-11 items-center justify-between rounded-xl border border-purple-500/30 bg-gray-800 px-3">
                    <Badge className={operationType === 'Compra' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-violet-500/30 bg-violet-500/10 text-violet-300'}>
                      {operationType.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500">{isFirstSessionOperation ? 'Fijada por el capital inicial' : 'Siguiente paso del ciclo'}</span>
                  </div>
                  <p className="text-xs leading-5 text-gray-500">El tipo se determina automáticamente según el capital inicial y los movimientos ya registrados.</p>
                </div>

                <div className="space-y-2">
                  <Label id="crypto-label" htmlFor="crypto" className="text-gray-300 font-medium">
                    Criptomoneda <span className="text-red-400">*</span>
                  </Label>
                  <Select value={formData.crypto} onValueChange={(value) => handleInputChange('crypto', value)} disabled={loading || Boolean(selectedSession)}>
                    <SelectTrigger id="crypto" aria-labelledby="crypto-label" className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl">
                      <SelectValue placeholder="Selecciona criptomoneda" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-purple-500/30 text-white">
                      {[...new Set([...cryptos, selectedSession?.crypto].filter(Boolean))].map(crypto => (
                        <SelectItem key={crypto} value={crypto} className="rounded-lg focus:bg-purple-500/10">
                          {crypto}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label id="fiat-label" htmlFor="fiat" className="text-gray-300 font-medium">
                    Moneda de cotización <span className="text-red-400">*</span>
                  </Label>
                  <Select value={formData.fiat} onValueChange={(value) => handleInputChange('fiat', value)} disabled={loading || Boolean(selectedSession)}>
                    <SelectTrigger id="fiat" aria-labelledby="fiat-label" className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl">
                      <SelectValue placeholder="Selecciona moneda de cotización" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-purple-500/30 text-white">
                      {[...new Set([...fiats, selectedSession?.fiat].filter(Boolean))].map(fiat => (
                        <SelectItem key={fiat} value={fiat} className="rounded-lg focus:bg-purple-500/10">
                          {fiat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crypto_amount" className="text-gray-300 font-medium">{operationType === 'Venta' ? "Cantidad de cripto a vender" : "Cripto recibida (calculada)"}</Label>
                  <Input
                    id="crypto_amount"
                    type={operationType === 'Venta' ? "number" : "text"}
                    min={operationType === 'Venta' ? "0" : undefined}
                    step="any"
                    placeholder={operationType === 'Venta' ? "Ej. 30" : "Se calcula con el importe fiat y la tasa"}
                    value={operationType === 'Venta' ? formData.crypto_amount : (Number.isFinite(previewAmountCrypto) ? String(previewAmountCrypto) : '')}
                    onChange={e => handleInputChange('crypto_amount', e.target.value)}
                    readOnly={operationType !== 'Venta'}
                    required={operationType === 'Venta'}
                    className="bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl read-only:text-gray-200"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">{operationType === 'Venta' ? "Tú decides cuánto vender; la cantidad no tiene que coincidir con compras anteriores." : "Se calcula automáticamente a partir del importe fiat que indiques."}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fiat_amount" className="text-gray-300 font-medium">{operationType === 'Compra' ? "Importe fiat a invertir" : "Importe fiat recibido (calculado)"}</Label>
                  <Input
                    id="fiat_amount"
                    type={operationType === 'Compra' ? "number" : "text"}
                    min={operationType === 'Compra' ? "0" : undefined}
                    step="any"
                    placeholder={operationType === 'Compra' ? "Ej. 50" : "Se calcula con la cantidad vendida y la tasa"}
                    value={operationType === 'Compra' ? formData.fiat_amount : (Number.isFinite(previewAmountFiat) ? String(previewAmountFiat) : '')}
                    onChange={e => handleInputChange('fiat_amount', e.target.value)}
                    readOnly={operationType !== 'Compra'}
                    required={operationType === 'Compra'}
                    className="bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl read-only:text-gray-200"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">{operationType === 'Compra' ? "Tú decides cuánto fiat invertir en esta compra." : "Se calcula automáticamente a partir de la cantidad cripto que indiques."}</p>
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
                    Comisión ({operationType === 'Venta' ? (formData.fiat || 'moneda de cotización') : (formData.crypto || 'cripto')})
                  </Label>
                  <p className="text-xs text-gray-500">
                    {operationType === 'Venta'
                      ? 'Introduce la comisión en la moneda de cotización; se resta del importe recibido.'
                      : operationType === 'Compra'
                        ? 'Introduce la comisión como cantidad cripto; se resta de la cripto recibida.'
                        : 'La comisión es un importe fijo, no un porcentaje. La unidad depende de si compras o vendes.'}
                  </p>
                  <Input
                    id="fee"
                    type="number"
                    min="0"
                    step={operationType === 'Compra' ? '0.00000001' : '0.01'}
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
                      {Number.isFinite(previewAmountCrypto) ? formatCryptoAmount(previewAmountCrypto) + ' ' + (formData.crypto || '') : '—'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Importe en moneda de cotización:</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {Number.isFinite(previewAmountFiat) ? formatFiatAmount(previewAmountFiat) + ' ' + (formData.fiat || '') : '—'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Comisión:</span>
                    <Badge className="bg-gray-700 text-gray-300 border-gray-600">
                      {Number.isFinite(previewFee) ? (operationType === 'Venta' ? formatFiatAmount(previewFee) : formatCryptoAmount(previewFee)) : (operationType === 'Venta' ? formatFiatAmount(0) : formatCryptoAmount(0))} {previewFeeCurrency || 'unidad'}
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