import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase"; // Asegúrate de que esta ruta es correcta
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { Progress } from "../components/ui/progress";
// Importa las funciones correctas desde database.js
import { getUserPreferences, getUserOperations } from "../services/database";

export default function Profile() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("usage");

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        // Obtener datos del usuario usando getUserPreferences
        const userDataFromDB = await getUserPreferences(user.uid);
        setUserData(userDataFromDB);
        
        // Obtener operaciones del usuario
        const userOperations = await getUserOperations(user.uid);
        setOperations(userOperations);
      } catch (error) {
        console.error("Error cargando datos:", error);
        // En caso de error, establecer datos de ejemplo para desarrollo
        setUserData({
          plan: "Free",
          limiteOperaciones: 200,
          limiteExportaciones: 40,
          email: user.email,
          memberSince: "Enero 2024",
          nombre: user.displayName || "Usuario",
          avatar: user.displayName ? user.displayName.charAt(0) : "U",
          uid: user.uid
        });
        setOperations([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Calcular contadores
  const operationsCount = operations.length;
  const exportsCount = operations.filter(op => op.operation_type === 'Venta').length;

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
    operaciones: Math.min((operationsCount / userData.limiteOperaciones) * 100, 100),
    exportaciones: Math.min((exportsCount / userData.limiteExportaciones) * 100, 100)
  };

  // Función para formatear fechas
  const formatDate = (timestamp) => {
    if (!timestamp) return "Fecha no disponible";
    
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString();
      } else if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString();
      } else if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      } else {
        return "Fecha no disponible";
      }
    } catch (error) {
      console.error("Error formateando fecha:", error);
      return "Fecha no disponible";
    }
  };

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header con avatar e información del usuario */}
        <div className="text-center mb-6">
          <div className="w-24 h-24 mx-auto mb-4 relative">
            <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
              {userData.avatar || (userData.nombre && userData.nombre.charAt(0)) || "U"}
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue-500 border-2 border-gray-900 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Tu Cuenta</h1>
          <p className="text-gray-400">{userData.email}</p>
          <div className="inline-block mt-2 px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-xs font-medium">
            Miembro desde {userData.memberSince}
          </div>
        </div>

        <Card className="bg-gray-900 border-gray-800 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-600 text-white pb-6">
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Plan Actual: {userData.plan}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Pestañas para alternar entre uso y operaciones */}
            <div className="flex border-b border-gray-700">
              <button
                className={`py-2 px-4 font-medium text-sm ${activeTab === 'usage' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
                onClick={() => setActiveTab('usage')}
              >
                Uso de Cuenta
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm ${activeTab === 'operations' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
                onClick={() => setActiveTab('operations')}
              >
                Operaciones
              </button>
            </div>

            {activeTab === 'usage' ? (
              <>
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
                        <span className="text-gray-400">{operationsCount}/{userData.limiteOperaciones}</span>
                      </div>
                      <Progress value={progressPercentage.operaciones} className="h-2 bg-gray-700" />
                      <div className="text-xs text-gray-500 mt-1">
                        {progressPercentage.operaciones >= 90 ? 
                          "¡Estás cerca de tu límite!" : 
                          `${userData.limiteOperaciones - operationsCount} operaciones restantes`}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-300">Exportaciones</span>
                        <span className="text-gray-400">{exportsCount}/{userData.limiteExportaciones}</span>
                      </div>
                      <Progress value={progressPercentage.exportaciones} className="h-2 bg-gray-700" />
                      <div className="text-xs text-gray-500 mt-1">
                        {progressPercentage.exportaciones >= 90 ? 
                          "¡Estás cerca de tu límite!" : 
                          `${userData.limiteExportaciones - exportsCount} exportaciones restantes`}
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white">
                    Actualizar tus Límites
                  </Button>
                </div>

                <Separator className="my-4 bg-gray-700" />

                {/* Plan Premium */}
                <div className="bg-gradient-to-br from-gray-800 to-blue-900/30 p-4 rounded-xl border border-blue-800/30">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Plan Premium
                  </h3>
                  <p className="text-sm mb-4 text-gray-300">
                    Obtén <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">todo ilimitado</span> por solo
                  </p>
                  
                  <div className="flex items-baseline justify-center mb-4">
                    <span className="text-3xl font-bold text-white">$13</span>
                    <span className="text-gray-400">/mes</span>
                  </div>
                  
                  <ul className="text-sm text-gray-400 mb-4 space-y-2">
                    <li className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Operaciones ilimitadas
                    </li>
                    <li className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Exportaciones ilimitadas
                    </li>
                    <li className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Soporte prioritario
                    </li>
                  </ul>
                  
                  <div className="flex flex-col gap-3">
                    <Button className="bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 8a2 2 0 114 0 2 2 0 01-4 0zm2 6a6 6 0 00-6-6v2a4 4 0 014 4h2z" clipRule="evenodd" />
                      </svg>
                      Pagar con PayPal
                    </Button>
                    <Button className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Binance Pay
                    </Button>
                    <Button className="bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m10 5l5-5m-5-5l5 5" />
                      </svg>
                      Blockchain Pay
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              /* Lista de operaciones recientes */
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Historial de Operaciones
                </h3>
                
                {operations.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {operations.map((op) => (
                      <div key={op.id} className="bg-gray-800 p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium text-white">{op.crypto || "Operación"}</p>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            op.operation_type === "Venta" 
                              ? "bg-green-900 text-green-300" 
                              : "bg-blue-900 text-blue-300"
                          }`}>
                            {op.operation_type === "Venta" ? "Venta" : "Compra"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {formatDate(op.timestamp)}
                        </p>
                        {op.crypto_amount && (
                          <p className="text-xs text-gray-500 mt-1">Cantidad: {op.crypto_amount}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-400 text-sm mt-2">No hay operaciones registradas</p>
                  </div>
                )}
              </div>
            )}

            <Separator className="my-4 bg-gray-700" />

            {/* Soporte */}
            <div>
              <Button className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Contactar a Soporte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}