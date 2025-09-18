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

const safeToNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const getProfitabilityColor = (profit) => {
  if (profit > 0) return "text-green-400";
  if (profit < 0) return "text-red-400";
  return "text-gray-400";
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

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "operations"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setOperations(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Error al cargar historial:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "operations", id));
    } catch (err) {
      console.error("Error eliminando operación:", err);
    }
  };

  const formatDate = (timestamp) => {
    try {
      if (!timestamp) return "N/A";
      if (timestamp.toDate) return timestamp.toDate().toLocaleString();
      if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleString();
      return new Date(timestamp).toLocaleString();
    } catch {
      return "N/A";
    }
  };

  const formatCurrency = (value, currency = "USD") => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(safeToNumber(value));
    } catch {
      return safeToNumber(value).toFixed(2);
    }
  };

  const getUniqueValues = (field) => {
    return [...new Set(operations.map((op) => op[field]).filter(Boolean))];
  };

  const filteredOperations = operations.filter((op) => {
    let matches = true;

    if (filters.crypto && op.crypto !== filters.crypto) matches = false;
    if (filters.fiat && op.fiat !== filters.fiat) matches = false;
    if (filters.exchange && op.exchange !== filters.exchange) matches = false;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const fields = [
        op.order_id,
        op.crypto,
        op.fiat,
        op.exchange,
      ].map((v) => (v ? String(v).toLowerCase() : ""));
      if (!fields.some((f) => f.includes(searchLower))) matches = false;
    }

    return matches;
  });

  const renderOperations = (ops) => {
    if (!ops || ops.length === 0) {
      return <p className="text-center text-gray-400">No hay operaciones.</p>;
    }

    return ops.map((op) => {
      const revenue = safeToNumber(op.revenue);
      const investment = safeToNumber(op.investment);
      const profit = revenue - investment;
      const roi = investment > 0 ? (profit / investment) * 100 : 0;

      return (
        <Card key={op.id} className="bg-gray-900 border border-gray-700">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span className="text-yellow-400">Orden #{op.order_id || "N/A"}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(op.id)}
                className="hover:bg-red-900/20 text-red-400"
              >
                <Trash2 size={16} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-300 space-y-2">
            <div><strong>Cripto:</strong> {op.crypto || "N/A"}</div>
            <div><strong>Fiat:</strong> {op.fiat || "N/A"}</div>
            <div><strong>Exchange:</strong> {op.exchange || "N/A"}</div>
            <div><strong>Fecha:</strong> {formatDate(op.timestamp)}</div>
            <div>
              <span className="text-gray-400">ROI:</span>
              <span className={`ml-2 font-medium ${getProfitabilityColor(roi)}`}>
                {roi.toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-gray-400">Diferencia:</span>
              <span className={`ml-2 font-medium ${getProfitabilityColor(profit)}`}>
                {profit.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      );
    });
  };

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl font-bold mb-4">Historial</h2>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Select
          value={filters.crypto}
          onValueChange={(v) => setFilters({ ...filters, crypto: v })}
        >
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="Cripto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {getUniqueValues("crypto").map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.fiat}
          onValueChange={(v) => setFilters({ ...filters, fiat: v })}
        >
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="Fiat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {getUniqueValues("fiat").map((f) => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.exchange}
          onValueChange={(v) => setFilters({ ...filters, exchange: v })}
        >
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="Exchange" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {getUniqueValues("exchange").map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Buscar..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="bg-gray-700 border-gray-600 text-white"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">{renderOperations(filteredOperations)}</div>
      )}
    </div>
  );
};

export default History;