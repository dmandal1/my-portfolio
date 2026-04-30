import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, setToken, clearToken, getToken } from "../api/config";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage on mount
    const token = getToken();
    if (token) {
      // Decode payload from JWT (no signature verification — server does that)
      try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          setCurrentUser({ email: payload.email, uid: String(payload.sub) });
        } else {
          clearToken();
        }
      } catch {
        clearToken();
      }
    }
    setLoading(false);
  }, []);

  async function login(email, password) {
    const res = await apiFetch("/login.php", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
    setCurrentUser({ email: res.email, uid: String(res.email) });
    return res;
  }

  function logout() {
    clearToken();
    setCurrentUser(null);
    return Promise.resolve();
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
