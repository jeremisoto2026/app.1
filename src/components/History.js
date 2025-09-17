import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

// Función para dar color según ganancia
const getProfitabilityColor = (profit) => {
  if (profit > 0) return "text-green-400";
  if (profit < 0) return "text-red-400";
  return "text-gray-400";
};

// Formatear fecha
const formatDate = (timestamp) => {
  if (!timestamp) return "N/A";
  try {
    let date;
    if (typeof timestamp.toDate === "function") {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    console.error("Error al formatear fecha:", e, timestamp);
    return "N/A";
  }
};

// Formatear moneda
const formatCurrency = (value, currency = "USD") => {
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(value || 0);
  } catch (e) {
    console.error("Error al formatear moneda:", e, value, currency);
    return `${value || 0} ${currency || ""}`;
  }
};

const History = () => {
  const [operations, setOperations] = useState([]);
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    try {
      const q = query(collection(db, "operations"), orderBy("timestamp", "desc"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const ops = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setOperations(ops || []);
        },
        (error) => {
          console.error("Error cargando operaciones:", error);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.error("Error en useEffect History:", err);
    }
  }, []);

  // Ordenar operaciones
  const sortedOperations = [...operations].sort((a, b) => {
    let aValue = a?.[sortBy];
    let bValue = b?.[sortBy];

    if (sortBy === "timestamp") {
      aValue = aValue?.toDate ? aValue.toDate() : aValue ? new Date(aValue) : 0;
      bValue = bValue?.toDate ? bValue.toDate() : bValue ? new Date(bValue) : 0;
    }

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Historial de Operaciones</h2>

      {sortedOperations.length === 0 ? (
        <p className="text-gray-400">No hay operaciones registradas.</p>
      ) : (
        sortedOperations.map((operation, index) => {
          const profit =
            (operation?.revenue || 0) - (operation?.investment || 0);
          const roi =
            operation?.investment > 0
              ? (profit / operation.investment) * 100
              : 0;

          return (
            <Card key={operation?.id || index}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    {operation?.crypto_amount || 0}{" "}
                    {operation?.crypto || "N/A"}
                  </h3>
                  <Badge
                    className={`text-lg ${getProfitabilityColor(profit)}`}
                  >
                    {profit.toFixed(2)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">Exchange:</span>
                    <span className="ml-2">{operation?.exchange || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Tasa:</span>
                    <span className="ml-2">{operation?.exchange_rate || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Fecha:</span>
                    <span className="ml-2">
                      {formatDate(operation?.timestamp)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Monto Fiat:</span>
                    <span className="ml-2">
                      {formatCurrency(
                        operation?.fiat_amount,
                        operation?.fiat
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Inversión:</span>
                    <span className="ml-2">
                      {formatCurrency(
                        operation?.investment,
                        operation?.fiat
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Ingresos:</span>
                    <span className="ml-2">
                      {formatCurrency(operation?.revenue, operation?.fiat)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Fee:</span>
                    <span className="ml-2">
                      {formatCurrency(operation?.fee, operation?.fiat)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">ROI:</span>
                    <span
                      className={`ml-2 font-medium ${getProfitabilityColor(
                        profit
                      )}`}
                    >
                      {roi.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default History;