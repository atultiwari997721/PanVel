import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';

const PrivateRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    
    return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/driver" element={
            <PrivateRoute>
              <DriverDashboard />
            </PrivateRoute>
          } />
          <Route path="/admin" element={
              <AdminDashboard />
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
