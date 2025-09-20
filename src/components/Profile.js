import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext"; // 👈 usamos el usuario real
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { Progress } from "../components/ui/progress";

export default function Profile() {
  const { user } = useAuth(); // 👈 usuario autenticado
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [operationsCount, setOperationsCount] = useState(0);
  const [exportsCount, setExportsCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      try {
        // Datos de perfil: puedes guardar más en Firestore si quieres
        const userProfile = {
          plan: "Free",
          limiteOperaciones: 200,
          limiteExportaciones: 40,
          email: user.email,
          memberSince: "Enero 2024", // 👈 podrías guardarlo en Firestore
          nombre: user.displayName || "Usuario",
          avatar: user.displayName
            ? user.displayName.charAt(0).toUpperCase()
            : user.email.charAt(0).toUpperCase(),
          uid: user.uid
        };
        setUserData(userProfile);

        // Ahora cargamos operaciones en tiempo real
        const q = query(
          collection(db, "operations"),
          where("userId", "==", user.uid),
          orderBy("fecha", "desc")
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          let opsCount = 0;
          let expsCount = 0;

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            opsCount++;
            if (data.tipo === "exportacion") expsCount++;
          });

          setOperationsCount(opsCount);
          setExportsCount(expsCount);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  if (loading || !userData) {
    return (
      <div className="min-h-screen bg-black py-8 px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4 bg-gray-800" />
            <Skeleton className="h-8 w-48 mx-auto mb-2 bg-gray-800" />
            <Skeleton className="h-4 w-32 mx-auto mb-2 bg-gray-800" />
            <Skeleton className="h-6 w-40 mx-auto bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = {
    operaciones: (operationsCount / userData.limiteOperaciones) * 100,
    exportaciones: (exportsCount / userData.limiteExportaciones) * 100
  };

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* 👇 Aquí ya queda igual que tu diseño */}
        <div className="text-center mb-6">
          <div className="w-24 h-24 mx-auto mb-4 relative">
            <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
              {userData.avatar}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Tu Cuenta</h1>
          <p className="text-gray-400">{userData.email}</p>
          <div className="inline-block mt-2 px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-xs font-medium">
            Miembro desde {userData.memberSince}
          </div>
        </div>

        {/* 👇 Aquí se conectan los contadores a Firebase */}
        <Card className="bg-gray-900 border-gray-800 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-600 text-white pb-6">
            <CardTitle className="text-xl font-bold text-center">
              Plan Actual: {userData.plan}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-4 text-white">
                Uso de tu cuenta
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-300">Operaciones</span>
                    <span className="text-gray-400">{operationsCount}/{userData.limiteOperaciones}</span>
                  </div>
                  <Progress value={progressPercentage.operaciones} className="h-2 bg-gray-700" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-300">Exportaciones</span>
                    <span className="text-gray-400">{exportsCount}/{userData.limiteExportaciones}</span>
                  </div>
                  <Progress value={progressPercentage.exportaciones} className="h-2 bg-gray-700" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}