import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch, setToken, clearToken, getToken } from "../api/config";
import { getCurrentUser, verify2FALogin } from "../api/apiService";

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

  const updateUser = useCallback((newData) => {
    setCurrentUser(prev => prev ? { ...prev, ...newData } : null);
  }, []);

  const checkTokenAndSetup = useCallback(async () => {
    // Skip token check if we are on the installation page to avoid 500/503 errors
    if (window.location.hash.includes("/install")) {
      setLoading(false);
      return;
    }

    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        const expirationTime = payload.exp * 1000;
        const timeToLive = expirationTime - Date.now();

        if (timeToLive > 0) {
          // Fetch full user data from backend (including profile image)
          try {
            const fullUser = await getCurrentUser();
            setCurrentUser({
              email: fullUser.email,
              uid: String(fullUser.id),
              createdAt: fullUser.created_at,
              profileImage: fullUser.profile_image,
              twoFactorEnabled: fullUser.two_factor_enabled,
              display_name: fullUser.display_name,
              bio: fullUser.bio,
              social_links: fullUser.social_links
            });
          } catch (err) {
            // Silence common initialization errors during site setup (500/503)
            if (!err.message?.includes("500") && !err.message?.includes("503")) {
              console.error("Failed to fetch full user profile:", err);
            }
            // Fallback to JWT payload
            setCurrentUser({
              email: payload.email,
              uid: String(payload.sub),
              createdAt: payload.created_at
            });
          }

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
    const initAuth = async () => {
      const cleanup = await checkTokenAndSetup();
      setLoading(false);
      return cleanup;
    };
    const cleanupPromise = initAuth();
    return () => {
      cleanupPromise.then(cleanup => { if (cleanup) cleanup(); });
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
    
    if (res.requires_2fa) {
      setToken(res.temp_token);
      return res;
    }
    
    setToken(res.token);
    await checkTokenAndSetup();
    return res;
  }

  async function verify2FA(code) {
    const res = await verify2FALogin(code);
    setToken(res.token);
    await checkTokenAndSetup();
    return res;
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, updateUser, verify2FA }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
