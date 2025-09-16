import React from "react";
import { Link } from "react-router-dom";
import { Operation } from "../../types";

interface OperationItemProps {
  operation: Operation;
  onDelete: (id: string) => void;
  index?: number;
  isMobile: boolean;
}

const OperationItem: React.FC<OperationItemProps> = ({ 
  operation, 
  onDelete, 
  index,
  isMobile 
}) => {
  if (isMobile) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-yellow-400">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
              operation.type === 'Venta' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
            }`}>
              {operation.type}
            </span>
            <span className="ml-2 text-yellow-400 font-semibold">{operation.exchange}</span>
          </div>
          <div className="text-right">
            <div className="text-white font-semibold">{operation.crypto}</div>
            <div className="text-gray-400 text-sm">{operation.amtC}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <div className="text-gray-400">Tasa:</div>
            <div className="text-white">{operation.rate}</div>
          </div>
          <div>
            <div className="text-gray-400">Comisión:</div>
            <div className="text-white">{operation.fee}</div>
          </div>
          <div>
            <div className="text-gray-400">Total Fiat:</div>
            <div className={`font-semibold ${operation.fiatAmt >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              €{operation.fiatAmt.toFixed(4)}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Fecha:</div>
            <div className="text-white text-xs">{operation.date}</div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Link 
            to={`/new?edit=${operation.id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors duration-200"
          >
            ✏️ Editar
          </Link>
          <button
            onClick={() => operation.id && onDelete(operation.id)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors duration-200"
          >
            🗑️ Eliminar
          </button>
        </div>
      </div>
    );
  }

  return (
    <tr className="border-b border-gray-700 hover:bg-gray-750">
      <td className="p-4 text-gray-300">{index}</td>
      <td className="p-4 text-yellow-400 font-semibold">{operation.exchange}</td>
      <td className="p-4">
        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
          operation.type === 'Venta' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {operation.type}
        </span>
      </td>
      <td className="p-4 text-white font-semibold">{operation.crypto}</td>
      <td className="p-4 text-white">{operation.amtC}</td>
      <td className="p-4 text-white">{operation.rate}</td>
      <td className="p-4 text-white">{operation.fee}</td>
      <td className="p-4">
        <span className={`font-semibold ${operation.fiatAmt >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          €{operation.fiatAmt.toFixed(4)}
        </span>
      </td>
      <td className="p-4 text-gray-400 text-sm">{operation.date}</td>
      <td className="p-4">
        <div className="flex space-x-2">
          <Link 
            to={`/new?edit=${operation.id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm transition-colors duration-200"
          >
            ✏️
          </Link>
          <button
            onClick={() => operation.id && onDelete(operation.id)}
            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm transition-colors duration-200"
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
};

export default OperationItem;