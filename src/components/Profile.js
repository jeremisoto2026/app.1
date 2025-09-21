import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const Profile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setProfileData(docSnap.data());
          } else {
            console.log("No se encontraron datos del perfil.");
          }
        } catch (error) {
          console.error("Error al obtener perfil:", error);
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  // Datos de ejemplo para límites (deberías obtener estos datos de tu base de datos)
  const usageData = {
    operaciones: { usadas: 3, limite: 200 },
    exportaciones: { usadas: 2, limite: 40 }
  };

  const handleContactSupport = () => {
    window.location.href = "mailto:soportejjxcapital@gmail.com";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">No se encontraron datos del perfil.</div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header con avatar e información del usuario */}
        <div className="text-center mb-6">
          <div className="w-24 h-24 mx-auto mb-4 relative">
            {profileData.photoURL ? (
              <img 
                src={profileData.photoURL} 
                alt="Foto de perfil" 
                className="w-full h-full rounded-full object-cover border-2 border-gray-700"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                {profileData.nombre ? profileData.nombre.charAt(0) : user.email.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue-500 border-2 border-gray-900 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Tu Perfil</h1>
          <p className="text-gray-400">{user.email}</p>
          <div className="inline-block mt-2 px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-xs font-medium">
            Miembro desde {profileData.createdAt?.toDate().toLocaleDateString() || "Fecha no disponible"}
          </div>
        </div>

        {/* Tarjeta de información del perfil */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl mb-6">
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white p-6">
            <h2 className="text-xl font-bold flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Información del Perfil
            </h2>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Nombre</p>
                <p className="text-white font-medium">{profileData.nombre || "No especificado"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Apellido</p>
                <p className="text-white font-medium">{profileData.apellido || "No especificado"}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400">Email</p>
              <p className="text-white font-medium">{profileData.email}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400">UID</p>
              <p className="text-white font-medium text-xs overflow-hidden overflow-ellipsis">{profileData.uid}</p>
            </div>

            <div className="pt-4 border-t border-gray-800">
              <p className="text-sm text-gray-400">Plan actual</p>
              <div className="flex items-center mt-1">
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">
                  {profileData.plan || "Free"}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400">Fecha de creación</p>
              <p className="text-white font-medium">
                {profileData.createdAt?.toDate().toLocaleString() || "Fecha no disponible"}
              </p>
            </div>
          </div>
        </div>

        {/* Sección de Límites */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl mb-6">
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white p-6">
            <h2 className="text-xl font-bold flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Límites de Uso
            </h2>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-300">Operaciones</span>
                <span className="text-gray-400">{usageData.operaciones.usadas}/{usageData.operaciones.limite}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{width: `${(usageData.operaciones.usadas / usageData.operaciones.limite) * 100}%`}}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-300">Exportaciones</span>
                <span className="text-gray-400">{usageData.exportaciones.usadas}/{usageData.exportaciones.limite}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-green-500 h-2.5 rounded-full" 
                  style={{width: `${(usageData.exportaciones.usadas / usageData.exportaciones.limite) * 100}%`}}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Plan Premium */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl mb-6">
          <div className="bg-gradient-to-r from-purple-700 to-purple-600 text-white p-6">
            <h2 className="text-xl font-bold flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Plan Premium
            </h2>
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-300 mb-4 text-center">
              Obtén <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">todo ilimitado</span> por solo
            </p>
            
            <div className="flex items-baseline justify-center mb-4">
              <span className="text-3xl font-bold text-white">$13</span>
              <span className="text-gray-400">/mes</span>
            </div>
            
            <ul className="text-sm text-gray-400 mb-6 space-y-2">
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
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 8a2 2 0 114 0 2 2 0 01-4 0zm2 6a6 极速赛车开奖直播历史记录
                </svg>
                Pagar con PayPal
              </button>
              <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-极速赛车开奖直播历史记录
                </svg>
                Binance Pay
              </button>
              <button className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 极速赛车开奖直播历史记录
                </svg>
                Blockchain Pay
              </button>
            </div>
          </div>
        </div>

        {/* Botón de Contactar a Soporte */}
        <button 
          onClick={handleContactSupport}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin极速赛车开奖直播历史记录
          </svg>
          Contactar a Soporte
        </button>
      </div>
    </div>
  );
};

export default Profile;