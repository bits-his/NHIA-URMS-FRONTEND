import * as React from "react";
import { Search, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomTable, { type CustomTableField } from "@/components/CustomTable";
import { usersApi, type AdminUser } from "@/lib/adminApi";
import AdminModal from "./AdminModal";
import ModuleAccessPicker from "./ModuleAccessPicker";
import { moduleConfigForAccess, resolveModuleTitle } from "@/src/access/moduleConfig";
import { normalizeFunctionalityTitle, normalizeModuleTitle } from "@/src/access/accessUtils";
import {
  buildAccessPayload,
  countGrantedParents,
  selectAllPrivilegeKeys,
} from "@/src/access/privilegeTree";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  "state-officer": "State Officer",
  "zonal-coordinator": "Zonal Coordinator",
  "state-coordinator": "State Coordinator",
  "department-officer": "Department Officer",
  "sdo": "SDO",
  "hq-department": "HQ Department",
  "dg-ceo": "DG-CEO",
  "admin": "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  "admin": "bg-purple-50 text-purple-700 border-purple-200",
  "dg-ceo": "bg-rose-50 text-rose-700 border-rose-200",
  "zonal-coordinator": "bg-blue-50 text-blue-700 border-blue-200",
  "state-coordinator": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "department-officer": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "hq-department": "bg-amber-50 text-amber-700 border-amber-200",
  "sdo": "bg-[#e8f5ee] text-[#145c3f] border-[#d4e8dc]",
  "state-officer": "bg-teal-50 text-teal-700 border-teal-200",
};

export default function AdminPrivilegesPage() {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<AdminUser | null>(null);
  const [granted, setGranted] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await usersApi.list({ limit: 500, search: search.trim() || undefined });
      setUsers(r.data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, [search]);

  const openPrivileges = (u: AdminUser) => {
    setSelected(u);
    const keys = new Set<string>();
    const accessArr = Array.isArray(u.functionalities) ? u.functionalities : [];
    accessArr.forEach((entry: any) => {
      if (!entry?.access_to) return;
      const modTitle = normalizeModuleTitle(entry.access_to);
      keys.add(modTitle);
      if (Array.isArray(entry.functionalities)) {
        entry.functionalities.forEach((funcTitle: string) => {
          keys.add(normalizeFunctionalityTitle(funcTitle, modTitle));
        });
      }
    });
    setGranted(keys);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const access = buildAccessPayload(granted);
      await usersApi.updatePrivileges(selected.id, access);
      toast.success("Privileges updated successfully");
      setSelected(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const fields: CustomTableField[] = React.useMemo(() => [
    {
      title: "Staff Member",
      value: "name",
      className: "w-[24%] text-left",
      custom: true,
      component: (u: AdminUser) => (
        <div className="min-w-0 truncate">
          <p className="font-semibold text-slate-900 text-xs truncate">{u.name}</p>
          <p className="font-mono text-[10px] text-slate-400 mt-0.5">{u.staff_id || "No ID"}</p>
        </div>
      ),
    },
    {
      title: "Role",
      value: "role",
      className: "w-[15%] text-left",
      custom: true,
      component: (u: AdminUser) => (
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border inline-block truncate max-w-full", ROLE_COLORS[u.role] ?? "bg-slate-50 text-slate-700 border-slate-200")}>
          {ROLE_LABELS[u.role] ?? u.role}
        </span>
      ),
    },
    {
      title: "Department",
      value: "department",
      className: "w-[18%] text-left",
      custom: true,
      component: (u: AdminUser) => (
        <span className="text-[11px] font-medium text-slate-700 truncate block">
          {u.department?.name || (u as any).department_code || "—"}
        </span>
      ),
    },
    {
      title: "Assigned Modules",
      value: "functionalities",
      className: "w-[33%] text-left",
      custom: true,
      component: (u: AdminUser) => {
        const accessArr = Array.isArray(u.functionalities) ? u.functionalities : [];
        const parents = accessArr.filter((e: any) => e?.access_to);
        if (parents.length === 0) {
          return <span className="text-[11px] text-slate-400 italic">No modules assigned</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {parents.map((entry: any) => {
              const mod = moduleConfigForAccess(entry.access_to);
              return (
                <span
                  key={entry.access_to}
                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-sm text-[10px] font-medium bg-[#e8f5ee] text-[#145c3f] border border-[#d4e8dc]"
                >
                  {mod?.title ?? resolveModuleTitle(entry.access_to)}
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      title: "Actions",
      value: "actions",
      className: "w-[10%] text-right",
      custom: true,
      component: (u: AdminUser) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openPrivileges(u)}
          className="h-6 px-2 text-[11px] font-semibold text-purple-700 bg-purple-50/70 border border-purple-200 hover:bg-purple-100 hover:border-purple-300 rounded-sm gap-1 cursor-pointer transition-colors"
        >
          <ShieldCheck className="size-3" />
          <span>Privileges</span>
        </Button>
      ),
    },
  ], []);

  return (
    <div className="space-y-2.5">
      {/* ── Toolbar (Unboxed - Not in a Card) ── */}
      <div className="flex items-center justify-between gap-2 py-0.5">
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search staff or staff ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8.5 pl-8 pr-7 text-xs rounded-sm border-[#d4e8dc] focus-visible:ring-[#25a872] bg-white shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── CustomTable with fitViewport ── */}
      <CustomTable
        data={users}
        fields={fields}
        loading={loading}
        fitViewport={true}
        pageSize={15}
        message="No staff members found"
      />

      {/* ── Privileges Modal ── */}
      <AdminModal
        title={`Module Access Privileges — ${selected?.name ?? ""}`}
        description="Selectively authorize functional module components and report engines for this account."
        open={selected !== null}
        onClose={() => setSelected(null)}
        width="max-w-2xl"
      >
        {selected && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-sm bg-[#f8fbf9] border border-[#d4e8dc]">
              <div>
                <p className="text-xs font-bold text-slate-900">{selected.name}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selected.staff_id} • {ROLE_LABELS[selected.role] ?? selected.role}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setGranted(selectAllPrivilegeKeys())}
                  className="h-6 text-xs text-[#145c3f] bg-white border border-[#d4e8dc] hover:bg-[#e8f5ee] rounded-sm font-medium"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setGranted(new Set())}
                  className="h-6 text-xs text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 rounded-sm font-medium"
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto pr-1 border border-[#d4e8dc] rounded-sm p-2.5 bg-white">
              <ModuleAccessPicker granted={granted} onChange={setGranted} />
            </div>

            <div className="flex justify-between items-center pt-2.5 border-t border-[#e8f5ee]">
              <span className="text-xs font-semibold text-slate-600">
                {countGrantedParents(granted)} modules selected
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(null)}
                  className="h-8 text-xs rounded-sm border-[#d4e8dc] text-slate-600 px-3 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="h-8 bg-[#145c3f] hover:bg-[#0f442e] text-white text-xs rounded-sm font-medium shadow-2xs px-3 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Privileges"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
