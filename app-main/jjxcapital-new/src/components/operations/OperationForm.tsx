import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useOperations } from "../../hooks/useOperations";
import { Operation } from "../../types";

const OperationForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const { user } = useAuth();
  const { operations, addOperation, updateOperation } = useOperations(user?.uid || '');

  const [formData, setFormData] = useState({
    exchange: 'Binance' as const,
    type: 'Venta' as const,
    crypto: 'USDT' as const,
    amtC: '',
    rate: '',
    fee: '0'
  });
  const [loading, setLoading] = useState(false);

  // Load operation data for editing
  useEffect(() => {
    if (editId && operations.length > 0) {
      const operation = operations.find(op => op.id === editId);
      if (operation) {
        setFormData({
          exchange: operation.exchange,
          type: operation.type,
          crypto: operation.crypto,
          amtC: operation.amtC.toString(),
          rate: operation.rate.toString(),
          fee: operation.fee.toString()
        });
      }
    }
  }, [editId, operations]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const calculateFiatAmount = (): number => {
    const amtC = parseFloat(formData.amtC) || 0;
    const rate = parseFloat(formData.rate) || 0;
    const fee = parseFloat(formData.fee) || 0;

    if (formData.type === 'Venta') {
      return (amtC * rate) - fee;
    } else {
      return (amtC * rate) * -1; // Compras como negativo
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    
    try {
      const operationData: Omit<Operation, 'id' | 'createdAt'> = {
        uid: user.uid,
        exchange: formData.exchange,
        type: formData.type,
        crypto: formData.crypto,
        amtC: parseFloat(formData.amtC),
        rate: parseFloat(formData.rate),
        fee: parseFloat(formData.fee),
        fiatAmt: calculateFiatAmount(),
        date: new Date().toLocaleString()
      };

      if (editId) {
        await updateOperation(editId, operationData);
      } else {
        await addOperation(operationData);
      }

      navigate('/operations');
    } catch (error) {
      console.error('Error saving operation:', error);
      alert('Error al guardar la operación');
    } finally {
      setLoading(false);
    }
  };

  const previewFiatAmount = calculateFiatAmount();

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-yellow-400">
            {editId ? '✏️ Editar Operación' : '➕ Nueva Operación'}
          </h2>
          <button
            onClick={() => navigate('/operations')}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Exchange:
            </label>
            <select
              name="exchange"
              value={formData.exchange}
              onChange={handleChange}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
            >
              <option value="Binance">Binance</option>
              <option value="Bybit">Bybit</option>
              <option value="OKX">OKX</option>
              <option value="KuCoin">KuCoin</option>
            </select>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Tipo de Operación:
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="Venta"
                  checked={formData.type === 'Venta'}
                  onChange={handleChange}
                  className="mr-2 accent-yellow-400"
                />
                <span className="text-white">Venta</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="Compra"
                  checked={formData.type === 'Compra'}
                  onChange={handleChange}
                  className="mr-2 accent-yellow-400"
                />
                <span className="text-white">Compra</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Criptomoneda:
            </label>
            <select
              name="crypto"
              value={formData.crypto}
              onChange={handleChange}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
            >
              <option value="USDT">USDT</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="BNB">BNB</option>
            </select>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Monto ({formData.crypto}):
            </label>
            <input
              type="number"
              name="amtC"
              value={formData.amtC}
              onChange={handleChange}
              step="0.0001"
              required
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
              placeholder="Cantidad de criptomoneda"
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Tasa de Cambio:
            </label>
            <input
              type="number"
              name="rate"
              value={formData.rate}
              onChange={handleChange}
              step="0.0001"
              required
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
              placeholder="Precio por unidad"
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Comisión:
            </label>
            <input
              type="number"
              name="fee"
              value={formData.fee}
              onChange={handleChange}
              step="0.0001"
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
              placeholder="Comisión pagada"
            />
          </div>

          {/* Preview */}
          {formData.amtC && formData.rate && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-yellow-400 font-semibold mb-2">Vista Previa:</h4>
              <p className="text-white">
                <strong>Resultado Fiat:</strong> {previewFiatAmount.toFixed(4)} EUR
              </p>
              <p className="text-gray-300 text-sm">
                {formData.type === 'Venta' 
                  ? `(${formData.amtC} × ${formData.rate}) - ${formData.fee} = ${previewFiatAmount.toFixed(4)}`
                  : `(${formData.amtC} × ${formData.rate}) × -1 = ${previewFiatAmount.toFixed(4)}`
                }
              </p>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate('/operations')}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : (editId ? 'Actualizar' : 'Guardar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OperationForm;