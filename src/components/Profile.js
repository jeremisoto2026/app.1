import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { sendEmailVerification } from "firebase/auth";

export default function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("monthly");

  // Datos de uso
  const usageData = {
    operacionesUsadas: 15,
    limiteOperaciones: 30,
    exportacionesUsadas: 5,
    limiteExportaciones: 10,
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = auth.currentUser;
        if (user) {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfileData(docSnap.data());
          } else {
            setProfileData(null);
          }
        }
      } catch (err) {
        console.error("Error cargando perfil:", err);
        setError("No se pudo cargar el perfil. Inténtalo de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center p-6 bg-gray-800 rounded-xl shadow-2xl max-w-md">
          <div className="text-red-500 text-xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 极速赛车开奖直播历史记录
            </svg>
          </div>
          <p className="text-white mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center p-6 bg-gray-800 rounded-xl shadow-2xl max-w-md">
          <div className="text-gray-400 text-xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-white mb-4">No hay datos de perfil disponibles.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header con avatar e información del usuario */}
        <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-2xl p-6 mb-8 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
            {/* Avatar */}
            {profileData.photoURL ? (
              <img
                src={profileData.photoURL}
                alt="Profile"
                className="w-28 h-28 rounded-full object-cover border-4 border-white/30 shadow-lg"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-3xl font-bold text-white border-4 border-white/30 shadow-lg">
                {profileData.displayName?.charAt(0) || profileData.email?.charAt(0)}
              </div>
            )}

            {/* Info */}
            <div className="text-center md:text-left flex-1">
              <h2 className="text-3xl font-bold text-white mb-2">
                {profileData.displayName || "Usuario"}
              </h2>
              <p className="text-indigo-200">{profileData.email}</p>
              <p className="text-sm text-indigo-100 mt-2">
                Miembro desde:{" "}
                {profileData.createdAt?.toDate
                  ? profileData.createdAt.toDate().toLocaleDateString()
                  : "Fecha no disponible"}
              </p>
              
              {/* Verificación de email */}
              {!auth.currentUser.emailVerified && (
                <button
                  onClick={async () => {
                    try {
                      await sendEmailVerification(auth.currentUser);
                      alert("Correo de verificación enviado. Revisa tu bandeja de entrada.");
                    } catch (err) {
                      console.error(err);
                      alert("Error al enviar el correo de verificación.");
                    }
                  }}
                  className="mt-4 px-4 py-2 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 transition-colors duration-300 flex items-center justify-center mx-auto md:mx-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Verificar correo electrónico
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Uso del plan */}
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-700/50">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2极速赛车开奖直播历史记录
              </svg>
              Uso de tu plan actual
            </h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300 font-medium">Operaciones</span>
                  <span className="text-gray-400">{usageData.operacionesUsadas}/{usageData.limiteOperaciones}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full"
                    style={{ width: `${(usageData.operacionesUsadas / usageData.limiteOperaciones) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300 font-medium">Exportaciones</span>
                  <span className="text-gray-400">{usageData.exportacionesUsadas}/{usageData.limiteExportaciones}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-green-500 to-teal-500 h-2.5 rounded-full"
                    style={{ width: `${(usageData.exportacionesUsadas / usageData.limiteExportaciones) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-700/50">
              <p className="text-sm text-gray-400">Plan actual: <span className="text-indigo-400 font-medium">Gratuito</span></p>
            </div>
          </div>

          {/* Plan Premium */}
          <div className="bg-gradient-to-br from-purple-900/80 to-indigo-900/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-500/30">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Plan Premium
              </h3>
              
              <div className="flex space-x-2 bg-gray-900/70 rounded-lg p-1">
                <button 
                  onClick={() => setSelectedPlan("monthly")}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${selectedPlan === "monthly" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  Mensual
                </button>
                <button 
                  onClick={() => setSelectedPlan("yearly")}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${selectedPlan === "yearly" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  Anual
                </button>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-white">
                  ${selectedPlan === "monthly" ? "13" : "120"}
                </span>
                <span className="text-gray-400 ml-2">/{selectedPlan === "monthly" ? "mes" : "año"}</span>
              </div>
              <p className="text-sm text-purple-200 mt-1">Ahorra {selectedPlan === "yearly" ? "23%" : ""}</p>
            </div>
            
            <ul className="text-gray-200 mb-6 space-y-2">
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Operaciones ilimitadas
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/s极速赛车开奖直播历史记录
                </svg>
                Exportaciones ilimitadas
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0极速赛车开奖直播历史记录
                </svg>
                Soporte prioritario 24/7
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Acceso a herramientas avanzadas
              </li>
            </ul>
            
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center py-3 px-4 bg-[#0070BA] hover:bg-[#005EA6] text-white rounded-lg transition-all duration-300 transform hover:scale-[1.02]">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="white">
                  <path d="M7.2 18c-.3 0-.6-.1-.8-.4l-3.8-5