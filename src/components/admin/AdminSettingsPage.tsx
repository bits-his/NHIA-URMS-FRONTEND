import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Users, MapPin, Building2, Layers, ShieldCheck, Shield, Database } from "lucide-react";
import PageLayout from "@/src/components/PageLayout";
import { UnderHeaderNavTabs } from "@/src/components/UnderHeaderNavTabs";
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
  { id: "users",       label: "Staff",         icon: Users       },
  { id: "roles",       label: "Roles",         icon: Shield      },
  { id: "privileges",  label: "Privileges",    icon: ShieldCheck },
  { id: "zones",       label: "Zonal Offices", icon: MapPin      },
  { id: "states",      label: "State Offices", icon: Building2   },
  { id: "departments", label: "Departments",   icon: Layers      },
  { id: "units",       label: "Units",         icon: Database    },
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
      maxWidth="full"
      tabs={
        <UnderHeaderNavTabs
          tabs={TABS.map((t) => ({
            id: t.id,
            label: t.label,
            icon: t.icon,
            count: counts[t.id],
          }))}
          activeTab={tab}
          onChange={handleTabChange}
          ariaLabel="Staff management modules"
        />
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
