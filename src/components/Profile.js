import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Separator } from "@radix-ui/react-separator";
import { getAuth } from "firebase/auth";
import { getDoc, doc, collection, getDocs } from "firebase/firestore";
import { db } from "../services/database";

export default function Profile() {
  const [userData, setUserData] = useState({
    plan: "Free",
    operaciones: 0,
    limiteOperaciones: 200,
    exportaciones: 2,
    limiteExportaciones: 40,
    email: "",
    nombre: "",
    apellido: "",
    memberSince: "",
    photoURL: "",
  });

  useEffect(() => {
    const fetchUserData = async () => {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let userInfo = {};
        if (userSnap.exists()) {
          userInfo = userSnap.data();
        }

        // contar operaciones
        const operationsRef = collection(db, "operations");
        const operationsSnap = await getDocs(operationsRef);
        const totalOps = operationsSnap.size;

        setUserData((prev) => ({
          ...prev,
          email: user.email || "",
          nombre: userInfo.nombre || "",
          apellido: userInfo.apellido || "",
          memberSince: userInfo.memberSince || "",
          plan: userInfo.plan || "Free",
          photoURL: user.photoURL || "",
          operaciones: totalOps,
        }));
      }
    };

    fetchUserData();
  }, []);

  const progressPercentage = {
    operaciones: (userData.operaciones / userData.limiteOperaciones) * 100,
    exportaciones: (userData.exportaciones / userData.limiteExportaciones) * 100,
  };

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header con avatar e información */}
        <div className="text-center mb-6">
          <div className="w-24 h-24 mx-auto mb-4 relative">
            {userData.photoURL ? (
              <img
                src={userData.photoURL}
                alt="avatar"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                {userData.email ? userData.email.charAt(0).toUpperCase() : "U"}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">
            {userData.nombre} {userData.apellido}
          </h1>
          <p className="text-gray-400">{userData.email}</p>
          <div className="inline-block mt-2 px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-xs font-medium">
            Miembro desde {userData.memberSince || "—"}
          </div>
        </div>

        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden bg-gray-900">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white pb-6">
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Plan Actual: {userData.plan}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Uso de cuenta */}
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Uso de tu cuenta
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-300">
                      Operaciones
                    </span>
                    <span className="text-gray-400">
                      {userData.operaciones}/{userData.limiteOperaciones}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div
                      className="bg-blue-500 h-2.5 rounded-full"
                      style={{ width: `${progressPercentage.operaciones}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-300">
                      Exportaciones
                    </span>
                    <span className="text-gray-400">
                      {userData.exportaciones}/{userData.limiteExportaciones}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div
                      className="bg-green-500 h-2.5 rounded-full"
                      style={{ width: `${progressPercentage.exportaciones}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <Button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md">
                Actualizar tus Límites
              </Button>
            </div>

            <Separator className="my-4 bg-gray-700 h-px" />

            {/* Plan Premium */}
            <div className="bg-gradient-to-br from-indigo-900/30 to-blue-900/30 p-4 rounded-xl border border-blue-800/30">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-yellow-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Plan Premium
              </h3>
              <p className="text-sm mb-4 text-gray-300">
                Obtén{" "}
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  todo ilimitado
                </span>{" "}
                por solo
              </p>

              <div className="flex items-baseline justify-center mb-4">
                <span className="text-3xl font-bold text-white">$13</span>
                <span className="text-gray-400">/mes</span>
              </div>

              <ul className="text-sm text-gray-300 mb-4 space-y-1">
                <li className="flex items-center gap-2">
                  ✅ Operaciones ilimitadas
                </li>
                <li className="flex items-center gap-2">
                  ✅ Exportaciones ilimitadas
                </li>
                <li className="flex items-center gap-2">✅ Soporte prioritario</li>
              </ul>

              <div className="flex flex-col gap-3">
                <Button className="bg-gradient-to-r from-[#0070ba] to-[#005c99] text-white shadow-md">
                  Pagar con PayPal
                </Button>
                <Button className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-md">
                  Binance Pay
                </Button>
                <Button className="bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-md">
                  Blockchain Pay
                </Button>
              </div>
            </div>

            <Separator className="my-4 bg-gray-700 h-px" />

            {/* Soporte */}
            <div>
              <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                  />
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