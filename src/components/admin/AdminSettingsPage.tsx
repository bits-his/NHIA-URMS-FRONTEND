import * as React from "react";
import { Users, MapPin, Building2, Layers, ShieldCheck, Shield } from "lucide-react";
import PageLayout from "@/src/components/PageLayout";
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
    <PageLayout
      title="Staff Management"
      maxWidth="7xl"
      filters={
        <div className="flex items-center gap-1.5 p-1 w-full flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tab === t.id
                  ? "bg-[#145c3f] text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="w-full">
        {tab === "users"       && <AdminUsersPage />}
        {tab === "roles"       && <AdminRolesPage />}
        {tab === "privileges"  && <AdminPrivilegesPage />}
        {tab === "zones"       && <AdminZonesPage />}
        {tab === "states"      && <AdminStatesPage />}
        {tab === "departments" && <AdminDepartmentsPage />}
        {tab === "units"       && <AdminUnitsPage />}
      </div>
    </PageLayout>
  );
}
