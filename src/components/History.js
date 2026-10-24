import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, deleteDoc, doc, updateDoc, increment } from "firebase/firestore";
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
import { calculateDashboardMetrics, calculateOperationAmounts, getOperationDate } from "../utils/financialCalculations";
import { buildExcelXml, downloadExcelXml } from "../utils/spreadsheet";
import { filterOperations } from "../utils/operationFilters";
import { 
  TrashIcon, 
  PencilSquareIcon,
  DocumentArrowDownIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  CalendarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";
import { format } from 'date-fns';
import { Label } from "./ui/label";
import { useAuth } from "../contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const PAGE_SIZE = 10;

const History = () => {
  const { user } = useAuth();
  const [operations, setOperations] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionFilter, setSessionFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [filters, setFilters] = useState({
    crypto: "",
    fiat: "",
    exchange: "",
    search: "",
  });

  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [buyPage, setBuyPage] = useState(1);
  const [sellPage, setSellPage] = useState(1);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [operationToDelete, setOperationToDelete] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [operationToEdit, setOperationToEdit] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [editData, setEditData] = useState({
    order_id: "", exchange: "", operation_type: "", crypto: "", fiat: "",
    amount: "", exchange_rate: "", fee: "0",
  });

  // Calcular cada venta con el historial completo, no solo con el filtro visual,
  // porque una compra anterior puede ser el coste de adquisición de una venta.
  const financialMetrics = useMemo(
    () => calculateDashboardMetrics(operations),
    [operations]
  );
  const realizedProfitByOperation = financialMetrics.realizedProfitByOperation || {};
  const sessionResults = useMemo(() => sessions.map(session => {
    const sessionOperations = operations.filter(operation => operation.sessionId === session.id);
    const initialCapital = Number(session.initialCapital) || 0;
    const isCryptoBase = session.initialCapitalType === "crypto";
    const profit = isCryptoBase
      ? sessionOperations.reduce((sum, operation) => sum + (operation.operation_type === "Compra" ? 1 : operation.operation_type === "Venta" ? -1 : 0) * (Number(operation.crypto_amount) || 0), 0)
      : (calculateDashboardMetrics(sessionOperations).profitByCurrency?.[session.fiat] || 0);
    return {
      ...session,
      profit,
      roi: initialCapital > 0 ? profit / initialCapital * 100 : 0,
      baseCurrency: session.initialCapitalCurrency || (isCryptoBase ? session.crypto : session.fiat) || (isCryptoBase ? "USDT" : "EUR"),
      isCryptoBase,
    };
  }), [sessions, operations]);

  // ---------- NUEVO: estados para diálogos personalizados ----------
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportDialogConfig, setExportDialogConfig] = useState({
    type: 'info', // 'info', 'warning', 'error'
    title: '',
    message: '',
    icon: null
  });

  useEffect(() => {
    let cancelled = false;

    const fetchOperations = async () => {
      if (!user) {
        setOperations([]);
        setSessions([]);
        setFetchError("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError("");

      try {
        // Incluye operaciones antiguas sin fecha y las ordena de forma fiable en cliente.
        const querySnapshot = await getDocs(collection(db, "users", user.uid, "operations"));
        const data = querySnapshot.docs.map((operationDoc) => ({
          id: operationDoc.id,
          ...operationDoc.data(),
        }));
        try {
          const sessionSnapshot = await getDocs(collection(db, "users", user.uid, "sessions"));
          if (!cancelled) setSessions(sessionSnapshot.docs.map(sessionDoc => ({ id: sessionDoc.id, ...sessionDoc.data() })));
        } catch (sessionError) {
          console.warn("No se pudieron cargar los nombres de arbitraje en el historial:", sessionError);
        }
        data.sort((a, b) => {
          const dateA = getOperationDate(a.timestamp)?.getTime() ?? Number.NEGATIVE_INFINITY;
          const dateB = getOperationDate(b.timestamp)?.getTime() ?? Number.NEGATIVE_INFINITY;
          return dateB - dateA;
        });

        if (!cancelled) setOperations(data);
      } catch (error) {
        if (!cancelled) {
          console.error("Error al cargar las operaciones:", error);
          setOperations([]);
          setFetchError("No se pudo cargar el historial. Comprueba la conexión e inténtalo de nuevo.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOperations();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  // ---------- NUEVA FUNCIÓN: Mostrar diálogo personalizado ----------
  const showExportDialog = (type, title, message) => {
    setExportDialogConfig({
      type,
      title,
      message,
      icon: type === 'warning' ? ExclamationTriangleIcon : InformationCircleIcon
    });
    setIsExportDialogOpen(true);
  };

  const openEditDialog = (operation) => {
    setOperationToEdit(operation);
    setEditData({
      order_id: operation.order_id || "",
      exchange: operation.exchange || "",
      operation_type: operation.operation_type || "",
      crypto: operation.crypto || "",
      fiat: operation.fiat || "",
      amount: operation.operation_type === "Venta"
        ? (operation.crypto_amount ?? "")
        : (operation.fiat_amount ?? ""),
      exchange_rate: operation.exchange_rate ?? "",
      fee: operation.fee ?? "0",
    });
    setEditError("");
    setIsEditDialogOpen(true);
  };

  const handleEditFieldChange = (field, value) => {
    setEditData((previous) => {
      const next = { ...previous, [field]: value };
      if (["operation_type", "crypto", "fiat"].includes(field) && value !== previous[field]) {
        // No reaprovechar importes que pertenecían a otra unidad o par de monedas.
        next.amount = "";
        next.exchange_rate = "";
        next.fee = "0";
      }
      return next;
    });
    setEditError("");
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!user || !operationToEdit?.id) return;

    try {
      setIsSavingEdit(true);
      setEditError("");
      if (!editData.exchange || !editData.operation_type || !editData.crypto || !editData.fiat) {
        throw new Error("Completa la plataforma, el tipo de operación y ambas monedas.");
      }
      const calculatedAmounts = calculateOperationAmounts({
        operation_type: editData.operation_type,
        amount: editData.amount,
        exchange_rate: editData.exchange_rate,
        fee: editData.fee,
        crypto: editData.crypto,
        fiat: editData.fiat,
      });
      const updates = {
        order_id: editData.order_id.trim(),
        exchange: editData.exchange,
        operation_type: editData.operation_type,
        crypto: editData.crypto,
        fiat: editData.fiat,
        ...calculatedAmounts,
      };

      await updateDoc(doc(db, "users", user.uid, "operations", operationToEdit.id), updates);
      setOperations((previous) => previous.map((operation) =>
        operation.id === operationToEdit.id ? { ...operation, ...updates } : operation
      ));
      setIsEditDialogOpen(false);
      setOperationToEdit(null);
      showExportDialog(
        "info",
        "Operación actualizada",
        "Los importes y la comisión se han guardado. El beneficio se vuelve a calcular usando el historial completo y la fecha original de la operación."
      );
    } catch (error) {
      setEditError(error.message || "No se pudo actualizar la operación. Inténtalo de nuevo.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const confirmDelete = (operationId) => {
    setOperationToDelete(operationId);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!operationToDelete) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "operations", operationToDelete));
      setOperations((previous) => previous.filter((op) => op.id !== operationToDelete));
      setIsDeleteDialogOpen(false);
      setOperationToDelete(null);
    } catch (error) {
      console.error("Error al eliminar la operación: ", error);
      showExportDialog('error', 'Error', 'Error al eliminar la operación. Por favor, inténtalo de nuevo.');
    }
  };

  const exportToExcel = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return false;
    }

    try {
      const headers = [
        "ID_Documento", "ID_Orden", "Tipo_Operacion", "Plataforma", "Criptomoneda", "Cantidad_Cripto",
        "Moneda_Cotizacion", "Importe_Cotizado", "Tasa_Cambio", "Comision", "Moneda_Comision",
        "Cantidad_Cripto_Emparejada", "Ingreso_Emparejado", "Coste_Emparejado",
        "Beneficio_Realizado", "Moneda_Beneficio", "Cobertura_Coste", "Fecha"
      ];

      // Exportar por orden cronológico ascendente para que el registro permita
      // reconstruir el coste de adquisición y revisar el cálculo FIFO.
      const sortedData = [...data].sort((a, b) => {
        const dateA = getOperationDate(a.timestamp)?.getTime() ?? Number.POSITIVE_INFINITY;
        const dateB = getOperationDate(b.timestamp)?.getTime() ?? Number.POSITIVE_INFINITY;
        return dateA - dateB;
      });

      const rows = sortedData.map(op => {
        const hasCryptoAmount = op.crypto_amount !== null && op.crypto_amount !== undefined && op.crypto_amount !== "";
        const cryptoAmount = Number(op.crypto_amount);
        const formattedCryptoAmount = hasCryptoAmount && Number.isFinite(cryptoAmount) ? cryptoAmount.toFixed(8) : "";
        const realization = op.operation_type === "Venta" ? realizedProfitByOperation[op.id] : null;
        const knownProfit = realization && realization.matchedQuantity > 0;
        const costCoverage = op.operation_type !== "Venta"
          ? "No aplica (compra)"
          : !realization
            ? "No calculable"
            : realization.fullyMatched
              ? "Completo"
              : knownProfit
                ? "Parcial"
                : "Sin coste conocido";

        return [
          op.id || "",
          op.order_id || "",
          op.operation_type || "",
          op.exchange || "",
          op.crypto || "",
          formattedCryptoAmount,
          op.fiat || "",
          op.fiat_amount === null || op.fiat_amount === undefined || op.fiat_amount === ""
            ? ""
            : Number.isFinite(Number(op.fiat_amount)) ? Number(op.fiat_amount).toFixed(2) : "",
          op.exchange_rate === null || op.exchange_rate === undefined || op.exchange_rate === ""
            ? ""
            : Number.isFinite(Number(op.exchange_rate)) ? String(op.exchange_rate) : "",
          op.fee === null || op.fee === undefined || op.fee === ""
            ? ""
            : Number.isFinite(Number(op.fee)) ? String(Number(op.fee)) : "",
          op.fee === null || op.fee === undefined || op.fee === ""
            ? ""
            : op.fee_currency || (op.operation_type === "Venta" ? op.fiat : op.crypto) || "",
          knownProfit ? realization.matchedQuantity.toFixed(8) : "",
          knownProfit ? realization.matchedProceeds.toFixed(2) : "",
          knownProfit ? realization.matchedCost.toFixed(2) : "",
          knownProfit ? realization.profit.toFixed(2) : "",
          knownProfit ? realization.currency : "",
          costCoverage,
          formatDateForCSV(op.timestamp),
        ];
      });

      // Las columnas textuales son seguras frente a fórmulas; las columnas
      // numéricas conservan sus valores, incluidos los beneficios negativos.
      const excelXml = buildExcelXml(headers, rows);
      downloadExcelXml(`historial-operaciones-${format(new Date(), 'yyyy-MM-dd')}.xls`, excelXml);
      return true;
    } catch (err) {
      console.error("Error al generar el Excel:", err);
      showExportDialog('error', 'Error', 'Ocurrió un error al generar el archivo de Excel.');
      return false;
    }
  };

  const handleExport = async () => {
    let dataToExport = [...filteredOperations];
    
    if (exportStartDate || exportEndDate) {
      const parseLocalDate = (value, endOfDay = false) => {
        if (!value) return null;
        const [year, month, day] = value.split("-").map(Number);
        if (![year, month, day].every(Number.isFinite)) return null;
        const date = new Date(year, month - 1, day);
        // No aceptar fechas normalizadas silenciosamente (p. ej., 31 de febrero).
        if (
          date.getFullYear() !== year ||
          date.getMonth() !== month - 1 ||
          date.getDate() !== day
        ) return null;
        if (endOfDay) date.setHours(23, 59, 59, 999);
        return Number.isFinite(date.getTime()) ? date : null;
      };
      const start = parseLocalDate(exportStartDate);
      const end = parseLocalDate(exportEndDate, true);

      if ((exportStartDate && !start) || (exportEndDate && !end) || (start && end && start > end)) {
        showExportDialog('warning', 'Rango de fechas no válido', 'Comprueba que la fecha de inicio no sea posterior a la fecha de fin.');
        return;
      }

      dataToExport = dataToExport.filter(op => {
        const opDate = getOperationDate(op.timestamp);
        if (!opDate) return false;
        if (start && opDate < start) return false;
        if (end && opDate > end) return false;
        return true;
      });
    }

    if (!dataToExport || dataToExport.length === 0) {
      showExportDialog(
        'warning', 
        'Sin datos para exportar', 
        'No hay operaciones que coincidan con los filtros y el rango de fechas seleccionados.'
      );
      return;
    }

    const exported = exportToExcel(dataToExport);

    if (!exported) {
      return;
    }

    if (user) {
      try {
        const userRef = doc(db, "users", user.uid);
        // Mantener sincronizados el contador actual y la ruta histórica para
        // que los perfiles antiguos no pierdan el límite ya consumido.
        await updateDoc(userRef, {
          exportsUsed: increment(1),
          "usage.exportaciones.usadas": increment(1),
        });
      } catch (error) {
        console.error("Error al actualizar el contador de exportaciones:", error);
      }
    }
  };
  
  const formatDateForCSV = (timestamp) => {
    const date = getOperationDate(timestamp);
    return date ? format(date, 'yyyy-MM-dd HH:mm:ss') : 'N/A';
  };

  const formatCurrency = (value, currency = "") => {
    if (value === null || value === undefined || value === "") return "—";
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "—";
    const formatted = new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    const currencyCode = String(currency || "").trim().toUpperCase();
    // Mostrar siempre el código evita confundir USD con USDT u otras monedas con símbolo $.
    return currencyCode ? formatted + " " + currencyCode : formatted + " (moneda no especificada)";
  };

  const formatDate = (timestamp) => {
    const date = getOperationDate(timestamp);
    return date ? date.toLocaleString() : "N/A";
  };

  const getUniqueValues = (field) => {
    return [...new Set(operations.map((op) => op[field]).filter(Boolean))];
  };

  const sessionScopedOperations = useMemo(() => {
    if (sessionFilter === "all") return operations;
    if (sessionFilter === "__legacy__") return operations.filter(operation => !operation.sessionId);
    return operations.filter(operation => operation.sessionId === sessionFilter);
  }, [operations, sessionFilter]);

  const filteredOperations = useMemo(
    () => filterOperations(sessionScopedOperations, filters),
    [sessionScopedOperations, filters]
  );

  const sortedOperations = useMemo(() => {
    const sorted = [...filteredOperations];
    sorted.sort((a, b) => {
      const dateA = getOperationDate(a.timestamp)?.getTime();
      const dateB = getOperationDate(b.timestamp)?.getTime();
      if (dateA === undefined && dateB === undefined) return 0;
      if (dateA === undefined) return 1;
      if (dateB === undefined) return -1;
      return sortOrder === "oldest" ? dateA - dateB : dateB - dateA;
    });
    return sorted;
  }, [filteredOperations, sortOrder]);

  useEffect(() => {
    setBuyPage(1);
    setSellPage(1);
  }, [filters, sortOrder, sessionFilter]);

  const buyOperations = sortedOperations.filter(op => op.operation_type === 'Compra');
  const sellOperations = sortedOperations.filter(op => op.operation_type === 'Venta');

  // Si se elimina la última operación de la página actual, no dejar la vista en una página vacía.
  useEffect(() => {
    const buyTotalPages = Math.max(1, Math.ceil(buyOperations.length / PAGE_SIZE));
    const sellTotalPages = Math.max(1, Math.ceil(sellOperations.length / PAGE_SIZE));
    setBuyPage((page) => Math.min(page, buyTotalPages));
    setSellPage((page) => Math.min(page, sellTotalPages));
  }, [buyOperations.length, sellOperations.length]);

  const hasActiveFilters = Boolean(
    filters.crypto || filters.fiat || filters.exchange || filters.search.trim() || sessionFilter !== "all"
  );

  const renderOperations = (ops, currentPage, setPage, operationLabel) => {
    if (ops.length === 0) {
      return (
        <div className="history-empty-state text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-2xl mb-4">
            <DocumentArrowDownIcon className="h-8 w-8 text-purple-400" />
          </div>
          <h3 className="text-xl text-gray-300 mb-2">
            {hasActiveFilters ? "No hay resultados para estos filtros" : `Todavía no hay ${operationLabel}`}
          </h3>
          <p className="text-gray-500">
            {hasActiveFilters
              ? "Prueba con otros criterios o limpia los filtros para volver a ver el historial."
              : "Las operaciones que registres aparecerán aquí."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              className="dashboard-text-action mt-4"
              onClick={() => { setFilters({ crypto: "", fiat: "", exchange: "", search: "" }); setSessionFilter("all"); }}
            >
              <ArrowPathIcon className="h-4 w-4" /> Limpiar filtros
            </button>
          )}
        </div>
      );
    }

    const totalPages = Math.max(1, Math.ceil(ops.length / PAGE_SIZE));
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const visibleOperations = ops.slice(startIndex, startIndex + PAGE_SIZE);

    return <>
      {visibleOperations.map((operation, index) => (
      <Card
        key={operation.id || index}
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-purple-500/20 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <CardHeader className="border-b border-purple-500/10 pb-4">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <span className="text-purple-400 font-semibold">Orden #{operation.order_id || "N/A"}</span>
                {operation.sessionName && <span className="mt-1 block text-xs text-gray-500">Arbitraje: {operation.sessionName}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={operation.operation_type === 'Compra' 
                ? "bg-green-500/20 text-green-400 border-green-500/30" 
                : "bg-red-500/20 text-red-400 border-red-500/30"}>
                {operation.operation_type || "N/A"}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => openEditDialog(operation)}
                aria-label={`Editar operación ${operation.order_id || operation.id}`}
                title="Editar operación"
                className="hover:bg-indigo-500/10 text-indigo-300 rounded-xl"
              >
                <PencilSquareIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => confirmDelete(operation.id)}
                aria-label={`Eliminar operación ${operation.order_id || operation.id}`}
                title="Eliminar operación"
                className="hover:bg-red-500/10 text-red-400 rounded-xl"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center">
              <span className="text-gray-400 w-28">Criptomoneda:</span>
              <Badge className="ml-2 bg-purple-500/10 text-purple-400 border-purple-500/30">
                {operation.crypto_amount === null || operation.crypto_amount === undefined || operation.crypto_amount === "" ? "—" : Number.isFinite(Number(operation.crypto_amount)) ? Number(operation.crypto_amount).toFixed(8) + " " + (operation.crypto || "") : "—"}
              </Badge>
            </div>
            <div className="flex items-center">
              <span className="text-gray-400 w-28">Importe de cotización:</span>
              <Badge className="ml-2 bg-blue-500/10 text-blue-400 border-blue-500/30">
                {formatCurrency(operation.fiat_amount, operation.fiat)}
              </Badge>
            </div>
            <div className="flex items-center">
              <span className="text-gray-400 w-20">Plataforma:</span>
              <span className="text-white ml-2">{operation.exchange || "N/A"}</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-400 w-28">Tasa de cambio:</span>
              <Badge className="ml-2 bg-gray-700 text-gray-300 border-gray-600">
                {operation.exchange_rate === null || operation.exchange_rate === undefined || operation.exchange_rate === "" ? "—" : Number.isFinite(Number(operation.exchange_rate)) ? Number(operation.exchange_rate).toFixed(2) : "—"}
              </Badge>
            </div>
            <div className="flex items-center">
              <span className="text-gray-400 w-20">Comisión:</span>
              <Badge className="ml-2 bg-gray-700 text-gray-300 border-gray-600">
                {operation.fee === null || operation.fee === undefined || operation.fee === "" ? "No registrada" : Number.isFinite(Number(operation.fee)) ? Number(operation.fee).toFixed((operation.fee_currency || (operation.operation_type === 'Venta' ? operation.fiat : operation.crypto)) === operation.crypto ? 8 : 2) + " " + (operation.fee_currency || (operation.operation_type === 'Venta' ? operation.fiat : operation.crypto) || "N/A") : "No válida"}
              </Badge>
            </div>
            <div className="md:col-span-2 flex items-center">
              <span className="text-gray-400 w-20">Fecha:</span>
              <span className="text-white ml-2">
                {operation.timestamp ? formatDate(operation.timestamp) : "N/A"}
              </span>
            </div>
          </div>
          {operation.operation_type === "Venta" && (
            <div className="rounded-xl border border-purple-500/20 bg-gray-950/50 p-3">
              {realizedProfitByOperation[operation.id] && realizedProfitByOperation[operation.id].matchedQuantity > 0 ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-gray-300">
                      {realizedProfitByOperation[operation.id].fullyMatched
                        ? "Beneficio realizado"
                        : "Beneficio de la parte emparejada"}
                    </span>
                    <span className={`font-semibold ${realizedProfitByOperation[operation.id].profit > 0 ? "text-green-400" : realizedProfitByOperation[operation.id].profit < 0 ? "text-red-400" : "text-white"}`}>
                      {formatCurrency(realizedProfitByOperation[operation.id].profit, realizedProfitByOperation[operation.id].currency)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-400">
                    <span>Ingreso emparejado: {formatCurrency(realizedProfitByOperation[operation.id].matchedProceeds, realizedProfitByOperation[operation.id].currency)}</span>
                    <span>Coste emparejado: {formatCurrency(realizedProfitByOperation[operation.id].matchedCost, realizedProfitByOperation[operation.id].currency)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Cantidad emparejada: {realizedProfitByOperation[operation.id].matchedQuantity.toFixed(8)} de {realizedProfitByOperation[operation.id].soldQuantity.toFixed(8)} {operation.crypto || "cripto"}.
                  </p>
                  {!realizedProfitByOperation[operation.id].fullyMatched && (
                    <p className="mt-1 text-xs text-amber-300">
                      El beneficio es parcial: falta coste de compra conocido para parte de la venta.
                    </p>
                  )}
                </>
              ) : realizedProfitByOperation[operation.id] ? (
                <p className="text-sm text-amber-300">
                  Beneficio no calculable: no hay una compra registrada que permita conocer el coste de esta venta.
                </p>
              ) : (
                <p className="text-sm text-amber-300">
                  Beneficio no calculable: faltan una fecha fiable o importes válidos para aplicar el cálculo FIFO.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      ))}
      {ops.length > PAGE_SIZE && (
        <div className="history-pagination-controls">
          <span>Mostrando {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, ops.length)} de {ops.length}</span>
          <div>
            <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((page) => Math.max(1, page - 1))} aria-label={`Página anterior de ${operationLabel}`}>
              <ChevronLeftIcon className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <span className="history-page-count">Página {currentPage} de {totalPages}</span>
            <Button type="button" variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((page) => Math.min(totalPages, page + 1))} aria-label={`Página siguiente de ${operationLabel}`}>
              Siguiente <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </>;
  };

  // ---------- NUEVO: Función para obtener estilos según el tipo de diálogo ----------
  const getDialogStyles = (type) => {
    const baseStyles = "sm:max-w-[425px] bg-gradient-to-br from-gray-900 to-gray-800 border rounded-2xl text-white";
    
    switch (type) {
      case 'warning':
        return `${baseStyles} border-yellow-500/30`;
      case 'error':
        return `${baseStyles} border-red-500/30`;
      default:
        return `${baseStyles} border-purple-500/30`;
    }
  };

  const getIconStyles = (type) => {
    switch (type) {
      case 'warning':
        return "text-yellow-400 bg-yellow-500/10";
      case 'error':
        return "text-red-400 bg-red-500/10";
      default:
        return "text-purple-400 bg-purple-500/10";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-4">
            <DocumentArrowDownIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Historial de operaciones
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Consulta y organiza tus operaciones de compra y venta en un solo lugar
          </p>
        </div>

        {sessionResults.length > 0 && (
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-purple-500/20 shadow-xl p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-xl font-bold text-white">Resultado por arbitraje</CardTitle>
              <p className="text-sm text-gray-400">El beneficio y el ROI se muestran en la moneda base con la que se inició cada ciclo.</p>
            </CardHeader>
            <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {sessionResults.map(session => (
                <div key={session.id} className="rounded-xl border border-purple-500/15 bg-gray-950/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{session.name}</p>
                      <p className="mt-1 text-xs text-gray-500">Capital inicial: {formatCurrency(session.initialCapital, session.baseCurrency)}</p>
                    </div>
                    <Badge className={session.status === "active" ? "bg-emerald-500/10 text-emerald-300" : "bg-gray-700 text-gray-300"}>{session.status === "active" ? "Activo" : "Cerrado"}</Badge>
                  </div>
                  <p className={`mt-3 text-xl font-bold ${session.profit > 0 ? "text-green-400" : session.profit < 0 ? "text-red-400" : "text-white"}`}>{formatCurrency(session.profit, session.baseCurrency)}</p>
                  <p className="mt-1 text-xs text-gray-400">Beneficio / pérdida · ROI {session.roi.toFixed(2)}%</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Filtros */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-purple-500/20 shadow-xl p-6">
          <CardHeader className="p-0 mb-6 border-b border-purple-500/10 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <FunnelIcon className="h-5 w-5 text-purple-400" />
                </div>
                Filtros y búsqueda
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFilters({ crypto: "", fiat: "", exchange: "", search: "" });
                  setSessionFilter("all");
                  setSortOrder("newest");
                  setBuyPage(1);
                  setSellPage(1);
                }}
                className="h-9 rounded-lg bg-transparent border-purple-500/20 text-gray-300 hover:text-white"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Limpiar filtros
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label id="history-session-label" htmlFor="history-session" className="text-gray-300 font-medium">Arbitraje</Label>
                <Select value={sessionFilter} onValueChange={setSessionFilter}>
                  <SelectTrigger id="history-session" aria-labelledby="history-session-label" className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl">
                    <SelectValue placeholder="Todos los arbitrajes" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-purple-500/30 text-white">
                    <SelectItem value="all">Todos los arbitrajes</SelectItem>
                    {sessions.map(session => <SelectItem key={session.id} value={session.id}>{session.name} ({session.fiat || "EUR"} / {session.crypto || "USDT"})</SelectItem>)}
                    <SelectItem value="__legacy__">Operaciones antiguas sin arbitraje</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label id="history-crypto-label" htmlFor="history-crypto" className="text-gray-300 font-medium">Criptomoneda</Label>
                <Select value={filters.crypto || "__all__"} onValueChange={(value) => setFilters((previous) => ({ ...previous, crypto: value === "__all__" ? "" : value }))}>
                  <SelectTrigger id="history-crypto" aria-labelledby="history-crypto-label" className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl">
                    <SelectValue placeholder="Todas las criptomonedas" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-purple-500/30 text-white">
                    <SelectItem value="__all__" className="rounded-lg focus:bg-purple-500/10">Todas las criptomonedas</SelectItem>
                    {getUniqueValues("crypto").map((crypto) => (
                      <SelectItem key={crypto} value={crypto} className="rounded-lg focus:bg-purple-500/10">
                        {crypto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label id="history-fiat-label" htmlFor="history-fiat" className="text-gray-300 font-medium">Moneda de cotización</Label>
                <Select value={filters.fiat || "__all__"} onValueChange={(value) => setFilters((previous) => ({ ...previous, fiat: value === "__all__" ? "" : value }))}>
                  <SelectTrigger id="history-fiat" aria-labelledby="history-fiat-label" className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl">
                    <SelectValue placeholder="Todas las monedas de cotización" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-purple-500/30 text-white">
                    <SelectItem value="__all__" className="rounded-lg focus:bg-purple-500/10">Todas las monedas de cotización</SelectItem>
                    {getUniqueValues("fiat").map((fiat) => (
                      <SelectItem key={fiat} value={fiat} className="rounded-lg focus:bg-purple-500/10">
                        {fiat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label id="history-exchange-label" htmlFor="history-exchange" className="text-gray-300 font-medium">Plataforma</Label>
                <Select value={filters.exchange || "__all__"} onValueChange={(value) => setFilters((previous) => ({ ...previous, exchange: value === "__all__" ? "" : value }))}>
                  <SelectTrigger id="history-exchange" aria-labelledby="history-exchange-label" className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl">
                    <SelectValue placeholder="Todas las plataformas" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-purple-500/30 text-white">
                    <SelectItem value="__all__" className="rounded-lg focus:bg-purple-500/10">Todas las plataformas</SelectItem>
                    {getUniqueValues("exchange").map((exchange) => (
                      <SelectItem key={exchange} value={exchange} className="rounded-lg focus:bg-purple-500/10">
                        {exchange}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label id="history-sort-label" htmlFor="history-sort" className="text-gray-300 font-medium">Ordenar por fecha</Label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger id="history-sort" aria-labelledby="history-sort-label" className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl">
                    <SelectValue placeholder="Elegir orden" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-purple-500/30 text-white">
                    <SelectItem value="newest">Más recientes primero</SelectItem>
                    <SelectItem value="oldest">Más antiguas primero</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="history-search" className="text-gray-300 font-medium">Búsqueda</Label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="history-search"
                    aria-label="Buscar operaciones"
                    placeholder="Buscar por orden, criptomoneda o plataforma..."
                    value={filters.search}
                    onChange={(e) => setFilters((previous) => ({ ...previous, search: e.target.value }))}
                    className="bg-gray-800 border-purple-500/30 text-white placeholder-gray-500 h-11 rounded-xl pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exportar */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-purple-500/20 shadow-xl p-6">
          <CardHeader className="p-0 mb-6 border-b border-purple-500/10 pb-4">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <DocumentArrowDownIcon className="h-5 w-5 text-blue-400" />
              </div>
              Exportar historial
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <div className="space-y-2">
                  <Label htmlFor="export-start-date" className="text-gray-300 font-medium">Fecha de inicio</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="export-start-date"
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="export-end-date" className="text-gray-300 font-medium">Fecha de fin</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="export-end-date"
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl pl-10"
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={handleExport}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white h-11 rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/20"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {fetchError && (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-900/20 p-4 text-red-200">
            {fetchError}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-2xl mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
              </div>
              <h3 className="text-xl text-gray-300 mb-2">Cargando operaciones</h3>
              <p className="text-gray-500">Estamos recuperando tu historial...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-green-400 mb-4 flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                Compras
                <span className="history-section-count" aria-label={`${buyOperations.length} compras`}>{buyOperations.length}</span>
              </h2>
              <div className="grid gap-4">
                {renderOperations(buyOperations, buyPage, setBuyPage, "compras registradas")}
              </div>
            </div>

            <div className="border-t border-purple-500/20 pt-8">
              <h2 className="text-2xl font-bold text-red-400 mb-4 flex items-center">
                <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                Ventas
                <span className="history-section-count" aria-label={`${sellOperations.length} ventas`}>{sellOperations.length}</span>
              </h2>
              <div className="grid gap-4">
                {renderOperations(sellOperations, sellPage, setSellPage, "ventas registradas")}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Edición de una operación. La fecha original se conserva para no alterar el orden FIFO. */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) setEditError("");
      }}>
        <DialogContent className="jjx-edit-dialog sm:max-w-[620px] bg-gradient-to-br from-gray-900 to-gray-800 border border-purple-500/20 rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Editar operación</DialogTitle>
            <DialogDescription className="text-gray-400">
              Cambiar importes o monedas puede modificar el beneficio FIFO. Se conservará la fecha original.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200">{editError}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-order-id">Número de orden</Label>
                <Input id="edit-order-id" value={editData.order_id} onChange={(event) => handleEditFieldChange("order_id", event.target.value)} autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label id="edit-exchange-label" htmlFor="edit-exchange">Plataforma *</Label>
                <Select value={editData.exchange} onValueChange={(value) => handleEditFieldChange("exchange", value)}>
                  <SelectTrigger id="edit-exchange" aria-labelledby="edit-exchange-label"><SelectValue placeholder="Seleccionar plataforma" /></SelectTrigger>
                  <SelectContent>
                    {[...new Set(["Binance", "Bybit", "OKX", "KuCoin", editData.exchange].filter(Boolean))].map((exchange) => <SelectItem key={exchange} value={exchange}>{exchange}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label id="edit-type-label" htmlFor="edit-type">Tipo de operación *</Label>
                <Select value={editData.operation_type} onValueChange={(value) => handleEditFieldChange("operation_type", value)}>
                  <SelectTrigger id="edit-type" aria-labelledby="edit-type-label"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Compra">Compra</SelectItem>
                    <SelectItem value="Venta">Venta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label id="edit-crypto-label" htmlFor="edit-crypto">Criptomoneda *</Label>
                <Select value={editData.crypto} onValueChange={(value) => handleEditFieldChange("crypto", value)}>
                  <SelectTrigger id="edit-crypto" aria-labelledby="edit-crypto-label"><SelectValue placeholder="Seleccionar cripto" /></SelectTrigger>
                  <SelectContent>
                    {[...new Set(["USDT", "BTC", "ETH", "BNB", "USDC", editData.crypto].filter(Boolean))].map((crypto) => <SelectItem key={crypto} value={crypto}>{crypto}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label id="edit-fiat-label" htmlFor="edit-fiat">Moneda de cotización *</Label>
                <Select value={editData.fiat} onValueChange={(value) => handleEditFieldChange("fiat", value)}>
                  <SelectTrigger id="edit-fiat" aria-labelledby="edit-fiat-label"><SelectValue placeholder="Seleccionar moneda" /></SelectTrigger>
                  <SelectContent>
                    {[...new Set(["EUR", "USD", "USDT", "USDC", "VES", "MXN", "COP", "ARS", "BRL", editData.fiat].filter(Boolean))].map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-amount">{editData.operation_type === "Venta" ? "Cantidad vendida en cripto *" : "Importe de compra *"}</Label>
                <Input id="edit-amount" type="number" min="0" step="any" value={editData.amount} onChange={(event) => handleEditFieldChange("amount", event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-rate">Tasa de cambio *</Label>
                <Input id="edit-rate" type="number" min="0" step="any" value={editData.exchange_rate} onChange={(event) => handleEditFieldChange("exchange_rate", event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fee">Comisión ({editData.operation_type === "Venta" ? editData.fiat || "moneda de cotización" : editData.crypto || "cripto"})</Label>
                <Input id="edit-fee" type="number" min="0" step="any" value={editData.fee} onChange={(event) => handleEditFieldChange("fee", event.target.value)} />
              </div>
            </div>
            <p className="text-xs text-gray-500">La comisión se introduce en la unidad indicada, no como porcentaje. La fecha histórica no se modifica.</p>
            <DialogFooter className="flex gap-3">
              <Button type="button" variant="outline" disabled={isSavingEdit} onClick={() => setIsEditDialogOpen(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" disabled={isSavingEdit} className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                {isSavingEdit ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gradient-to-br from-gray-900 to-gray-800 border border-purple-500/20 rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Confirmar eliminación</DialogTitle>
            <DialogDescription className="text-gray-400">
              ¿Estás seguro de que quieres eliminar esta operación? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="bg-gray-800 border-purple-500/30 text-gray-300 hover:bg-gray-700/50 flex-1 rounded-xl"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleDelete}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white flex-1 rounded-xl"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- NUEVO: Diálogo personalizado para exportaciones ---------- */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className={getDialogStyles(exportDialogConfig.type)}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-xl ${getIconStyles(exportDialogConfig.type)}`}>
                {exportDialogConfig.icon && (
                  <exportDialogConfig.icon className="h-6 w-6" />
                )}
              </div>
              <DialogTitle className={`text-xl font-bold ${
                exportDialogConfig.type === 'warning' ? 'text-yellow-400' : 
                exportDialogConfig.type === 'error' ? 'text-red-400' : 'text-purple-400'
              }`}>
                {exportDialogConfig.title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-gray-300 text-base">
              {exportDialogConfig.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button 
              onClick={() => setIsExportDialogOpen(false)}
              className={`w-full rounded-xl ${
                exportDialogConfig.type === 'warning' ? 
                  'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800' :
                exportDialogConfig.type === 'error' ? 
                  'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800' :
                  'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
              } text-white`}
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default History;