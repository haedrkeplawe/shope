// user
import React, { createContext, useContext, useEffect, useState } from "react";
import { API_URL } from "../config/api";

const AuthContext = createContext(null);

/*
  AuthProvider (زبون)
  - نفس منطق AuthContext بالأدمن بالضبط - بس بيسأل "GET /customers/me"
  - بيوفر: customer، loading، isAuthenticated، refetch، logout
*/
export const AuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const res = await fetch(`${API_URL}/customers/me`, {
        credentials: "include",
      });

      if (!res.ok) {
        setCustomer(null);
        return;
      }

      const data = await res.json();
      setCustomer(data.customer);
    } catch (error) {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const logout = async () => {
    try {
      await fetch(`${API_URL}/customers/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setCustomer(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        customer,
        loading,
        isAuthenticated: !!customer,
        refetch: fetchMe,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
