// src/components/Profile.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { Progress } from "./ui/progress";
import { getUserProfile, getUserOperations, getUserOperationsCount, getUserExportsCount } from "../services/database";

export default function Profile() {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [operations, setOperations] = useState([]);
  const [operationsCount, setOperationsCount] = useState(0);
  const [exportsCount, setExportsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const profile = await getUserProfile(user.uid);
        setUserData(profile || {
          uid: user.uid,
          email: user.email,
          nombre: user.displayName ? user.displayName.split(" ")[0] : "",
          apellido: user.displayName ? user.displayName.split(" ").slice(1).join(" ") : "",
          photoURL: user.photoURL || "",
          plan: "free",
          limiteOperaciones: 200,
          limiteExportaciones: 40,
          createdAt: user.metadata ? user.metadata.creationTime : null
        });

        const ops = await getUserOperations(user.uid);
        setOperations(ops);

        const opsCount = await getUserOperationsCount(user.uid);
        setOperationsCount(opsCount);

        const expsCount = await getUserExportsCount(user.uid);
        setExportsCount(expsCount);
      } catch (err) {
        console.error("Error cargando perfil:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

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
              {[1,2,3,4].map(i => (
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

  if (!userData) {
    return <div className="min-h-screen bg-black text-white p-8">No se pudo cargar el perfil.</div>;
  }

  const progressPercentage = {
    operaciones: userData.limiteOperaciones ? (operationsCount / userData.limiteOperaciones) * 100 : 100,
    exportaciones: userData.limiteExportaciones ? (exportsCount / userData.limiteExportaciones) * 100 : 100
  };

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-24 h-24 mx-auto mb-4 relative">
            {userData.photoURL ? (
              <img src={userData.photoURL} alt="avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                { (userData.nombre || userData.email || "U").charAt(0).toUpperCase() }
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">{userData.nombre} {userData.apellido}</h1>
          <p className="text-gray-400">{userData.email}</p>
          <div className="inline-block mt-2 px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-xs font-medium">
            Miembro desde { userData.createdAt?.toDate ? userData.createdAt.toDate().toLocaleDateString() : (userData.createdAt || "—") }
          </div>
        </div>

        <Card className="bg-gray-900 border-gray-800 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-600 text-white pb-6">
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
              Plan Actual: { userData.plan === "free" ? "Gratuito" : userData.plan === "premium" ? "Premium" : "Exclusivo" }
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-white">Uso de tu cuenta</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-300">Operaciones</span>
                    <span className="text-gray-400">{operationsCount}/{userData.limiteOperaciones || "∞"}</span>
                  </div>
                  <Progress value={Math.min(progressPercentage.operaciones, 100)} className="h-2 bg-gray-700" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-300">Exportaciones</span>
                    <span className="text-gray-400">{exportsCount}/{userData.limiteExportaciones || "∞"}</span>
                  </div>
                  <Progress value={Math.min(progressPercentage.exportaciones, 100)} className="h-2 bg-gray-700" />
                </div>
              </div>

              <Button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white">
                Actualizar tus Límites
              </Button>
            </div>

            <Separator className="my-4 bg-gray-700" />

            {/* Plan Premium y botones de pago */}
            <div className="bg-gradient-to-br from-gray-800 to-blue-900/30 p-4 rounded-xl border border-blue-800/30">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-white">Plan Premium</h3>
              <p className="text-sm mb-4 text-gray-300">
                Obtén <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">todo ilimitado</span> por solo
              </p>

              <div className="flex items-baseline justify-center mb-4">
                <span className="text-3xl font-bold text-white">$13</span>
                <span className="text-gray-400">/mes</span>
              </div>

              <div className="flex flex-col gap-3">
                <Button className="bg-gradient-to-r from-[#0070ba] to-[#005c99] text-white shadow-md">Pagar con PayPal</Button>
                <Button className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-white shadow-md">Binance Pay</Button>
                <Button className="bg-gradient-to-r from-gray-800 to-gray-700 text-white shadow-md">Blockchain Pay</Button>
              </div>
            </div>

            <Separator className="my-4 bg-gray-700" />

            {/* Soporte */}
            <div>
              <Button className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white">Contactar a Soporte</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}