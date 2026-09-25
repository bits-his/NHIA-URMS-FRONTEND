import * as React from "react";
import { Users, MapPin, Building2, Layers, ShieldCheck, Shield } from "lucide-react";
import AdminUsersPage from "./AdminUsersPage";
import AdminRolesPage from "./AdminRolesPage";
import AdminZonesPage from "./AdminZonesPage";
import AdminStatesPage from "./AdminStatesPage";
import AdminDepartmentsPage from "./AdminDepartmentsPage";
import AdminUnitsPage from "./AdminUnitsPage";
import AdminPrivilegesPage from "./AdminPrivilegesPage";

type Tab = "users" | "roles" | "zones" | "states" | "departments" | "units" | "privileges";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "users",       label: "Users",         icon: <Users className="w-3.5 h-3.5" />       },
  { id: "roles",       label: "Roles",         icon: <Shield className="w-3.5 h-3.5" />      },
  { id: "privileges",  label: "Privileges",    icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { id: "zones",       label: "Zonal Offices", icon: <MapPin className="w-3.5 h-3.5" />      },
  { id: "states",      label: "State Offices", icon: <Building2 className="w-3.5 h-3.5" />   },
  { id: "departments", label: "Departments",   icon: <Layers className="w-3.5 h-3.5" />      },
  { id: "units",       label: "Units",         icon: <Layers className="w-3.5 h-3.5" />      },
];

export default function AdminSettingsPage() {
  const [tab, setTab] = React.useState<Tab>("users");

  return (
    <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Staff Management</h1>
      </div>

      <div className="flex items-center gap-1 bg-white border border-[#d4e8dc] rounded-2xl p-1.5 w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === t.id
                ? "bg-[#145c3f] text-white shadow-md shadow-[#145c3f]/20"
                : "text-slate-500 hover:bg-[#e8f5ee] hover:text-[#145c3f]"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "users"       && <AdminUsersPage />}
        {tab === "roles"       && <AdminRolesPage />}
        {tab === "privileges"  && <AdminPrivilegesPage />}
        {tab === "zones"       && <AdminZonesPage />}
        {tab === "states"      && <AdminStatesPage />}
        {tab === "departments" && <AdminDepartmentsPage />}
        {tab === "units"       && <AdminUnitsPage />}
      </div>
    </div>
  );
}
