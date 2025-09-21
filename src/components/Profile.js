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
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
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

        {/* Tarjeta de acciones */}
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Acciones</h3>
          <div className="space-y-3">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200">
              Editar Perfil
            </button>
            <button className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200">
              Cambiar Contraseña
            </button>
            <button className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200">
              Ver Historial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;