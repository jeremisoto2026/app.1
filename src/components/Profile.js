import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, serverTimestamp } from "firebase/firestore";
import { sendEmailVerification } from "firebase/auth";

// Componente principal de Profile
export default function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Datos de uso (temporal -> luego traer desde BD)
  const usageData = {
    operacionesUsadas: 15,
    limiteOperaciones: 30,
    porcentajeUso: (15 / 30) * 100,
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

  // Manejo de estados
  if (loading) return <p className="text-center text-gray-500">Cargando...</p>;

  if (error)
    return (
      <div className="text-center">
        <p className="text-red-500 mb-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Reintentar
        </button>
      </div>
    );

  if (!profileData)
    return (
      <div className="text-center">
        <p className="text-gray-500 mb-2">No hay datos de perfil disponibles.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Reintentar
        </button>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Tarjeta de perfil */}
      <div className="bg-white shadow-lg rounded-xl p-6 mb-6 border border-gray-200">
        <div className="flex items-center space-x-6">
          {/* Avatar */}
          {profileData.photoURL ? (
            <img
              src={profileData.photoURL}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-2 border-indigo-600"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600 border-2 border-indigo-600">
              {profileData.displayName?.charAt(0) ||
                profileData.email?.charAt(0)}
            </div>
          )}

          {/* Info */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {profileData.displayName || "Usuario"}
            </h2>
            <p className="text-gray-600">{profileData.email}</p>
            <p className="text-sm text-gray-500 mt-1">
              Cuenta creada:{" "}
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
                    alert("Correo de verificación enviado.");
                  } catch (err) {
                    console.error(err);
                    alert("Error al enviar el correo de verificación.");
                  }
                }}
                className="mt-2 px-3 py-1 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600"
              >
                Verificar correo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Uso del plan */}
      <div className="bg-white shadow-lg rounded-xl p-6 mb-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Uso del plan gratuito
        </h3>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div
            className="bg-indigo-600 h-4 rounded-full"
            style={{ width: `${usageData.porcentajeUso}%` }}
          ></div>
        </div>
        <p className="text-gray-600 text-sm">
          {usageData.operacionesUsadas} de {usageData.limiteOperaciones}{" "}
          operaciones utilizadas
        </p>
      </div>

      {/* Plan Premium */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg rounded-xl p-6 text-white mb-6">
        <h3 className="text-lg font-bold mb-2">¡Mejora a Premium!</h3>
        <p className="mb-4">
          Obtén operaciones ilimitadas, soporte prioritario y más beneficios.
        </p>
        <button className="bg-white text-indigo-600 font-semibold px-4 py-2 rounded-lg shadow hover:bg-gray-100">
          Actualizar por $9.99/mes
        </button>
      </div>

      {/* Soporte */}
      <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          ¿Necesitas ayuda?
        </h3>
        <button
          onClick={() => (window.location.href = "mailto:soporte@jjxcapital.com")}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {/* Ícono corregido */}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Contactar a soporte
        </button>
      </div>
    </div>
  );
}