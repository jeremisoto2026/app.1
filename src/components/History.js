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
import { db } from "../firebase"; // asegúrate de que la ruta es correcta
import { Loader2 } from "lucide-react";

const History = () => {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    crypto: "",
    fiat: "",
    exchange: "",
    search: "",
  });

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

  const getProfitabilityBadgeColor = (profit) => {
    if (profit > 0) return "bg-green-900/20 text-green-400 border border-green-600";
    if (profit < 0) return "bg-red-900/20 text-red-400 border border-red-600";
    return "bg-gray-900/20 text-gray-400 border border-gray-600";
  };

  const getProfitabilityColor = (profit) => {
    if (profit > 0) return "text-green-400";
    if (profit < 0) return "text-red-400";
    return "text-gray-400";
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

      {/* Historial */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredOperations.length > 0 ? (
            filteredOperations.map((operation, index) => (
              <Card
                key={operation.id || index}
                className="bg-gray-900 border border-gray-700"
              >
                <CardHeader>
                  <CardTitle className="flex justify-between">
                    <span>Orden #{operation.order_id || "N/A"}</span>
                    <Badge className={getProfitabilityBadgeColor(operation.profit)}>
                      {operation.profit?.toFixed(2) ?? "0.00"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-300">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <strong>Cripto:</strong> {operation.crypto || "N/A"}
                    </div>
                    <div>
                      <strong>Fiat:</strong> {operation.fiat || "N/A"}
                    </div>
                    <div>
                      <strong>Exchange:</strong> {operation.exchange || "N/A"}
                    </div>
                    <div>
                      <strong>Fecha:</strong>{" "}
                      {operation.timestamp ? formatDate(operation.timestamp) : "N/A"}
                    </div>
                  </div>

                  {/* Detalles de rentabilidad */}
                  <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                    <div>
                      <span className="text-gray-400">ROI:</span>
                      <span
                        className={`ml-2 font-medium ${getProfitabilityColor(
                          operation.profit
                        )}`}
                      >
                        {operation.profit_percentage?.toFixed(2) ?? "0.00"}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Diferencia:</span>
                      <span
                        className={`ml-2 font-medium ${getProfitabilityColor(
                          operation.profit
                        )}`}
                      >
                        {(operation.revenue - operation.investment)?.toFixed(2) ??
                          "0.00"}
                      </span>
                    </div>
                  </div>

                  {/* Monto fiat */}
                  <div className="text-sm mt-2">
                    <span className="text-gray-400">Monto Fiat:</span>
                    <span className="text-white ml-2 font-medium">
                      {formatCurrency(
                        operation.fiat_amount || 0,
                        operation.fiat && operation.fiat.length === 3
                          ? operation.fiat
                          : "USD"
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-gray-400">No hay operaciones registradas</p>
          )}
        </div>
      )}
    </div>
  );
};

export default History;