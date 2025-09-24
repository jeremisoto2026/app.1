// Dashboard.js - VERSIÓN DE EMERGENCIA
import React from 'react';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-yellow-400 mb-4">
          JJXCAPITAL⚡
        </h1>
        <div className="bg-gray-800 p-6 rounded-lg max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4">Dashboard de Trading</h2>
          <p className="text-gray-300 mb-4">
            Plataforma premium en desarrollo
          </p>
          <button 
            onClick={() => alert('Funcionalidad en desarrollo')}
            className="bg-yellow-500 text-black px-4 py-2 rounded font-medium"
          >
            Conectar Binance P2P
          </button>
        </div>
        <div className="mt-8 text-gray-500">
          <p>app-1-nu-five.vercel.app</p>
          <p>© 2025 JJXCAPITAL⚡</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;