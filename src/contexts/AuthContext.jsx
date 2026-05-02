import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch, setToken, clearToken, getToken } from "../api/config";

const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setCurrentUser(null);
    return Promise.resolve();
  }, []);

  const checkTokenAndSetup = useCallback(() => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        const expirationTime = payload.exp * 1000;
        const timeToLive = expirationTime - Date.now();

        if (timeToLive > 0) {
          setCurrentUser({
            email: payload.email,
            uid: String(payload.sub),
            createdAt: payload.created_at
          });
          // Auto logout when token expires
          const timeoutId = setTimeout(() => {
            console.log("Token expired, logging out...");
            logout();
          }, timeToLive);
          return () => clearTimeout(timeoutId);
        } else {
          logout();
        }
      } catch {
        logout();
      }
    } else {
      setCurrentUser(null);
    }
  }, [logout]);

  useEffect(() => {
    const cleanup = checkTokenAndSetup();
    setLoading(false);
    return () => {
      if (cleanup) cleanup();
    };
  }, [checkTokenAndSetup]);

  // Handle API unauthorized errors globally via event listener
  useEffect(() => {
    const handleUnauthorized = () => {
      console.log("Unauthorized request, logging out...");
      logout();
    };
    window.addEventListener("unauthorized_api_call", handleUnauthorized);
    return () => window.removeEventListener("unauthorized_api_call", handleUnauthorized);
  }, [logout]);

  // Idle timeout management
  useEffect(() => {
    let idleTimeoutId;

    const resetIdleTimeout = () => {
      if (idleTimeoutId) clearTimeout(idleTimeoutId);
      if (currentUser) {
        idleTimeoutId = setTimeout(() => {
          console.log("Session inactive, logging out...");
          logout();
        }, SESSION_TIMEOUT_MS);
      }
    };

    const events = ["mousemove", "keydown", "click", "scroll"];
    
    if (currentUser) {
      resetIdleTimeout();
      events.forEach(e => window.addEventListener(e, resetIdleTimeout));
    }

    return () => {
      if (idleTimeoutId) clearTimeout(idleTimeoutId);
      events.forEach(e => window.removeEventListener(e, resetIdleTimeout));
    };
  }, [currentUser, logout]);

  async function login(email, password) {
    const res = await apiFetch("/login.php", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
    checkTokenAndSetup();
    return res;
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
