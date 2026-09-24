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

// ─── Inner app — has access to Redux store ────────────────────────────────────
function AppInner() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const user       = useSelector((s: RootState) => s.auth.user);
  const token      = useSelector((s: RootState) => s.auth.token);
  const [checking, setChecking] = React.useState(true);

  // On mount: if token exists in storage, verify it with /api/auth/me
  React.useEffect(() => {
    const storedToken = tokenStore.get();
    if (!storedToken) { setChecking(false); return; }

    authApi.me()
      .then(res => {
        const u = res.user;
        let funcs = u.functionalities;
        if (typeof funcs === "string") {
          try { funcs = JSON.parse(funcs); } catch { funcs = []; }
        }
        if (!Array.isArray(funcs)) funcs = [];
        dispatch(setCredentials({ token: storedToken, user: { ...u, functionalities: funcs } }));
      })
      .catch(() => {
        tokenStore.clear();
        dispatch(logout());
        navigate("/", { replace: true });
      })
      .finally(() => setChecking(false));
  }, [dispatch, navigate]);

  const handleLogin = (role: string, accessArr: AccessEntry[], userData: any) => {
    dispatch(setCredentials({
      token: tokenStore.get()!,
      user: { ...userData, functionalities: accessArr },
    }));
    const landing = getFirstAccessiblePath(accessArr, role);
    navigate(landing, { replace: true });
  };

  const handleLogout = () => {
    tokenStore.clear();
    dispatch(logout());
    navigate("/", { replace: true });
  };

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
      <Toaster position="top-right" />
    </>
  );
}

// ─── Root — wraps with Redux Provider & BrowserRouter ───────────────────────
export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </Provider>
  );
}
