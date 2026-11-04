import * as React from "react";
import {
  Plus, Pencil, Search, ShieldCheck, UserX, UserCheck,
  RefreshCw, RotateCcw, X, Mail
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import CustomTable, { type CustomTableField } from "@/components/CustomTable";
import { cn } from "@/lib/utils";
import {
  usersApi, rolesApi, zonesApi, statesApi, departmentsApi, unitsApi,
  type AdminUser, type AppRole, type ZonalOffice, type StateOffice, type Department, type Unit
} from "@/lib/adminApi";
import AdminModal from "./AdminModal";
import ModuleAccessPicker from "./ModuleAccessPicker";
import { buildAccessPayload, countGrantedParents, selectAllPrivilegeKeys } from "@/src/access/privilegeTree";
import { normalizeFunctionalityTitle, normalizeModuleTitle } from "@/src/access/accessUtils";

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "bg-purple-50 text-purple-700 border-purple-200",
  "dg-ceo": "bg-rose-50 text-rose-700 border-rose-200",
  "zonal-coordinator": "bg-blue-50 text-blue-700 border-blue-200",
  "state-coordinator": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "department-officer": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "hq-department": "bg-amber-50 text-amber-700 border-amber-200",
  sdo: "bg-[#e8f5ee] text-[#145c3f] border-[#d4e8dc]",
  "state-officer": "bg-teal-50 text-teal-700 border-teal-200",
};

const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const EMPTY = {
  name: "",
  email: "",
  password: "",
  role: "",
  zonal_code: "",
  state_code: "",
  department_id: "",
  unit_id: "",
  is_active: true,
};

function grantedFromAccess(access?: { access_to: string; functionalities?: string[] }[] | null) {
  const keys = new Set<string>();
  (access || []).forEach((entry) => {
    if (!entry?.access_to) return;
    keys.add(entry.access_to);
    (entry.functionalities || []).forEach((t) => keys.add(t));
  });
  return keys;
}

