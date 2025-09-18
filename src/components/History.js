import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { db } from "../firebase";
import { Loader2 } from "lucide-react";
import { format } from 'date-fns';

const History = () => {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    crypto: "",
    fiat: "",
    exchange: "",
    search: "",
  });

  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const exportToCSV = (data) => {
    if (data.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const headers = [
      "ID_Operacion", "Tipo_Operacion", "Exchange", "Crypto", "Cantidad_Crypto", 
      "Fiat", "Cantidad_Fiat", "Tasa_Cambio", "Comision", "Fecha"
    ];

    const rows = data.map(op => [
      op.order_id || 'N/A',
      op.operation_type || 'N/A',
      op.exchange || 'N/A',
      op.crypto || 'N/A',
      op.crypto_amount || 0,
      op.fiat || 'N/A',
      op.fiat_amount || 0,
      op.exchange_rate || 0,
      op.fee || 0,
      formatDateForCSV(op.timestamp)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `historial-operaciones-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExport = () => {
    let dataToExport = [...operations];
    
    if (exportStartDate && exportEndDate) {
      const start = new Date(exportStartDate);
      const end = new Date(exportEndDate);
      
      dataToExport = dataToExport.filter(op => {
        const opDate = op.timestamp?.toDate ? op.timestamp.toDate() : (op.timestamp ? new Date(op.timestamp.seconds * 1000) : null);
        if (!opDate) return false;
        return opDate >= start && opDate <= end;
      });
    }

    exportToCSV(dataToExport);
  };
  
  const formatDateForCSV = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      let date;
      if (timestamp.toDate) {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp.seconds * 1000);
      }
      if (isNaN(date)) return 'N/A';
      return format(date, 'yyyy-MM-dd HH:mm:ss');
    } catch (e) {
      console.error("Error formateando fecha para CSV:", e, timestamp);
      return "N/A";
    }
  };

  useEffect(() => {
    const fetchOperations = async () => {
      try {
        const q = query(collection(db, "operations"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOperations(data);
      } catch (error) {
        console.error("Error fetching operations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOperations();
  }, []);

  const formatCurrency = (value, currency = "USD") => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(value);
    } catch (error) {
      return `${value} ${currency}`;
    }
  };

  const formatDate = (timestamp) => {
    try {
      if (!timestamp) return "N/A";
      return new Date(timestamp.seconds * 1000).toLocaleString();
    } catch {
      return "Invalid date";
    }
  };

  const getUniqueValues = (field) => {
    return [...new Set(operations.map((op) => op[field]).filter(Boolean))];
  };

  const filteredOperations = operations.filter((op) => {
    let filtered = true;

    if (filters.crypto && op.crypto !== filters.crypto) filtered = false;
    if (filters.fiat && op.fiat !== filters.fiat) filtered = false;
    if (filters.exchange && op.exchange !== filters.exchange) filtered = false;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered =
        op.order_id?.toLowerCase().includes(searchLower) ||
        op.crypto?.toLowerCase().includes(searchLower) ||
        op.fiat?.toLowerCase().includes(searchLower) ||
        op.exchange?.toLowerCase().includes(searchLower);
    }

    return filtered;
  });

  const buyOperations = filteredOperations.filter(op => op.operation_type === 'Compra');
  const sellOperations = filteredOperations.filter(op => op.operation_type === 'Venta');

  const renderOperations = (ops) => {
    if (ops.length === 0) {
      return <p className="text-center text-gray-400">No hay operaciones de {ops[0]?.operation_type || 'este tipo'} registradas.</p>;
    }
    
    return ops.map((operation, index) => (
      <Card
        key={operation.id || index}
        className="bg-gray-900 border border-gray-700"
      >
        <CardHeader>
          <CardTitle className="flex justify-between">
            <span>Orden #{operation.order_id || "N/A"}</span>
            <Badge className={operation.operation_type === 'Compra' ? "bg-green-900/20 text-green-400 border border-green-600" : "bg-red-900/20 text-red-400 border border-red-600"}>
              {operation.operation_type || "N/A"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-300">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <strong>Cripto:</strong> {operation.crypto || "N/A"}
              <Badge variant="outline" className="ml-2 text-gray-400 border-gray-600">
                {operation.crypto_amount?.toFixed(6) ?? "0.000000"}
              </Badge>
            </div>
            <div>
              <strong>Fiat:</strong> {operation.fiat || "N/A"}
              <Badge variant="outline" className="ml-2 text-gray-400 border-gray-600">
                {formatCurrency(operation.fiat_amount, operation.fiat)}
              </Badge>
            </div>
            <div>
              <strong>Exchange:</strong> {operation.exchange || "N/A"}
            </div>
            <div>
              <strong>Fecha:</strong>{" "}
              {operation.timestamp ? formatDate(operation.timestamp) : "N/A"}
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select onValueChange={(value) => setFilters({ ...filters, crypto: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por Cripto" />
            </SelectTrigger>
            <SelectContent>
              {getUniqueValues("crypto").map((crypto) => (
                <SelectItem key={crypto} value={crypto}>
                  {crypto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={(value) => setFilters({ ...filters, fiat: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por Fiat" />
            </SelectTrigger>
            <SelectContent>
              {getUniqueValues("fiat").map((fiat) => (
                <SelectItem key={fiat} value={fiat}>
                  {fiat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={(value) => setFilters({ ...filters, exchange: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por Exchange" />
            </SelectTrigger>
            <SelectContent>
              {getUniqueValues("exchange").map((exchange) => (
                <SelectItem key={exchange} value={exchange}>
                  {exchange}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Buscar..."
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
      </Card>

      {/* Apartado de exportación */}
      <Card className="bg-gray-800 border-gray-700 p-4">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-yellow-400 flex items-center gap-2">
            📂 Exportar Historial
          </CardTitle>
        </CardHeader>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full md:w-auto">
            <Label className="block text-gray-400 text-sm mb-1">Fecha de inicio</Label>
            <Input
              type="date"
              value={exportStartDate}
              onChange={(e) => setExportStartDate(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>
          <div className="flex-1 w-full md:w-auto">
            <Label className="block text-gray-400 text-sm mb-1">Fecha de fin</Label>
            <Input
              type="date"
              value={exportEndDate}
              onChange={(e) => setExportEndDate(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>
          <Button
            onClick={handleExport}
            className="mt-6 md:mt-auto bg-green-600 hover:bg-green-700 text-white"
          >
            Exportar CSV
          </Button>
        </div>
      </Card>

      {/* Historial */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sección de Compras */}
          <h2 className="text-2xl font-bold text-green-400 mt-8">
            Compras 🟢
          </h2>
          <div className="grid gap-4">
            {renderOperations(buyOperations)}
          </div>

          <div className="w-full h-px bg-gray-700 my-8"></div>

          {/* Sección de Ventas */}
          <h2 className="text-2xl font-bold text-red-400">
            Ventas 🔴
          </h2>
          <div className="grid gap-4">
            {renderOperations(sellOperations)}
          </div>
        </div>
      )}
    </div>
  );
};

export default History;