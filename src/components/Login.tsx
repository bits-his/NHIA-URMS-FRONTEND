import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, User, Lock, AlertCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, tokenStore } from "@/lib/adminApi";
import type { AccessEntry } from "@/src/access/types";
import { NhiaCrest } from "@/src/components/NhiaCrest";

const ROLE_LABELS: Record<string, string> = {
  admin: "System Administrator",
  sdo: "State Development Office",
  "hq-department": "Headquarters Department",
  "zonal-coordinator": "Zonal Coordinator",
  "state-coordinator": "State Coordinator",
  "department-officer": "Department Officer",
  "state-officer": "State Officer",
  "dg-ceo": "Director-General / CEO",
};

interface LoginProps {
  onLogin: (role: string, access: AccessEntry[], userData: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [staffId, setStaffId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [role, setRole] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const id = staffId.toUpperCase();
    if (id.startsWith("ADMIN")) setRole("admin");
    else if (id.startsWith("HQ")) setRole("hq-department");
    else if (id.startsWith("SDO")) setRole("sdo");
    else if (id.startsWith("ZC")) setRole("zonal-coordinator");
    else if (id.startsWith("SC")) setRole("state-coordinator");
    else if (id.startsWith("DO")) setRole("department-officer");
    else if (id.startsWith("SO")) setRole("state-officer");
    else if (id.startsWith("DG")) setRole("dg-ceo");
    else setRole("");
  }, [staffId]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await authApi.login(staffId, password);
      tokenStore.set(res.token);
      toast.success("Authentication successful", { description: `Welcome, ${res.user.name}.` });
      const accessArr = Array.isArray(res.user.functionalities) ? res.user.functionalities : [];
      onLogin(res.user.role, accessArr, res.user);
    } catch (err: any) {
      setError(err.message ?? "Sign in failed.");
      toast.error("Sign in failed");
    } finally {
      setIsLoading(false);
    }
  };

  const recognisedOffice = ROLE_LABELS[role];

  return (
    <div className="flex min-h-dvh w-full overflow-x-hidden bg-[#f4f7f5]">
      <div className="relative hidden overflow-hidden sidebar-gradient lg:flex lg:w-[46%] lg:flex-col lg:items-center lg:justify-center lg:px-14 lg:py-12">
        <div className="absolute top-[-18%] left-[-18%] h-[52%] w-[52%] rounded-full bg-[#25a872]/12 blur-3xl" />
        <div className="absolute right-[-12%] bottom-[-12%] h-[42%] w-[42%] rounded-full bg-[#25a872]/15 blur-3xl" />

        <div className="relative z-10 flex max-w-[22rem] flex-col items-center text-center">
          <NhiaCrest size="lg" />
          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6ddba8]">
            National Health Insurance Authority
          </p>
          <h1 className="mt-2 text-[1.7rem] font-black leading-[1.15] text-white">
            Unit Reporting
            <br />
            Management System
          </h1>
          <div className="mt-5 h-px w-16 rounded-full bg-[#25a872]/50" />
          <p className="mt-5 text-sm leading-relaxed text-white/55">
            Secure staff access for state, zonal and headquarters reporting.
          </p>
        </div>

        <p className="absolute bottom-7 text-[10px] font-medium uppercase tracking-[0.18em] text-white/30">
          Federal Republic of Nigeria
        </p>
      </div>

      <div className="relative flex min-w-0 flex-1 items-center justify-center p-4 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-40" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full min-w-0 max-w-[420px]"
        >
          <div className="mb-6 flex flex-col items-center lg:hidden">
            <NhiaCrest size="sm" />
            <p className="mt-3 text-center text-sm font-semibold text-[#145c3f]">NHIA URMS</p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[#d4e8dc] bg-white shadow-xl shadow-[#145c3f]/8">
            <div className="h-1.5 bg-gradient-to-r from-[#145c3f] via-[#1a7a52] to-[#25a872]" />
            <div className="p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-black tracking-tight text-slate-900">Sign in</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter your NHIA staff ID and password to continue.
                </p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="staff-id" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Staff ID
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="staff-id"
                      name="staff_id"
                      value={staffId}
                      onChange={(e) => setStaffId(e.target.value)}
                      placeholder="e.g. HQ-123, SDO-456"
                      autoComplete="username"
                      required
                      aria-invalid={Boolean(error)}
                      className="pl-10"
                    />
                  </div>
                  {recognisedOffice && (
                    <p className="rounded-lg bg-[#e8f5ee] px-2.5 py-1 text-xs font-medium text-[#145c3f]">
                      {recognisedOffice}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      aria-invalid={Boolean(error)}
                      className="pr-11 pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute top-1/2 right-3 z-10 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#145c3f]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3"
                      role="alert"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                      <p className="text-xs font-medium text-rose-600">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button type="submit" disabled={isLoading} className="mt-1 h-11 w-full rounded-xl">
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Authenticating...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>

              <div className="mt-6 flex items-start gap-2 border-t border-[#d4e8dc] pt-5">
                <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <p className="min-w-0 text-[10px] leading-relaxed text-slate-400">
                  Secure government system. Unauthorised access is strictly prohibited.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
