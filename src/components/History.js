// src/components/History.js
import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

const History = () => {
  const { user } = useAuth();
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    console.log("👤 Usuario logueado:", user.uid);

    const q = query(
      collection(db, "users", user.uid, "operations"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("📊 Operaciones recibidas:", data);
        setOperations(data);
        setLoading(false);
      },
      (error) => {
        console.error("❌ Error cargando historial:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (loading) return <p className="text-white">Cargando historial...</p>;

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl font-bold mb-4">Historial (DEBUG)</h2>
      {operations.length === 0 ? (
        <p>No hay operaciones registradas.</p>
      ) : (
        <ul className="space-y-2">
          {operations.map((op) => (
            <li key={op.id} className="border p-2 rounded">
              <p><strong>ID:</strong> {op.id}</p>
              <p><strong>Crypto:</strong> {op.crypto || "N/A"}</p>
              <p><strong>Fiat:</strong> {op.fiat || "N/A"}</p>
              <p><strong>Exchange:</strong> {op.exchange || "N/A"}</p>
              <p><strong>Revenue:</strong> {op.revenue || 0}</p>
              <p><strong>Investment:</strong> {op.investment || 0}</p>
              <p><strong>Timestamp:</strong> {JSON.stringify(op.timestamp)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default History;