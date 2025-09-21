import React, { useContext, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";

export default function Profile() {
  const { user, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("profile");
  
  // Datos simulados de uso
  const usageData = {
    operaciones: { usadas: 15, total: 30 },
    exportaciones: { usadas: 5, total: 10 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header con pestañas */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800 rounded-lg p-1 flex">
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "profile"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Perfil
            </button>
            <button
              onClick={() => setActiveTab("premium")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "premium"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Plan Premium
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "history"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Historial
            </button>
          </div>
        </div>

        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Información del perfil */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-700/50">
              <div className="flex flex-col items-center">
                <img
                  className="w-28 h-28 rounded-full object-cover border-4 border-indigo-500/30 shadow-lg"
                  src={user?.photoURL || "https://via.placeholder.com/150"}
                  alt="Profile"
                />
                <h2 className="mt-6 text-2xl font-bold text-white">
                  {user?.displayName || "Usuario"}
                </h2>
                <p className="text-gray-400 mt-2">{user?.email}</p>
                
                <div className="w-full mt-8 space-y-6">
                  {/* Barra de progreso para operaciones */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">Operaciones</span>
                      <span className="text-gray-400">{usageData.operaciones.usadas}/{usageData.operaciones.total}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full"
                        style={{ width: `${(usageData.operaciones.usadas / usageData.operaciones.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Barra de progreso para exportaciones */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">Exportaciones</span>
                      <span className="text-gray-400">{usageData.exportaciones.usadas}/{usageData.exportaciones.total}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-green-500 h-2.5 rounded-full"
                        style={{ width: `${(usageData.exportaciones.usadas / usageData.exportaciones.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 w-full space-y-4">
                  <button className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition-colors">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.049 2.927c.3-1.14 1.603-1.14 1.902 0a1.724 1.724 0 002.573 1.02c.964-.556 2.16.64 1.605 1.605a1.724 1.724 极速赛车开奖直播历史记录
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Ajustes de cuenta
                  </button>
                  
                  <button
                    onClick={logout}
                    className="w-full flex items-center justify-center px-4 py-3 bg-gray-700 text-white rounded-lg shadow hover:bg-gray-600 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-10V5m0 0a7 7 0 00-7 7h0a7 7 0 007 7h0"
                      />
                    </svg>
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </div>

            {/* Plan actual */}
            <div className="bg-gradient-to-br from-indigo-900/80 to-purple-900/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-indigo-500/30">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Plan Actual
              </h3>
              <p className="text-indigo-200 mb-6">Estás utilizando el plan gratuito</p>
              
              <div className="bg-indigo-800/40 rounded-xl p-4 mb-6">
                <h4 className="text-lg font-semibold text-white mb-3">Límites actuales</h4>
                <ul className="text-indigo-100 space-y-2">
                  <li className="flex justify-between">
                    <span>Operaciones mensuales</span>
                    <span className="font-medium">{usageData.operaciones.total}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Exportaciones mensuales</span>
                    <span className="font-medium">{usageData.exportaciones.total}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Soporte</span>
                    <span className="font-medium">Básico</span>
                  </li>
                </ul>
              </div>
              
              <button 
                onClick={() => setActiveTab("premium")}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-300"
              >
                Mejorar a Premium
              </button>
            </div>
          </div>
        )}

        {activeTab === "premium" && (
          <div className="bg-gradient-to-br from-purple-900/80 to-indigo-900/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-500/30">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Plan Premium</h2>
              <p className="text-purple-200">Desbloquea todo el potencial de nuestra plataforma</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Beneficio 1 */}
              <div className="bg-gray-800/40 rounded-xl p-5 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-indigo-500 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Operaciones Ilimitadas</h3>
                <p className="text-gray-300">Realiza todas las operaciones que necesites sin restricciones</p>
              </div>
              
              {/* Beneficio 2 */}
              <div className="bg-gray-800/40 rounded-xl p-5 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-indigo-500 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Exportaciones Ilimitadas</h3>
                <p className="text-gray-300">Exporta todos los datos que necesites sin límites</p>
              </div>
              
              {/* Beneficio 3 */}
              <div className="bg-gray-800/40 rounded-xl p-5 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-indigo-500 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text极速赛车开奖直播历史记录
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Soporte Prioritario</h3>
                <p className="text-gray-300">Atención personalizada y respuestas rápidas</p>
              </div>
            </div>
            
            <div className="bg-gray-800/60 rounded-2xl p-6 mb-8">
              <div className="flex justify-center mb-6">
                <div className="bg-indigo-900 rounded-full py-1 px-4 inline-flex items-center">
                  <span className="text-indigo-200 text-sm">💰 Ahorra 20% con el plan anual</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Plan Mensual */}
                <div className="bg-gray-900/60 rounded-xl p-5 border-2 border-indigo-500">
                  <h3 className="text-xl font-bold text-white text-center mb-2">Plan Mensual</h3>
                  <div className="text-center mb-4">
                    <span className="text-3xl font-bold text-white">$13</span>
                    <span className="text-gray-400">/mes</span>
                  </div>
                  <ul className="text-gray-300 space-y-2 mb-6">
                    <li className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Operaciones ilimitadas
                    </li>
                    <li className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0极速赛车开奖直播历史记录
                      </svg>
                      Exportaciones ilimitadas
                    </li>
                    <li className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-极速赛车开奖直播历史记录
                      </svg>
                      Soporte prioritario
                    </li>
                  </ul>
                  <button className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    Seleccionar mensual
                  </button>
                </div>
                
                {/* Plan Anual */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-5 border-2 border-indigo-400">
                  <div className="flex justify-center mb-2">
                    <span className="bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-1 rounded">RECOMENDADO</span>
                  </div>
                  <h3 className="text-xl font-bold text-white text-center mb-2">Plan Anual</h3>
                  <div className="text-center mb-4">
                    <span className="text-3xl font-bold text-white">$120</span>
                    <span className="text-gray-200">/año</span>
                  </div>
                  <ul className="text-gray-100 space-y-2 mb-6">
                    <li className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-300 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586极速赛车开奖直播历史记录
                      </svg>
                      Todo lo del plan mensual
                    </li>
                    <li className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-300 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Ahorras $36 al año
                    </li>
                    <li className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-300 mr-2" viewBox="0 0 20 极速赛车开奖直播历史记录
                      </svg>
                      Acceso anticipado a nuevas funciones
                    </li>
                  </ul>
                  <button className="w-full py-2 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                    Seleccionar anual
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-white mb-4 text-center">Métodos de pago</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="flex items-center justify-center py-3 px-4 bg-[#0070BA] hover:bg-[#005EA6] text-white rounded-lg transition-colors">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="white">
                    <path d="M7.2 18c-.3 0-.6-.1-.8-.4l-3.8-5c-.3-.4-.3-1 .1-1.3.4-.3 1-.3 1.3.1l3.3 4.3 8.3-10c.3-.4.9-.4 1.2 0 .4.3.4.9 0 1.2L8.1 17.6c-.2.2-.5.4-.9.4z"/>
                  </svg>
                  PayPal
                </button>
                
                <button className="flex items-center justify-center py-3 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                  </svg>
                  Binance Pay
                </button>
                
                <button className="flex items-center justify-center py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13h-1v5l3.2 2.3.8-1.1-2.9-2.1V7z"/>
                  </svg>
                  Blockchain Pay
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-700/50">
            <h2 className="text-2xl font-bold text-white mb-6">Historial de Actividad</h2>
            <div className="text-center py-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-400 mt-4">No hay actividad reciente</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}