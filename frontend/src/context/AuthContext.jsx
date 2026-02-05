import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Helper to set session from backend response
  const handleBackendSession = async (session) => {
    const { error } = await supabase.auth.setSession(session);
    if (error) throw error;
    // User state update handled by onAuthStateChange listener
  };

  const loginUser = async (mobile, password) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    await handleBackendSession(data.session);
    return data;
  };

  const signupUser = async (mobile, password) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/user/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    await handleBackendSession(data.session);
    return data;
  };
  
  const loginPartner = async (partnerId, password) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/partner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    await handleBackendSession(data.session);
    return data;
  };

  const value = {
    loginUser,
    signupUser,
    loginPartner,
    signOut: () => supabase.auth.signOut(),
    user,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
