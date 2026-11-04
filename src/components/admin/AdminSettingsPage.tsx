import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Users, MapPin, Building2, Layers, ShieldCheck, Shield, Database } from "lucide-react";
import PageLayout from "@/src/components/PageLayout";
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
        <div className="flex gap-2 overflow-x-auto -mb-px border-b border-[#d4e8dc]/70 w-full" role="tablist">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            const count = counts[t.id];

            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleTabChange(t.id)}
                className={`group relative shrink-0 inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all outline-none cursor-pointer ${
                  active
                    ? "border-[#145c3f] text-[#145c3f]"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon
                  className={`size-4 shrink-0 ${active ? "text-[#145c3f]" : "text-slate-400 group-hover:text-slate-600"}`}
                />
                <span>{t.label}</span>
                {count !== undefined && (
                  <span
                    className={`inline-flex min-w-[1.25rem] h-4.5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                      active
                        ? "bg-[#e8f5ee] text-[#145c3f]"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      }
    >
      <div className="w-full pt-2">
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
