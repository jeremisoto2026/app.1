import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import PrivateRoute from './components/auth/PrivateRoute';
import Header from './components/layout/Header';
import FooterNav from './components/layout/FooterNav';
import Dashboard from './components/dashboard/Dashboard';
import OperationList from './components/operations/OperationList';
import OperationForm from './components/operations/OperationForm';
import SubscriptionPanel from './components/subscription/SubscriptionPanel';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-900 text-white">
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route path="/*" element={
                <>
                  <Header />
                  <main className="pb-20">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/operations" element={<OperationList />} />
                      <Route path="/new" element={<OperationForm />} />
                      <Route path="/subscription" element={<SubscriptionPanel />} />
                    </Routes>
                  </main>
                  <FooterNav />
                </>
              } />
            </Route>
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;