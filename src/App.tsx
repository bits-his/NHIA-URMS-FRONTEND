import * as React from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { store } from "@/src/store/store";
import type { RootState } from "@/src/store/store";
import { setCredentials, logout } from "@/src/store/authSlice";
import Login from "@/src/components/Login";
import Dashboard from "@/src/components/Dashboard";
import { Toaster } from "@/components/ui/sonner";
import { authApi, tokenStore } from "@/lib/adminApi";
import type { AccessEntry } from "@/src/access/types";
import { getFirstAccessiblePath } from "@/src/access/accessUtils";

/**
 * ─── Inner App Component ──────────────────────────────────────────────────────
 * Executes inside the Redux Provider and Router contexts. Manages session
 * verification on application mount, authenticated state routing, and global
 * toast notifications.
 */
function AppInner() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const token = useSelector((s: RootState) => s.auth.token);
  const [checking, setChecking] = React.useState(true);

  /**
   * Session Initialization Hook
   * Validates existing JWT token against `/api/auth/me` on initial app load.
   * Restores user state and permissions on success, or clears stale tokens on failure.
   */
  React.useEffect(() => {
    const storedToken = tokenStore.get();
    if (!storedToken) { setChecking(false); return; }

    authApi.me()
      .then(res => {
        const u = res.user;
        let funcs = u.functionalities;
        // Parse functionalities JSON string into an array if stored in raw string format
        if (typeof funcs === "string") {
          try { funcs = JSON.parse(funcs); } catch { funcs = []; }
        }
        if (!Array.isArray(funcs)) funcs = [];
        dispatch(setCredentials({ token: storedToken, user: { ...u, functionalities: funcs } }));
      })
      .catch(() => {
        // Clear invalid or expired session token and reset auth state
        tokenStore.clear();
        dispatch(logout());
        navigate("/", { replace: true });
      })
      .finally(() => setChecking(false));
  }, [dispatch, navigate]);

  /**
   * Login Event Handler
   * Dispatches user credentials & privileges to Redux store and calculates
   * the appropriate default landing page based on user role and permissions.
   */
  const handleLogin = (role: string, accessArr: AccessEntry[], userData: any) => {
    dispatch(setCredentials({
      token: tokenStore.get()!,
      user: { ...userData, functionalities: accessArr },
    }));
    const landing = getFirstAccessiblePath(accessArr, role);
    navigate(landing, { replace: true });
  };

  /**
   * Logout Event Handler
   * Flushes local storage session tokens, resets Redux auth state, and redirects to login.
   */
  const handleLogout = () => {
    tokenStore.clear();
    dispatch(logout());
    navigate("/", { replace: true });
  };

  // Render spinner while checking existing session token on application load
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#25a872] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  const isAuthenticated = !!(user && token);

  return (
    <>
      {isAuthenticated ? (
        <Dashboard
          role={user.role as any}
          user={user}
          access={Array.isArray(user.functionalities) ? user.functionalities : []}
          onLogout={handleLogout}
        />
      ) : (
        <Login onLogin={handleLogin} />
      )}
      {/* Toast Notification Provider for UI feedback */}
      <Toaster position="top-right" />
    </>
  );
}

/**
 * ─── Root App Component ───────────────────────────────────────────────────────
 * Main entry component wrapping the application subtree with the Redux Store
 * Provider and Browser Router context.
 */
export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </Provider>
  );
}
