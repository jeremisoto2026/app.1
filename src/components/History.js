import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, deleteDoc, doc, getDoc, updateDoc, increment } from "firebase/firestore";
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
import { TrashIcon, DocumentArrowDownIcon, MagnifyingGlassIcon, FunnelIcon, CalendarIcon } from "@heroicons/react/24/outline";
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

  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [operationToDelete, setOperationToDelete] = useState(null);

  // ---------- NUEVO: estados para control de exportaciones ----------
  const [userRole, setUserRole] = useState('free'); // puede venir como plan o role en Firestore
  const [exportsUsed, setExportsUsed] = useState(0);
  const EXPORT_LIMIT_FREE = 40; // límite para usuarios Free

  const fetchOperations = async () => {
    if (!user) {
      setOperations([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const q = query(collection(db, "users", user.uid, "operations"), orderBy("timestamp", "desc"));
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

  // ---------- NUEVO: obtener role/plan y exportsUsed del documento de usuario ----------
  const fetchUserDoc = async () => {
    if (!user) {
      setUserRole('free');
      setExportsUsed(0);
      return;
    }
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        // tu proyecto usa 'plan' en varios sitios; aceptamos 'role' o 'plan'
        setUserRole(data.role || data.plan || 'free');
        setExportsUsed(typeof data.exportsUsed === 'number' ? data.exportsUsed : (data.exportsUsed ? Number(data.exportsUsed) : 0));
      } else {
        setUserRole('free');
        setExportsUsed(0);
      }
    } catch (err) {
      console.error("Error fetching user doc:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOperations();
      fetchUserDoc(); // también traemos usuario
    } else {
      // si no hay user, reseteamos estados
      setOperations([]);
      setExportsUsed(0);
      setUserRole('free');
    }
  }, [user]);

  const confirmDelete = (operationId) => {
    setOperationToDelete(operationId);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!operationToDelete) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "operations", operationToDelete));
      setOperations(operations.filter((op) => op.id !== operationToDelete));
      setIsDeleteDialogOpen(false);
      setOperationToDelete(null);
    } catch (error) {
      console.error("Error removing operation: ", error);
      alert("Error al eliminar la operación. Por favor, inténtalo de nuevo.");
    }
  };

  /**
   * exportToCSV:
   * - genera y descarga el CSV
   * - devuelve true si la descarga fue iniciada (para que el caller actualice el contador)
   * - devuelve false si no hubo datos o hubo un error
   */
  const exportToCSV = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      alert("No hay datos para exportar.");
      return false;
    }

    try {
      const headers = [
        "ID_Operacion", "Tipo_Operacion", "Exchange", "Crypto", "Cantidad_Crypto", 
        "Fiat", "Cantidad_Fiat", "Tasa_Cambio", "Comision", "Fecha"
      ];

      const buyOperations = data.filter(op => op.operation_type === 'Compra');
      const sellOperations = data.filter(op => op.operation_type === 'Venta');
      const sortedData = [...buyOperations, ...sellOperations];

      const rows = sortedData.map(op => {
        const formattedCryptoAmount = op.crypto_amount ? parseFloat(op.crypto_amount).toFixed(3) : "0.000";

        return [
          op.order_id || 'N/A',
          op.operation_type || 'N/A',
          op.exchange || 'N/A',
          op.crypto || 'N/A',
          formattedCryptoAmount,
          op.fiat || 'N/A',
          op.fiat_amount || 0,
          op.exchange_rate || 0,
          op.fee || 0,
          formatDateForCSV(op.timestamp)
        ];
      });

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
        return true;
      } else {
        // navegador no soporta descarga por link
        alert("Tu navegador no permite descargar archivos desde esta página.");
        return false;
      }
    } catch (err) {
      console.error("Error generando CSV:", err);
      alert("Ocurrió un error al generar el CSV.");
      return false;
    }
  };

  // ---------- MODIFICADO: handleExport ahora filtra primero, verifica si hay datos y luego verifica el límite -->
  const handleExport = async () => {
    // 1) Preparamos datos y aplicamos filtro por fechas (si las hay)
    let dataToExport = [...operations];
    
    if (exportStartDate && exportEndDate) {
      const start = new Date(exportStartDate);
      const end = new Date(exportEndDate);
      
      dataToExport = dataToExport.filter(op => {
        const opDate = op.timestamp?.toDate ? op.timestamp.toDate() : (op.timestamp ? new Date(op.timestamp.seconds * 1000) : null);
        if (!opDate) return false;
        // consideramos inclusive
        return opDate >= start && opDate <= end;
      });
    }

    // 2) Si no hay datos en el rango => no exportar, no incrementar contador
    if (!dataToExport || dataToExport.length === 0) {
      alert("No hay datos disponibles en el rango seleccionado para exportar.");
      return;
    }

    // 3) Verificar límite según plan (solo si ya sabemos que hay datos)
    if (userRole && String(userRole).toLowerCase() === 'free' && exportsUsed >= EXPORT_LIMIT_FREE) {
      alert(`Has alcanzado el límite de exportaciones (${EXPORT_LIMIT_FREE}) para el plan Free. Actualiza a Premium para exportaciones ilimitadas.`);
      return;
    }

    // 4) Ejecutar exportación y solo si fue exitosa actualizar contador en Firestore
    const exported = exportToCSV(dataToExport);

    if (!exported) {
      // si no pudo exportar (error o navegador no soporta), no incrementamos
      return;
    }

    if (user) {
      try {
        const userRef = doc(db, "users", user.uid);
        // increment crea el campo si no existe y suma 1
        await updateDoc(userRef, {
          exportsUsed: increment(1)
        });
        // actualizamos el estado local para reflejar el cambio inmediato en UI/comprobaciones
        setExportsUsed(prev => (typeof prev === 'number' ? prev + 1 : 1));
      } catch (error) {
        console.error("Error actualizando contador de exportaciones:", error);
        // no hacemos nada visual extra si falla la escritura; el usuario igual descargó
      }
    }
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
        String(op.order_id)?.toLowerCase().includes(searchLower) ||
        String(op.crypto)?.toLowerCase().includes(searchLower) ||
        String(op.fiat)?.toLowerCase().includes(searchLower) ||
        String(op.exchange)?.toLowerCase().includes(searchLower);
    }

    return filtered;
  });

  const buyOperations = filteredOperations.filter(op => op.operation_type === 'Compra');
  const sellOperations = filteredOperations.filter(op => op.operation_type === 'Venta');

  const renderOperations = (ops) => {
    if (ops.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-2xl mb-4">
            <DocumentArrowDownIcon className="h-8 w-8 text-purple-400" />
          </div>
          <h3 className="text-xl text-gray-300 mb-2">No hay operaciones registradas</h3>
          <p className="text-gray-500">Tus operaciones aparecerán aquí una vez que las registres</p>
        </div>
      );
    }
    
    return ops.map((operation, index) => (
      <Card
        key={operation.id || index}
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-purple-500/20 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <CardHeader className="border-b border-purple-500/10 pb-4">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <span className="text-purple-400 font-semibold">Orden #{operation.order_id || "N/A"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={operation.operation_type === 'Compra' 
                ? "bg-green-500/20 text-green-400 border-green-500/30" 
                : "bg-red-500/20 text-red-400 border-red-500/30"}>
                {operation.operation_type || "N/A"}
              </Badge>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => confirmDelete(operation.id)}
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
              <span className="text-gray-400 w-20">Cripto:</span>
              <Badge className="ml-2 bg-purple-500/10 text-purple-400 border-purple-500/30">
                {operation.crypto_amount?.toFixed(8) ?? "0.00000000"} {operation.crypto || "N/A"}
              </Badge>
            </div>
            <div className="flex items-center">
              <span className="text-gray-400 w-20">Fiat:</span>
              <Badge className="ml-2 bg-blue-500/10 text-blue-400 border-blue-500/30">
                {formatCurrency(operation.fiat_amount, operation.fiat)}
              </Badge>
            </div>
            <div className="flex items-center">
              <span className="text-gray-400 w-20">Exchange:</span>
              <span className="text-white ml-2">{operation.exchange || "N/A"}</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-400 w-20">Tasa:</span>
              <Badge className="ml-2 bg-gray-700 text-gray-300 border-gray-600">
                {operation.exchange_rate?.toFixed(2) ?? "0.00"}
              </Badge>
            </div>
            <div className="md:col-span-2 flex items-center">
              <span className="text-gray-400 w-20">Fecha:</span>
              <span className="text-white ml-2">
                {operation.timestamp ? formatDate(operation.timestamp) : "N/A"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-4">
            <DocumentArrowDownIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Historial de Operaciones
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Revisa y gestiona todas tus transacciones de compra y venta en un solo lugar
          </p>
        </div>

        {/* Filtros */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-purple-500/20 shadow-xl p-6">
          <CardHeader className="p-0 mb-6 border-b border-purple-500/10 pb-4">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <FunnelIcon className="h-5 w-5 text-purple-400" />
              </div>
              Filtros y Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300 font-medium">Criptomoneda</Label>
                <Select onValueChange={(value) => setFilters({ ...filters, crypto: value })}>
                  <SelectTrigger className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl">
                    <SelectValue placeholder="Todas las cryptos" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-purple-500/30 text-white">
                    {getUniqueValues("crypto").map((crypto) => (
                      <SelectItem key={crypto} value={crypto} className="rounded-lg focus:bg-purple-500/10">
                        {crypto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 font-medium">Moneda Fiat</Label>
                <Select onValueChange={(value) => setFilters({ ...filters, fiat: value })}>
                  <SelectTrigger className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl">
                    <SelectValue placeholder="Todas las fiats" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-purple-500/30 text-white">
                    {getUniqueValues("fiat").map((fiat) => (
                      <SelectItem key={fiat} value={fiat} className="rounded-lg focus:bg-purple-500/10">
                        {fiat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 font-medium">Exchange</Label>
                <Select onValueChange={(value) => setFilters({ ...filters, exchange: value })}>
                  <SelectTrigger className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl">
                    <SelectValue placeholder="Todos los exchanges" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-purple-500/30 text-white">
                    {getUniqueValues("exchange").map((exchange) => (
                      <SelectItem key={exchange} value={exchange} className="rounded-lg focus:bg-purple-500/10">
                        {exchange}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 font-medium">Búsqueda</Label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar..."
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
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
              Exportar Historial
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <div className="space-y-2">
                  <Label className="text-gray-300 font-medium">Fecha de inicio</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="bg-gray-800 border-purple-500/30 text-white h-11 rounded-xl pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300 font-medium">Fecha de fin</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
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
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

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
              </h2>
              <div className="grid gap-4">
                {renderOperations(buyOperations)}
              </div>
            </div>

            <div className="border-t border-purple-500/20 pt-8">
              <h2 className="text-2xl font-bold text-red-400 mb-4 flex items-center">
                <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                Ventas
              </h2>
              <div className="grid gap-4">
                {renderOperations(sellOperations)}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gradient-to-br from-gray-900 to-gray-800 border border-purple-500/20 rounded-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Confirmar Eliminación</DialogTitle>
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
    </div>
  );
};

export default History;