export default function AdminUsersPage() {
  const [roles, setRoles] = React.useState<AppRole[]>([]);
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [zones, setZones] = React.useState<ZonalOffice[]>([]);
  const [states, setStates] = React.useState<StateOffice[]>([]);
  const [depts, setDepts] = React.useState<Department[]>([]);
  const [formUnits, setFormUnits] = React.useState<Unit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filterRole, setFilterRole] = React.useState("");
  const [filterZone, setFilterZone] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<"all" | "active" | "inactive">("all");
  const [modal, setModal] = React.useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = React.useState<AdminUser | null>(null);
  const [form, setForm] = React.useState({ ...EMPTY });
  const [saving, setSaving] = React.useState(false);
  const [granted, setGranted] = React.useState<Set<string>>(new Set());

  const roleLabels = React.useMemo(() => {
    const map: Record<string, string> = {};
    roles.forEach(r => { map[r.key] = r.label; });
    return map;
  }, [roles]);

  const activeRoles = React.useMemo(() => roles.filter(r => r.is_active), [roles]);
  const defaultRole = activeRoles.find(r => r.key === "admin")?.key || activeRoles[0]?.key || "";

  React.useEffect(() => {
    rolesApi.list(true).then(r => setRoles(r.data)).catch(() => {});
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({
        limit: 500,
        search: search.trim() || undefined,
        role: filterRole || undefined,
        zonal_code: filterZone || undefined,
      });
      setUsers(res.data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterRole, filterZone]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    zonesApi.list().then(r => setZones(r.data)).catch(() => {});
    statesApi.list().then(r => setStates(r.data)).catch(() => {});
    departmentsApi.list().then(r => setDepts(r.data)).catch(() => {});
  }, []);

  const filteredStates = form.zonal_code ? states.filter(s => s.zonal_code === form.zonal_code) : states;

  const handleDeptChange = async (deptCode: string) => {
    setForm(f => ({ ...f, department_id: deptCode, unit_id: "" }));
    setFormUnits([]);
    if (!deptCode) return;
    try {
      const r = await unitsApi.list(deptCode);
      setFormUnits(r.data);
    } catch {
      // silent
    }
  };

  const applyAccessTemplate = async (roleKey: string, unitCode?: string, syncDept = true) => {
    if (!roleKey) return;
    try {
      const res = await rolesApi.accessTemplate(roleKey, unitCode || undefined);
      setGranted(grantedFromAccess(res.data));
      if (syncDept && res.department_code) {
        const d = depts.find(x => x.department_code === res.department_code);
        if (d) await handleDeptChange(d.department_code);
      }
    } catch {
      // keep current grants
    }
  };

  const openCreate = () => {
    setForm({ ...EMPTY, role: defaultRole });
    setFormUnits([]);
    setGranted(new Set());
    setEditing(null);
    setModal("create");
    if (defaultRole) {
      void applyAccessTemplate(defaultRole);
    }
  };

  const openEdit = async (u: AdminUser) => {
    setEditing(u);
    const deptCode = u.department_code || (u as any).department?.department_code || "";
    setForm({
      name: u.name,
      email: u.email || "",
      password: "",
      role: u.role,
      zonal_code: String(u.zonal_code || u.zone?.zonal_code || ""),
      state_code: String(u.state_code || u.state?.code || ""),
      department_id: String(deptCode || ""),
      unit_id: String(u.unit_code || (u as any).unit?.unit_code || ""),
      is_active: u.is_active,
    });

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

    if (deptCode) {
      try {
        const r = await unitsApi.list(deptCode);
        setFormUnits(r.data);
      } catch {
        setFormUnits([]);
      }
    } else {
      setFormUnits([]);
    }

    setModal("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const access = buildAccessPayload(granted);

      const payload: any = {
        name: form.name,
        email: form.email || undefined,
        role: form.role,
        zonal_code: form.zonal_code || undefined,
        state_code: form.state_code || undefined,
        department_code: form.department_id || undefined,
        unit_code: form.unit_id || undefined,
        is_active: form.is_active,
        access,
      };
      if (form.password) payload.password = form.password;

      if (modal === "create") {
        if (!form.password) {
          toast.error("Password required for new account");
          setSaving(false);
          return;
        }
        await usersApi.create(payload);
        toast.success("User created successfully");
      } else if (editing) {
        await usersApi.update(editing.id, payload);
        await usersApi.updatePrivileges(editing.id, access);
        toast.success("User updated successfully");
      }
      setModal(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (u: AdminUser) => {
    if (!confirm(`Deactivate user "${u.name}"? They will no longer be able to log in.`)) return;
    try {
      await usersApi.deactivate(u.id);
      toast.success("User deactivated");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleActivate = async (u: AdminUser) => {
    try {
      await usersApi.activate(u.id);
      toast.success("User reactivated");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const displayedUsers = React.useMemo(() => {
    if (filterStatus === "active") return users.filter(u => u.is_active);
    if (filterStatus === "inactive") return users.filter(u => !u.is_active);
    return users;
  }, [users, filterStatus]);

  const hasActiveFilters = Boolean(search || filterRole || filterZone || filterStatus !== "all");

  const resetFilters = () => {
    setSearch("");
    setFilterRole("");
    setFilterZone("");
    setFilterStatus("all");
  };

  const tableFields: CustomTableField[] = React.useMemo(() => [
    {
      title: "Staff Member",
      value: "name",
      className: "w-[24%] text-left",
      custom: true,
      component: (u: AdminUser) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("size-6.5 rounded-sm flex items-center justify-center font-bold text-[10px] shrink-0 border", getAvatarColor(u.name))}>
            {getInitials(u.name)}
          </div>
          <div className="min-w-0 flex-1 truncate">
            <p className="font-semibold text-slate-900 text-xs truncate leading-tight">
              {u.name}
            </p>
            <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
              <Mail className="size-2.5 text-slate-400 shrink-0" />
              <span className="truncate">{u.email || "No email"}</span>
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Staff ID",
      value: "staff_id",
      className: "w-[12%] text-left",
      custom: true,
      component: (u: AdminUser) => (
        <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-700 border border-slate-200">
          {u.staff_id || "—"}
        </span>
      ),
    },
    {
      title: "Role",
      value: "role",
      className: "w-[15%] text-left",
      custom: true,
      component: (u: AdminUser) => (
        <span
          className={cn(
            "inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border truncate max-w-full",
            ROLE_BADGE_STYLES[u.role] ?? "bg-slate-50 text-slate-700 border-slate-200"
          )}
          title={roleLabels[u.role] ?? u.role}
        >
          {roleLabels[u.role] ?? u.role}
        </span>
      ),
    },
    {
      title: "Department / Unit",
      value: "department",
      className: "w-[18%] text-left",
      custom: true,
      component: (u: AdminUser) => {
        const deptName = u.department?.name || (u as any).department_code || "—";
        const unitName = (u as any).unit?.name || (u as any).unit_code;
        return (
          <div className="min-w-0 truncate" title={`${deptName}${unitName ? ` / Unit: ${unitName}` : ""}`}>
            <p className="text-[11px] font-medium text-slate-800 truncate">
              {deptName}
            </p>
            {unitName && (
              <p className="text-[10px] text-slate-400 truncate">
                {unitName}
              </p>
            )}
          </div>
        );
      },
    },
    {
      title: "Location",
      value: "location",
      className: "w-[11%] text-left",
      custom: true,
      component: (u: AdminUser) => {
        const zone = u.zone?.zonal_code || u.zonal_code;
        const state = u.state?.code || u.state_code;
        if (!zone && !state) {
          return <span className="text-[11px] text-slate-400">HQ</span>;
        }
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {zone && (
              <span className="text-[9px] font-bold px-1 py-0.2 rounded-sm bg-sky-50 text-sky-700 border border-sky-100">
                {zone}
              </span>
            )}
            {state && (
              <span className="text-[9px] font-bold px-1 py-0.2 rounded-sm bg-amber-50 text-amber-700 border border-amber-100">
                {state}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: "Status",
      value: "is_active",
      className: "w-[10%] text-center",
      custom: true,
      component: (u: AdminUser) => (
        u.is_active ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-[#e8f5ee] text-[#145c3f] border border-[#d4e8dc]">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="size-1.5 rounded-full bg-rose-500" />
            Inactive
          </span>
        )
      ),
    },
    {
      title: "Actions",
      value: "actions",
      className: "w-[10%] text-right",
      custom: true,
      component: (u: AdminUser) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEdit(u)}
            className="h-6 px-2 text-[11px] font-semibold text-[#145c3f] bg-[#e8f5ee]/70 border border-[#d4e8dc] hover:bg-[#e8f5ee] hover:border-[#145c3f] rounded-sm gap-1 cursor-pointer transition-colors"
          >
            <Pencil className="size-3" />
            <span>Edit</span>
          </Button>
          {u.is_active ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeactivate(u)}
              title="Deactivate user"
              className="size-6 p-0 text-amber-700 bg-amber-50/70 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 rounded-sm cursor-pointer transition-colors"
            >
              <UserX className="size-3" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleActivate(u)}
              title="Reactivate user"
              className="size-6 p-0 text-emerald-700 bg-emerald-50/70 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 rounded-sm cursor-pointer transition-colors"
            >
              <UserCheck className="size-3" />
            </Button>
          )}
        </div>
      ),
    },
  ], [roleLabels]);

  return (
    <div className="space-y-2.5">
      {/* ── Toolbar & Filter Strip (Unboxed - Not in a Card) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 py-0.5">
        {/* Left search & filter controls */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[180px] flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search staff name or ID…"
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

          {/* Role Filter */}
          <div className="w-[140px]">
            <Select
              value={filterRole || "ALL"}
              onValueChange={v => setFilterRole(v === "ALL" ? "" : v)}
            >
              <SelectTrigger
                size="sm"
                displayValue={filterRole ? (roleLabels[filterRole] || filterRole) : "All Roles"}
                className="h-8.5 rounded-sm border-[#d4e8dc] bg-white text-xs font-medium shadow-2xs"
              >
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                {activeRoles.map(r => (
                  <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zone Filter */}
          <div className="w-[130px]">
            <Select
              value={filterZone || "ALL"}
              onValueChange={v => setFilterZone(v === "ALL" ? "" : v)}
            >
              <SelectTrigger
                size="sm"
                displayValue={filterZone ? `Zone: ${filterZone}` : "All Zones"}
                className="h-8.5 rounded-sm border-[#d4e8dc] bg-white text-xs font-medium shadow-2xs"
              >
                <SelectValue placeholder="All Zones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Zones</SelectItem>
                {zones.map(z => (
                  <SelectItem key={z.zonal_code} value={z.zonal_code}>{z.zonal_code} ({z.description})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="w-[120px]">
            <Select
              value={filterStatus}
              onValueChange={(v: "all" | "active" | "inactive") => setFilterStatus(v)}
            >
              <SelectTrigger
                size="sm"
                displayValue={filterStatus === "all" ? "All Status" : filterStatus === "active" ? "Active Only" : "Inactive Only"}
                className="h-8.5 rounded-sm border-[#d4e8dc] bg-white text-xs font-medium shadow-2xs"
              >
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8.5 text-xs text-slate-500 hover:text-slate-800 gap-1 rounded-sm px-2 cursor-pointer"
            >
              <RotateCcw className="size-3" />
              Reset
            </Button>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="h-8.5 text-xs rounded-sm border-[#d4e8dc] hover:bg-[#e8f5ee] text-slate-700 font-medium px-2.5 cursor-pointer shadow-2xs bg-white"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={openCreate}
            className="h-8.5 bg-[#145c3f] hover:bg-[#0f442e] text-white rounded-sm text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer px-3"
          >
            <Plus className="size-3.5" />
            Add Staff User
          </Button>
        </div>
      </div>

      {/* ── CustomTable Component fitting viewport without horizontal scroll ── */}
      <CustomTable
        data={displayedUsers}
        fields={tableFields}
        loading={loading}
        fitViewport={true}
        pageSize={15}
        message="No staff accounts match your current criteria"
      />

      {/* ── Create / Edit Staff Modal (All Normal Selects - Single Unified Form) ── */}
      <AdminModal
        title={modal === "create" ? "Add New Staff User" : `Edit Staff — ${editing?.name || ""}`}
        description="Configure staff user profile, organizational placement, and granular platform module permissions."
        open={modal !== null}
        onClose={() => setModal(null)}
        width="max-w-3xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Section 1: Personal & Account Details */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Staff Identity & Credentials
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <FormField label="Full Name" required hint={modal === "create" ? "Staff ID will be auto-generated based on role" : `Staff ID: ${editing?.staff_id}`}>
                  <Input
                    placeholder="e.g. Amina Yusuf"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    className="h-8.5 text-xs rounded-sm border-[#d4e8dc] focus-visible:ring-[#25a872]"
                  />
                </FormField>
              </div>

              <FormField label="Official Email Address">
                <Input
                  type="email"
                  placeholder="user@nhia.gov.ng"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="h-8.5 text-xs rounded-sm border-[#d4e8dc] focus-visible:ring-[#25a872]"
                />
              </FormField>

              <FormField
                label={modal === "create" ? "Temporary Password" : "Reset Password"}
                required={modal === "create"}
                hint={modal === "edit" ? "Leave blank to keep unchanged" : undefined}
              >
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required={modal === "create"}
                  className="h-8.5 text-xs rounded-sm border-[#d4e8dc] focus-visible:ring-[#25a872]"
                />
              </FormField>

              <FormField label="System Role" required hint="Applies preset access rights">
                <Select
                  value={form.role || defaultRole}
                  onValueChange={v => {
                    setForm(f => ({ ...f, role: v }));
                    void applyAccessTemplate(v);
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    displayValue={roleLabels[form.role] ?? form.role}
                    className="h-8.5 text-xs rounded-sm border-[#d4e8dc] bg-white font-medium"
                  >
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeRoles.map(r => (
                      <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Account Status">
                <Select
                  value={form.is_active ? "1" : "0"}
                  onValueChange={v => setForm(f => ({ ...f, is_active: v === "1" }))}
                >
                  <SelectTrigger
                    size="sm"
                    displayValue={form.is_active ? "Active" : "Inactive"}
                    className="h-8.5 text-xs rounded-sm border-[#d4e8dc] bg-white font-medium"
                  >
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Active</SelectItem>
                    <SelectItem value="0">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>

          {/* Section 2: Scope & Office Placement (Normal Code Selects) */}
          <div className="pt-2 border-t border-[#e8f5ee]">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Organizational Scope & Assignment
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Geopolitical Zone">
                <Select
                  value={form.zonal_code || "NONE"}
                  onValueChange={v => setForm(f => ({ ...f, zonal_code: v === "NONE" ? "" : v, state_code: "" }))}
                >
                  <SelectTrigger
                    size="sm"
                    displayValue={zones.find(z => z.zonal_code === form.zonal_code)?.description || (form.zonal_code ? form.zonal_code : "— Select Zone —")}
                    className="h-8.5 text-xs rounded-sm border-[#d4e8dc] bg-white font-medium"
                  >
                    <SelectValue placeholder="— Select Zone —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">— None (National/HQ) —</SelectItem>
                    {zones.map(z => (
                      <SelectItem key={z.zonal_code} value={z.zonal_code}>
                        {z.description} ({z.zonal_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="State Office">
                <Select
                  value={form.state_code || "NONE"}
                  onValueChange={v => setForm(f => ({ ...f, state_code: v === "NONE" ? "" : v }))}
                >
                  <SelectTrigger
                    size="sm"
                    displayValue={filteredStates.find(s => s.code === form.state_code)?.description || (form.state_code ? form.state_code : "— Select State —")}
                    className="h-8.5 text-xs rounded-sm border-[#d4e8dc] bg-white font-medium"
                  >
                    <SelectValue placeholder="— Select State —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">— None —</SelectItem>
                    {filteredStates.map(s => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.description} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="HQ Department">
                <Select
                  value={form.department_id || "NONE"}
                  onValueChange={v => handleDeptChange(v === "NONE" ? "" : v)}
                >
                  <SelectTrigger
                    size="sm"
                    displayValue={depts.find(d => d.department_code === form.department_id)?.name || (form.department_id ? form.department_id : "— Select Department —")}
                    className="h-8.5 text-xs rounded-sm border-[#d4e8dc] bg-white font-medium"
                  >
                    <SelectValue placeholder="— Select Department —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">— None —</SelectItem>
                    {depts.map(d => (
                      <SelectItem key={d.department_code} value={d.department_code}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Operational Unit">
                <Select
                  value={form.unit_id || "NONE"}
                  disabled={!form.department_id}
                  onValueChange={v => {
                    const nextUnit = v === "NONE" ? "" : v;
                    setForm(f => ({ ...f, unit_id: nextUnit }));
                    const unit = formUnits.find(u => u.unit_code === nextUnit);
                    void applyAccessTemplate(form.role, unit?.unit_code, false);
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    displayValue={formUnits.find(u => u.unit_code === form.unit_id)?.name || (form.unit_id ? form.unit_id : form.department_id ? "— Select Unit —" : "Select department first")}
                    className="h-8.5 text-xs rounded-sm border-[#d4e8dc] bg-white font-medium"
                  >
                    <SelectValue placeholder={form.department_id ? "— Select Unit —" : "Select department first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">— None —</SelectItem>
                    {formUnits.map(u => (
                      <SelectItem key={u.unit_code} value={u.unit_code}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>

          {/* Section 3: Module Permissions in Same View */}
          <div className="pt-2 border-t border-[#e8f5ee] space-y-2">
            <div className="flex items-center justify-between p-2 rounded-sm bg-[#f8fbf9] border border-[#d4e8dc]">
              <div>
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-[#145c3f]" />
                  Granular Access Permissions
                  <span className="text-[10px] px-1.5 py-0.2 rounded-sm font-bold bg-[#e8f5ee] text-[#145c3f] border border-[#d4e8dc]">
                    {countGrantedParents(granted)} modules
                  </span>
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Authorized operations for this staff member.
                </p>
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyAccessTemplate(form.role, form.unit_id)}
                  className="h-6 text-xs text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-sm font-medium"
                >
                  Reset to Role
                </Button>
              </div>
            </div>

            <div className="max-h-[35vh] overflow-y-auto pr-1 border border-[#d4e8dc] rounded-sm p-2.5 bg-white">
              <ModuleAccessPicker granted={granted} onChange={setGranted} />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e8f5ee]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModal(null)}
              className="text-xs rounded-sm border-[#d4e8dc] text-slate-600 h-8 px-3 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="bg-[#145c3f] hover:bg-[#0f442e] text-white text-xs rounded-sm font-medium shadow-2xs gap-1.5 h-8 px-3 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : modal === "create" ? (
                "Create Staff User"
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}

function FormField({
  label,
  required,
  hint,
  children
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
