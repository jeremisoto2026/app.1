// src/components/History.js
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
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
import { Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Label } from "./ui/label";
import { useAuth } from "../contexts/AuthContext";

const getProfitabilityColor = (profit) => {
  if (profit > 0) return "text-green-400";
  if (profit < 0) return "text-red-400";
  return "text-gray-400";
};

const getProfitabilityBadgeClass = (profit) => {
  if (profit > 0) return "bg-green-900/20 text-green-400 border border-green-600";
  if (profit < 0) return "bg-red-900/20 text-red-400 border border-red-600";
  return "bg-gray-900/20 text-gray-400 border border-gray-600";
};

const safeToNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const History = () => {
  const { user } = useAuth();
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    crypto: "",
    fiat: "",
    exchange: "",
    search: "",
  });

  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");

  // LISTENER en tiempo real a /users/{uid}/operations
  useEffect(() => {
    if (!user) {
      setOperations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "users", user.uid, "operations"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setOperations(data);
        setLoading(false);
      },
      (err) => {
        console.error("onSnapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id) => {
    if (!user) return alert("Usuario no autenticado");
    if (
      window.confirm(
        "¿Estás seguro de que quieres eliminar esta operación? Esta acción no se puede deshacer."
      )
    ) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "operations", id));
        // onSnapshot actualizará automáticamente la lista. El setOperations es opcional.
        setOperations((prev) => prev.filter((op) => op.id !== id));
      } catch (error) {
        console.error("Error removing operation: ", error);
        alert("Error al eliminar la operación. Por favor, inténtalo de nuevo.");
      }
    }
  };

  // -----------------------
  // Export CSV
  // -----------------------
  const formatDateForCSV = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      let date;
      if (timestamp?.toDate) date = timestamp.toDate();
      else if (timestamp instanceof Date) date = timestamp;
      else if (timestamp?.seconds) date = new Date(timestamp.seconds * 1000);
      else date = new Date(timestamp);
      if (isNaN(date)) return "N/A";
      return format(date, "yyyy-MM-dd HH:mm:ss");
    } catch (e) {
      console.error("Error formateando fecha para CSV:", e, timestamp);
      return "N/A";
    }
  };

  const exportToCSV = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const headers = [
      "ID_Operacion",
      "Tipo_Operacion",
      "Exchange",
      "Crypto",
      "Cantidad_Crypto",
      "Fiat",
      "Cantidad_Fiat",
      "Tasa_Cambio",
      "Comision",
      "Fecha",
    ];

    const buyOperations = data.filter((op) => op.operation_type === "Compra");
    const sellOperations = data.filter((op) => op.operation_type === "Venta");
    const sortedData = [...buyOperations, ...sellOperations];

    const rows = sortedData.map((op) => {
      const formattedCryptoAmount =
        op.crypto_amount || op.crypto_amount === 0
          ? safeToNumber(op.crypto_amount).toFixed(6)
          : "0.000000";

      return [
        op.order_id || "N/A",
        op.operation_type || "N/A",
        op.exchange || "N/A",
        op.crypto || "N/A",
        formattedCryptoAmount,
        op.fiat || "N/A",
        op.fiat_amount || 0,
        op.exchange_rate || 0,
        op.fee || 0,
        formatDateForCSV(op.timestamp),
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `historial-operaciones-${format(new Date(), "yyyy-MM-dd")}.csv`
      );
      link.style.visibility = "hidden";
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
      // include whole day for end
      end.setHours(23, 59, 59, 999);

      dataToExport = dataToExport.filter((op) => {
        const ts = op.timestamp;
        let opDate = null;
        if (!ts) return false;
        if (ts?.toDate) opDate = ts.toDate();
        else if (ts?.seconds) opDate = new Date(ts.seconds * 1000);
        else opDate = new Date(ts);
        if (!opDate || isNaN(opDate)) return false;
        return opDate >= start && opDate <= end;
      });
    }

    exportToCSV(dataToExport);
  };

  // -----------------------
  // Format helpers
  // -----------------------
  const formatCurrency = (value, currency = "USD") => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(safeToNumber(value));
    } catch {
      return `${safeToNumber(value).toFixed(2)} ${currency || ""}`;
    }
  };

  const formatDate = (timestamp) => {
    try {
      if (!timestamp) return "N/A";
      if (timestamp?.toDate) return timestamp.toDate().toLocaleString();
      if (timestamp?.seconds) return new Date(timestamp.seconds * 1000).toLocaleString();
      if (timestamp instanceof Date) return timestamp.toLocaleString();
      return new Date(timestamp).toLocaleString();
    } catch {
      return "Invalid date";
    }
  };

  const getUniqueValues = (field) => {
    return [...new Set(operations.map((op) => op[field]).filter(Boolean))];
  };

  // -----------------------
  // Filtering & searching (combina búsqueda con filtros)
  // -----------------------
  const filteredOperations = operations.filter((op) => {
    let matches = true;

    if (filters.crypto && op.crypto !== filters.crypto) matches = false;
    if (filters.fiat && op.fiat !== filters.fiat) matches = false;
    if (filters.exchange && op.exchange !== filters.exchange) matches = false;

    if (filters.search) {
      const searchLower = String(filters.search).toLowerCase();
      const matchesSearch =
        String(op.order_id || "").toLowerCase().includes(searchLower) ||
        String(op.crypto || "").toLowerCase().includes(searchLower) ||
        String(op.fiat || "").toLowerCase().includes(searchLower) ||
        String(op.exchange || "").toLowerCase().includes(searchLower);
      if (!matchesSearch) matches = false;
    }

    return matches;
  });

  const buyOperations = filteredOperations.filter((op) => op.operation_type === "Compra");
  const sellOperations = filteredOperations.filter((op) => op.operation_type === "Venta");

  const renderOperations = (ops) => {
    if (!ops || ops.length === 0) {
      return <p className="text-center text-gray-400">No hay operaciones registradas.</p>;
    }

    return ops.map((operation, index) => {
      // calculos seguros
      const revenue = safeToNumber(operation.revenue);
      const investment = safeToNumber(operation.investment);
      const profit = safeToNumber(operation.profit) || (revenue - investment);
      const profitPercentage =
        safeToNumber(operation.profit_percentage) ||
        (investment > 0 ? (profit / investment) * 100 : 0);
      const diferencia = revenue - investment;

      return (
        <Card key={operation.id || index} className="bg-gray-900 border border-gray-700">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <div className="flex-1">
                <span className="text-yellow-400">Orden #{operation.order_id || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={operation.operation_type === "Compra" ? "bg-green-900/20 text-green-400 border border-green-600" : "bg-red-900/20 text-red-400 border border-red-600"}>
                  {operation.operation_type || "N/A"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(operation.id)}
                  className="hover:bg-red-900/20 text-red-400"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2 text-sm text-gray-300">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <strong>Cripto:</strong> {operation.crypto || "N/A"}
                <Badge variant="outline" className="ml-2 text-gray-400 border-gray-600">
                  {operation.crypto_amount ? safeToNumber(operation.crypto_amount).toFixed(6) : "0.000000"}
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

              <div className="md:col-span-1">
                <strong>Tasa de cambio:</strong>
                <Badge variant="outline" className="ml-2 text-gray-400 border-gray-600">
                  {operation.exchange_rate ? safeToNumber(operation.exchange_rate).toFixed(2) : "0.00"}
                </Badge>
              </div>

              <div className="md:col-span-2">
                <strong>Fecha:</strong> {operation.timestamp ? formatDate(operation.timestamp) : "N/A"}
              </div>
            </div>

            {/* Rentabilidad */}
            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <span className="text-gray-400">ROI:</span>
                <span className={`ml-2 font-medium ${getProfitabilityColor(profit)}`}>
                  {profitPercentage ? profitPercentage.toFixed(2) : "0.00"}%
                </span>
              </div>
              <div>
                <span className="text-gray-400">Diferencia:</span>
                <span className={`ml-2 font-medium ${getProfitabilityColor(diferencia)}`}>
                  {diferencia ? diferencia.toFixed(2) : "0.00"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">Historial de Operaciones 📋</h1>
          <p className="text-gray-300">Revisa y gestiona tus transacciones de compra y venta.</p>
        </div>

        {/* Filtros */}
        <Card className="p-4 bg-gray-800 border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={filters.crypto} onValueChange={(value) => setFilters({ ...filters, crypto: value })}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filtrar por Cripto" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="">Todas</SelectItem>
                {getUniqueValues("crypto").map((crypto) => (
                  <SelectItem key={crypto} value={crypto}>{crypto}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.fiat} onValueChange={(value) => setFilters({ ...filters, fiat: value })}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filtrar por Fiat" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="">Todas</SelectItem>
                {getUniqueValues("fiat").map((fiat) => (
                  <SelectItem key={fiat} value={fiat}>{fiat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.exchange} onValueChange={(value) => setFilters({ ...filters, exchange: value })}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filtrar por Exchange" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="">Todos</SelectItem>
                {getUniqueValues("exchange").map((exchange) => (
                  <SelectItem key={exchange} value={exchange}>{exchange}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Buscar por ID, cripto, fiat o exchange..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>
        </Card>

        {/* Export */}
        <Card className="bg-gray-800 border-gray-700 p-4">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-yellow-400 flex items-center gap-2">📂 Exportar Historial</CardTitle>
          </CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full md:w-auto">
              <Label className="block text-gray-400 text-sm mb-1">Fecha de inicio</Label>
              <Input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} className="bg-gray-700 border-gray-600 text-white placeholder-gray-400" />
            </div>
            <div className="flex-1 w-full md:w-auto">
              <Label className="block text-gray-400 text-sm mb-1">Fecha de fin</Label>
              <Input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} className="bg-gray-700 border-gray-600 text-white placeholder-gray-400" />
            </div>
            <Button onClick={handleExport} className="mt-6 md:mt-auto bg-green-600 hover:bg-green-700 text-white">Exportar CSV</Button>
          </div>
        </Card>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-green-400 mt-8">Compras 🟢</h2>
            <div className="grid gap-4">{renderOperations(buyOperations)}</div>

            <div className="w-full h-px bg-gray-700 my-8"></div>

            <h2 className="text-2xl font-bold text-red-400">Ventas 🔴</h2>
            <div className="grid gap-4">{renderOperations(sellOperations)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;