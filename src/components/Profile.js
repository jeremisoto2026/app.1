// src/components/Profile.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  ensureUserDoc,
  getUserProfile,
  getUserOperationsCount,
  getUserExportsCount,
} from "../services/database";

import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { Progress } from "../components/ui/progress";

/**
 * Profile component — lee datos desde Firestore (services/database.js)
 * Mantiene el diseño que ya usabas y añade la integración con la DB.
 */
export default function Profile() {
  const { user, loading: authLoading } = useAuth(); // desde contexts/AuthContext
  const [profile, setProfile] = useState(null);
  const [operationsCount, setOperationsCount] = useState(0);
  const [exportsCount, setExportsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // formatea createdAt (Firestore Timestamp o string)
  const formatMemberSince = (createdAt) => {
    if (!createdAt) return "—";
    if (createdAt?.toDate) {
      return createdAt.toDate().toLocaleDateString();
    }
    // si es string ya formateado:
    try {
      return new Date(createdAt).toLocaleDateString();
    } catch {
      return String(createdAt);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadProfileData = async () => {
      if (!user) {
        if (mounted) {
          setLoading(false);
          setProfile(null);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1) Aseguramos que exista el documento de usuario (si no existe lo crea)
        // ensureUserDoc acepta un objeto usuario con uid, email, displayName, photoURL.
        await ensureUserDoc({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
        });

        // 2) Obtener perfil desde Firestore
        const prof = await getUserProfile(user.uid);
        if (!mounted) return;

        if (!prof) {
          setProfile({
            uid: user.uid,
            email: user.email || "",
            nombre: "",
            apellido: "",
            photoURL: user.photoURL || "",
            plan: "free",
            createdAt: null,
            limiteOperaciones: 200,
            limiteExportaciones: 40,
          });
        } else {
          setProfile(prof);
        }

        // 3) Obtener contadores
        const ops = await getUserOperationsCount(user.uid);
        const exps = await getUserExportsCount(user.uid);
        if (!mounted) return;

        setOperationsCount(ops);
        setExportsCount(exps);
      } catch (err) {
        console.error("Profile load error:", err);
        if (mounted) setError("Error cargando datos de perfil.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProfileData();

    return () => {
      mounted = false;
    };
  }, [user]);

  // Mostrar skeletons mientras autentica o carga datos
  if (authLoading || loading) {
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
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
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

  if (!user) {
    return (
      <div className="min-h-screen bg-black py-8 px-4">
        <div className="max-w-md mx-auto text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Acceso requerido</h2>
          <p className="text-gray-400">Por favor inicia sesión para ver tu perfil.</p>
        </div>
      </div>
    );
  }

  // si ocurrió un error
  if (error) {
    return (
      <div className="min-h-screen bg-black py-8 px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center text-red-400">
            <h3 className="text-xl font-bold">Error</h3>
            <p className="mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Datos (profile viene de Firestore)
  const {
    nombre = "",
    apellido = "",
    email = "",
    photoURL = "",
    plan = "free",
    createdAt = null,
    limiteOperaciones = plan === "free" ? 200 : null,
    limiteExportaciones = plan === "free" ? 40 : null,
  } = profile || {};

  // Cálculo de progreso (si plan free)
  const opsPercent =
    limiteOperaciones && limiteOperaciones > 0
      ? Math.min(100, Math.round((operationsCount / limiteOperaciones) * 100))
      : 100;
  const expsPercent =
    limiteExportaciones && limiteExportaciones > 0
      ? Math.min(100, Math.round((exportsCount / limiteExportaciones) * 100))
      : 100;

  // Handlers (placeholders — los conectarás luego)
  const handleUpgradeClick = () => {
    // Aquí abrir modal / checkout real más tarde
    window.alert("Próximamente: flujo de actualización a Premium (13$/mes).");
  };

  const handlePay = (method) => {
    console.log("Seleccionado método de pago:", method);
    window.alert(`Método de pago seleccionado: ${method} — (conectar en el siguiente paso).`);
  };

  const handleContactSupport = () => {
    // ejemplo simple: abrir mailto o tu sistema de soporte
    window.location.href = "mailto:soporte@tudominio.com?subject=Soporte%20JJXCAPITAL";
  };

  // Avatar: mostrar foto si la tiene, sino iniciales
  const initials =
    (nombre ? nombre.charAt(0) : "") + (apellido ? apellido.charAt(0) : "");
  const displayEmail = email || user.email || profile?.email || "—";

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-24 h-24 mx-auto mb-4 relative">
            {photoURL ? (
              <img
                src={photoURL}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover border-2 border-gray-900"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                {initials || (displayEmail ? displayEmail.charAt(0).toUpperCase() : "U")}
              </div>
            )}

            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-blue-500 border-2 border-gray-900 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white">{nombre} {apellido}</h1>
          <p className="text-gray-400">{displayEmail}</p>

          <div className="inline-block mt-2 px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-xs font-medium">
            Miembro desde {formatMemberSince(createdAt)}
          </div>
        </div>

        {/* Card principal */}
        <Card className="bg-gray-900 border-gray-800 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-600 text-white pb-6">
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Plan Actual: {plan === "exclusive" ? "Exclusivo (Dueño)" : plan === "premium" ? "Premium" : "Gratuito"}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Uso y límites */}
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
                      {operationsCount}/{plan === "free" ? limiteOperaciones : "∞"}
                    </span>
                  </div>
                  <Progress value={plan === "free" ? opsPercent : 100} className="h-2 bg-gray-700" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-300">Exportaciones</span>
                    <span className="text-gray-400">
                      {exportsCount}/{plan === "free" ? limiteExportaciones : "∞"}
                    </span>
                  </div>
                  <Progress value={plan === "free" ? expsPercent : 100} className="h-2 bg-gray-700" />
                </div>
              </div>

              {plan === "free" && (
                <Button
                  onClick={handleUpgradeClick}
                  className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
                >
                  Actualizar tus Límites
                </Button>
              )}
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

              <ul className="text-sm text-gray-400 mb-4 space-y-1">
                <li className="flex items-center gap-2">✅ Operaciones ilimitadas</li>
                <li className="flex items-center gap-2">✅ Exportaciones ilimitadas</li>
                <li className="flex items-center gap-2">✅ Soporte prioritario</li>
              </ul>

              {/* Mostrar botones de pago solo si no es exclusive */}
              {plan !== "exclusive" ? (
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => handlePay("paypal")}
                    className="bg-gradient-to-r from-[#0070ba] to-[#005c99] text-white shadow-md"
                  >
                    Pagar con PayPal
                  </Button>
                  <Button
                    onClick={() => handlePay("binance")}
                    className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-white shadow-md"
                  >
                    Binance Pay
                  </Button>
                  <Button
                    onClick={() => handlePay("blockchain")}
                    className="bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-md"
                  >
                    Blockchain Pay
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-gray-300">👑 Plan Exclusivo (Dueño) — Sin necesidad de pago.</div>
              )}
            </div>

            <Separator className="my-4 bg-gray-700" />

            {/* Soporte */}
            <div>
              <Button
                onClick={handleContactSupport}
                className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white"
              >
                Contactar a Soporte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}