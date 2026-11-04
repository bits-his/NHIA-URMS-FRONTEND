import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Users, MapPin, Building2, Layers, ShieldCheck, Shield, Database } from "lucide-react";
import PageLayout from "@/src/components/PageLayout";
import { cn } from "@/lib/utils";
import { usersApi, rolesApi, zonesApi, statesApi, departmentsApi, unitsApi } from "@/lib/adminApi";
import AdminUsersPage from "./AdminUsersPage";
import AdminRolesPage from "./AdminRolesPage";
import AdminZonesPage from "./AdminZonesPage";
import AdminStatesPage from "./AdminStatesPage";
import AdminDepartmentsPage from "./AdminDepartmentsPage";
import AdminUnitsPage from "./AdminUnitsPage";
import AdminPrivilegesPage from "./AdminPrivilegesPage";

type Tab = "users" | "roles" | "privileges" | "zones" | "states" | "departments" | "units";

interface TabMeta {
  id: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabMeta[] = [
  { id: "users",       label: "Staff Directory",   icon: Users       },
  { id: "roles",       label: "Roles",             icon: Shield      },
  { id: "privileges",  label: "Privileges",        icon: ShieldCheck },
  { id: "zones",       label: "Zonal Offices",     icon: MapPin      },
  { id: "states",      label: "State Offices",     icon: Building2   },
  { id: "departments", label: "HQ Departments",    icon: Layers      },
  { id: "units",       label: "Operational Units", icon: Database    },
];

export default function AdminSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const initialTab = tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "users";
  const [tab, setTab] = React.useState<Tab>(initialTab);
  const [counts, setCounts] = React.useState<Partial<Record<Tab, number>>>({});

  React.useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setTab(tabParam);
    }
  }, [tabParam]);

  React.useEffect(() => {
    Promise.allSettled([
      usersApi.list({ limit: 1 }),
      rolesApi.list(),
      zonesApi.list(),
      statesApi.list(),
      departmentsApi.list(),
      unitsApi.list(),
    ]).then(([u, r, z, s, d, un]) => {
      setCounts({
        users: u.status === "fulfilled" ? u.value.total : undefined,
        roles: r.status === "fulfilled" ? r.value.data.length : undefined,
        zones: z.status === "fulfilled" ? z.value.data.length : undefined,
        states: s.status === "fulfilled" ? s.value.data.length : undefined,
        departments: d.status === "fulfilled" ? d.value.data.length : undefined,
        units: un.status === "fulfilled" ? un.value.data.length : undefined,
      });
    });
  }, []);

  const handleTabChange = (nextTab: Tab) => {
    setTab(nextTab);
    setSearchParams({ tab: nextTab });
  };

  return (
    <PageLayout
      title="Staff Management"
      description="Administer user credentials, access privileges, geopolitical zones, and organizational directories."
      maxWidth="full"
      filters={
        <div className="w-full flex items-center justify-between overflow-x-auto pb-0.5 scrollbar-none">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100/90 border border-[#d4e8dc]/90 rounded-xl overflow-x-auto max-w-full scrollbar-none shadow-2xs">
            {TABS.map((t) => {
              const active = tab === t.id;
              const Icon = t.icon;
              const count = counts[t.id];
              return (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  className={cn(
                    "group relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer select-none",
                    active
                      ? "bg-white text-[#145c3f] font-bold shadow-2xs border border-[#d4e8dc]/80"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0 transition-colors",
                      active ? "text-[#145c3f]" : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  <span>{t.label}</span>
                  {count !== undefined && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-semibold tabular-nums leading-none",
                        active
                          ? "bg-[#e8f5ee] text-[#145c3f] border border-[#d4e8dc]"
                          : "bg-slate-200/70 text-slate-600 group-hover:bg-slate-200"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      }
    >
      <div className="w-full pt-1">
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
