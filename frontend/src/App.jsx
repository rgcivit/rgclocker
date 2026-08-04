import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LockerProvider } from './context/LockerContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LockerView from './pages/LockerView';

/**
 * Route protection for authenticated user sessions (Level 1 Security)
 */
function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Sincronizando Bóveda...</span>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Route block for already-logged-in users (e.g. don't show login if active)
 */
function PublicRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LockerProvider>
          <Routes>
            {/* Public Entry Point / Login */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />

            {/* Authenticated Dashboard (Level 1 Vault index) */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />

            {/* Locker Internal View (Requires Level 2 validation) */}
            <Route 
              path="/locker/:lockerId" 
              element={
                <ProtectedRoute>
                  <LockerView />
                </ProtectedRoute>
              } 
            />

            {/* Wildcard redirects */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </LockerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
