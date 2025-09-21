// src/components/Dashboard.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

// Iconos de Heroicons
import {
  RocketLaunchIcon,
  ChartBarIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

export default function Dashboard() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [operationCount, setOperationCount] = useState(0);

  const defaultUsage = {
    operaciones: { usadas: 0, total: 200 },
    exportaciones: { usadas: 0, total: 40 },
  };

  useEffect(() => {
    let cancelled = false;

    const fetchProfileAndUsage = async () => {
      setLoading(true);
      try {
        if (!user) {
          setProfileData(null);
          setOperationCount(0);
          setLoading(false);
          return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        let data = null;
        if (userSnap.exists()) {
          data = userSnap.data();
        } else {
          data = {
            nombre: user.displayName ? user.displayName.split(" ")[0] : "",
            apellido: user.displayName
              ? user.displayName.split(" ").slice(1).join(" ")
              : "",
            email: user.email,
            photoURL: user.photoURL || "",
            plan: "free",
            usage: defaultUsage,
            createdAt: null,
          };
        }

        if (!cancelled) {
          setProfileData(data);
        }

        const opsColRef = collection(db, "users", user.uid, "operations");
        const opsSnap = await getDocs(opsColRef);
        const opsCount = opsSnap.size || 0;
        if (!cancelled) setOperationCount(opsCount);

        if (!data.usage) {
          data.usage = {
            operaciones: { usadas: opsCount, total: defaultUsage.operaciones.total },
            exportaciones: defaultUsage.exportaciones,
          };
        } else {
          if (!data.usage.operaciones || data.usage.operaciones.usadas === undefined) {
            data.usage = {
              ...(data.usage || {}),
              operaciones: {
                usadas: opsCount,
                total: data.usage?.operaciones?.total || defaultUsage.operaciones.total,
              },
            };
          }
        }

        if (!cancelled) setProfileData(data);
      } catch (err) {
        console.error("Error fetching dashboard/usage:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfileAndUsage();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        No se encontraron datos del dashboard.
      </div>
    );
  }

  const usage = profileData.usage || defaultUsage;
  const operacionesUsadas = operationCount ?? usage.operaciones?.usadas || 0;
  let operacionesTotal = usage.operaciones?.total || defaultUsage.operaciones.total;
  let exportacionesUsadas = usage.exportaciones?.usadas || defaultUsage.exportaciones.usadas;
  let exportacionesTotal = usage.exportaciones?.total || defaultUsage.exportaciones.total;

  if (profileData.plan?.toLowerCase() === "premium") {
    operacionesTotal = Infinity;
    exportacionesTotal = Infinity;
  }

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ---------- Columna izquierda: Uso ---------- */}
        <div className="lg:col-span-2 space-y-8">
          {/* ---- Tarjeta Uso ---- */}
          <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-indigo-400" />
              Uso de tu cuenta
            </h3>

            <div className="space-y-6">
              {/* Operaciones */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Operaciones</span>
                  <span className="text-gray-400">
                    {operacionesUsadas}/{operacionesTotal === Infinity ? "∞" : operacionesTotal}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all"
                    style={{
                      width:
                        operacionesTotal === Infinity
                          ? "100%"
                          : `${Math.min((operacionesUsadas / operacionesTotal) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Exportaciones */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Exportaciones</span>
                  <span className="text-gray-400">
                    {exportacionesUsadas}/{exportacionesTotal === Infinity ? "∞" : exportacionesTotal}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2.5">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all"
                    style={{
                      width:
                        exportacionesTotal === Infinity
                          ? "100%"
                          : `${Math.min((exportacionesUsadas / exportacionesTotal) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Columna derecha: Planes Premium ---------- */}
        <div className="space-y-8">
          {/* ---- Card Plan Premium Mensual ---- */}
          <div className="bg-gray-900 rounded-xl p-6 shadow-lg cursor-pointer hover:ring-2 hover:ring-indigo-500 transition"
            onClick={() => window.location.href = "/profile"}>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <RocketLaunchIcon className="h-5 w-5 mr-2 text-purple-400" />
                <h3 className="text-lg font-semibold">Plan Premium</h3>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white">$13 <span className="text-sm text-gray-400">/mes</span></p>
              </div>
            </div>

            <div className="mb-4 text-sm text-gray-300">
              <ul className="space-y-2">
                <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />Operaciones ilimitadas</li>
                <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />Exportaciones ilimitadas</li>
                <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />Soporte prioritario</li>
              </ul>
            </div>
          </div>

          {/* ---- Card Plan Premium Anual ---- */}
          <div className="bg-gray-900 rounded-xl p-6 shadow-lg cursor-pointer hover:ring-2 hover:ring-indigo-500 transition"
            onClick={() => window.location.href = "/profile"}>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <RocketLaunchIcon className="h-5 w-5 mr-2 text-purple-400" />
                <h3 className="text-lg font-semibold">Plan Premium Anual</h3>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white line-through">$160</p>
                <p className="text-lg font-bold text-green-400">$125 <span className="text-sm text-gray-400">/año</span></p>
                <p className="text-xs text-green-400 font-semibold">Ahorra ~20%</p>
              </div>
            </div>

            <div className="mb-4 text-sm text-gray-300">
              <ul className="space-y-2">
                <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />Operaciones ilimitadas</li>
                <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />Exportaciones ilimitadas</li>
                <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />Soporte prioritario</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}