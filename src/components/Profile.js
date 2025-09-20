import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { Progress } from "../components/ui/progress";
import { getUserData, getUserOperations } from "../services/database"; // Importar desde services

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const userDataFromDB = await getUserData();
        setUserData(userDataFromDB);

        // ⚡ usar id, no uid
        const userOperations = await getUserOperations(userDataFromDB.id);
        setOperations(userOperations);
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const operationsCount = operations.length;
  const exportsCount = operations.filter((op) => op.tipo === "exportacion").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-black py-8 px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4 bg-gray-800" />
            <Skeleton className="h-8 w-48 mx-auto mb-2 bg-gray-800" />
            <Skeleton className="h-4 w-32 mx-auto mb-2 bg-gray-800" />
            <Skeleton className="h-6 w-40 mx-auto bg-gray-800" />
          </div>
          <Card className="bg-gray-900 border-gray-800 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-800 pb-6">
              <Skeleton className="h-6 w-40 mx-auto bg-gray-700" />
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {[1, 2, 3, 4].map((item) => (
                <div key={item}>
                  <Skeleton className="h-5 w-32 mb-3 bg-gray-800" />
                  <Skeleton className="h-4 w-full mb-2 bg-gray-800" />
                  <Skeleton className="h-4 w-3/4 mb-4 bg-gray-800" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const progressPercentage = {
    operaciones: userData?.limiteOperaciones
      ? (operationsCount / userData.limiteOperaciones) * 100
      : 0,
    exportaciones: userData?.limiteExportaciones
      ? (exportsCount / userData.limiteExportaciones) * 100
      : 0,
  };

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header con avatar e información del usuario */}
        <div className="text-center mb-6">
          <div className="w-24 h-24 mx-auto mb-4 relative">
            <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
              {userData?.avatar || userData?.nombre?.charAt(0) || "U"}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {userData?.nombre || "Usuario"}
          </h1>
          <p className="text-gray-400">{userData?.email || "Sin correo"}</p>
          <div className="inline-block mt-2 px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-xs font-medium">
            Miembro desde {userData?.memberSince || "N/A"}
          </div>
        </div>

        <Card className="bg-gray-900 border-gray-800 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-600 text-white pb-6">
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Plan Actual: {userData?.plan || "Gratis"}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Limitaciones con barras de progreso */}
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Uso de tu cuenta
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-300">Operaciones</span>
                    <span className="text-gray-400">
                      {operationsCount}/{userData?.limiteOperaciones || 0}
                    </span>
                  </div>
                  <Progress value={progressPercentage.operaciones} className="h-2 bg-gray-700" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-300">Exportaciones</span>
                    <span className="text-gray-400">
                      {exportsCount}/{userData?.limiteExportaciones || 0}
                    </span>
                  </div>
                  <Progress value={progressPercentage.exportaciones} className="h-2 bg-gray-700" />
                </div>
              </div>
              <Button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white">
                Actualizar tus Límites
              </Button>
            </div>

            <Separator className="my-4 bg-gray-700" />

            {/* Lista de operaciones recientes */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Operaciones Recientes
              </h3>
              {operations.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {operations.slice(0, 5).map((op) => (
                    <div key={op.id} className="bg-gray-800 p-3 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-white">{op.nombre || "Operación"}</p>
                        <p className="text-xs text-gray-400">
                          {op.fecha?.toDate ? op.fecha.toDate().toLocaleDateString() : "Fecha no disponible"}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          op.tipo === "exportacion"
                            ? "bg-green-900 text-green-300"
                            : "bg-blue-900 text-blue-300"
                        }`}
                      >
                        {op.tipo === "exportacion" ? "Exportación" : "Operación"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No hay operaciones recientes</p>
              )}
            </div>

            <Separator className="my-4 bg-gray-700" />

            <div>
              <Button className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white">
                Contactar a Soporte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}