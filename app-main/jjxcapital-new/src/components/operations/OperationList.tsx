import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useOperations } from "../../hooks/useOperations";
import OperationItem from "./OperationItem";
import { Operation } from "../../types";

const OperationList: React.FC = () => {
  const { user } = useAuth();
  const { operations, loading, deleteOperation } = useOperations(user?.uid || '');
  
  const [filter, setFilter] = useState({
    exchange: 'all',
    type: 'all',
    crypto: 'all'
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter({
      ...filter,
      [e.target.name]: e.target.value
    });
  };

  const filteredOperations = operations.filter((op: Operation) => {
    return (
      (filter.exchange === 'all' || op.exchange === filter.exchange) &&
      (filter.type === 'all' || op.type === filter.type) &&
      (filter.crypto === 'all' || op.crypto === filter.crypto)
    );
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta operación?')) {
      try {
        await deleteOperation(id);
      } catch (error) {
        alert('Error al eliminar la operación');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-yellow-400 text-xl">Cargando operaciones...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-yellow-400">📝 Historial de Operaciones</h1>
        <Link 
          to="/new" 
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
        >
          ➕ Nueva Operación
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">🔍 Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Exchange:</label>
            <select
              name="exchange"
              value={filter.exchange}
              onChange={handleFilterChange}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="Binance">Binance</option>
              <option value="Bybit">Bybit</option>
              <option value="OKX">OKX</option>
              <option value="KuCoin">KuCoin</option>
            </select>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Tipo:</label>
            <select
              name="type"
              value={filter.type}
              onChange={handleFilterChange}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="Venta">Venta</option>
              <option value="Compra">Compra</option>
            </select>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Cripto:</label>
            <select
              name="crypto"
              value={filter.crypto}
              onChange={handleFilterChange}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
            >
              <option value="all">Todas</option>
              <option value="USDT">USDT</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="BNB">BNB</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resumen */}
      {filteredOperations.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center text-white">
            <span>Mostrando {filteredOperations.length} operaciones</span>
            <span className="text-yellow-400">
              Total: €{filteredOperations.reduce((sum, op) => sum + op.fiatAmt, 0).toFixed(4)}
            </span>
          </div>
        </div>
      )}

      {/* Lista de operaciones */}
      {filteredOperations.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-gray-400 text-lg mb-2">No hay operaciones registradas</div>
          <div className="text-sm text-gray-500 mb-6">
            {operations.length === 0 
              ? "Registra tu primera operación para ver el historial"
              : "Ajusta los filtros para ver más resultados"
            }
          </div>
          <Link 
            to="/new" 
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
          >
            ➕ Crear Primera Operación
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Vista móvil */}
          <div className="md:hidden space-y-4">
            {filteredOperations.map((operation) => (
              <OperationItem 
                key={operation.id} 
                operation={operation} 
                onDelete={handleDelete}
                isMobile={true}
              />
            ))}
          </div>

          {/* Vista desktop */}
          <div className="hidden md:block bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="text-left p-4 text-white font-semibold">#</th>
                  <th className="text-left p-4 text-white font-semibold">Exchange</th>
                  <th className="text-left p-4 text-white font-semibold">Tipo</th>
                  <th className="text-left p-4 text-white font-semibold">Cripto</th>
                  <th className="text-left p-4 text-white font-semibold">Monto</th>
                  <th className="text-left p-4 text-white font-semibold">Tasa</th>
                  <th className="text-left p-4 text-white font-semibold">Comisión</th>
                  <th className="text-left p-4 text-white font-semibold">Total Fiat</th>
                  <th className="text-left p-4 text-white font-semibold">Fecha</th>
                  <th className="text-left p-4 text-white font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOperations.map((operation, index) => (
                  <OperationItem 
                    key={operation.id} 
                    operation={operation} 
                    onDelete={handleDelete}
                    index={index + 1}
                    isMobile={false}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationList;