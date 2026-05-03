import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./AdminTransition.css";

export default function AdminTransition({ children }) {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const prevPathRef = useRef(location.pathname + location.search);
  const isFirstMount = useRef(true);

  useEffect(() => {
    const isLogin = location.pathname === "/admin/login";
    const isAdmin = location.pathname.startsWith("/admin");

    // We watch both path and search params so internal tabs (like ?tab=skills) 
    // also trigger the "Synchronizing" transition.
    const currentFullId = location.pathname + location.search;

    if (isAdmin && !isLogin) {
      if (isFirstMount.current) {
        isFirstMount.current = false;
        prevPathRef.current = currentFullId;
        return;
      }

      // Special Case: If we just came from the login page, skip the transition
      // so the dashboard appears instantly after login.
      const wasLogin = prevPathRef.current?.startsWith("/admin/login");

      if (currentFullId !== prevPathRef.current) {
        const oldId = prevPathRef.current;
        prevPathRef.current = currentFullId;

        if (wasLogin) {
          setLoading(false);
          return;
        }

        setLoading(true);
        
        // Phase 1: Artificial Progress (100ms delay to start)
        // Phase 2: Complete Progress (After 600ms)
        // Phase 3: Reveal Page (After 900ms)
        const timer1 = setTimeout(() => {
          // Progress bar will move to 100% via CSS transition when we stop loading,
          // but we want to wait for it to actually reach the end.
          const timer2 = setTimeout(() => {
            setLoading(false);
          }, 400); // Wait for the "Complete" animation
          
          return () => clearTimeout(timer2);
        }, 800);
        
        return () => clearTimeout(timer1);
      }
    } else {
      setLoading(false);
      prevPathRef.current = currentFullId;
    }
  }, [location.pathname, location.search]);

  return (
    <React.Fragment>
      {/* 1. Cinematic Progress Bar (Top) */}
      <div className={`admin-progress-bar ${loading ? "is-loading" : "is-idle"}`} />
      
      {/* 2. Premium Transition Overlay */}
      <div className={`admin-transition-overlay ${loading ? "is-active" : "is-hidden"}`}>
        <div className="admin-transition-content">
          <div className="admin-transition-icon">
            <i className="fas fa-sync-alt fa-spin" />
          </div>
          <h2 className="admin-transition-title">Synchronizing...</h2>
          <p className="admin-transition-sub">Updating your workspace</p>
          <div className="admin-transition-loader">
            <div className="admin-transition-loader-fill" />
          </div>
        </div>
      </div>

      {/* 
          The content wrapper applies a strong blur filter when loading is true.
          This ensures page details are fully hidden behind the premium overlay.
      */}
      <div className={`admin-transition-body ${loading ? "is-blurring" : ""}`}>
        {children}
      </div>
    </React.Fragment>
  );
}
