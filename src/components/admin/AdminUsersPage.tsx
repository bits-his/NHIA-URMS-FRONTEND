import * as React from "react";
import { Plus, Pencil, Search, ChevronLeft, ChevronRight, TrendingUp, ShieldCheck, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SearchSelect } from "@/components/ui/search-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usersApi, rolesApi, zonesApi, statesApi, departmentsApi, unitsApi, type AdminUser, type AppRole, type ZonalOffice, type StateOffice, type Department, type Unit } from "@/lib/adminApi";
import AdminModal from "./AdminModal";
import ModuleAccessPicker from "./ModuleAccessPicker";
import { buildAccessPayload, countGrantedParents, selectAllPrivilegeKeys } from "@/src/access/privilegeTree";
import { normalizeFunctionalityTitle, normalizeModuleTitle } from "@/src/access/accessUtils";

const ROLE_COLORS: Record<string, string> = {
  "admin":              "bg-purple-100 text-purple-700 border-purple-200",
  "dg-ceo":             "bg-rose-100 text-rose-700 border-rose-200",
  "zonal-coordinator":  "bg-blue-100 text-blue-700 border-blue-200",
  "state-coordinator":  "bg-cyan-100 text-cyan-700 border-cyan-200",
  "department-officer": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "hq-department":      "bg-amber-100 text-amber-700 border-amber-200",
  "sdo":                "bg-[#e8f5ee] text-[#145c3f] border-[#d4e8dc]",
  "state-officer":      "bg-slate-100 text-slate-700 border-slate-200",
};

const EMPTY = {
  name: "",
  email: "",
  password: "",
  role: "",
  zone_id: "",
  state_id: "",
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

export default function AdminUsersPage({ showOverview = false }: { showOverview?: boolean }) {
  const [roles, setRoles] = React.useState<AppRole[]>([]);
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [zones, setZones] = React.useState<ZonalOffice[]>([]);
  const [states, setStates] = React.useState<StateOffice[]>([]);
  const [depts, setDepts] = React.useState<Department[]>([]);
  const [formUnits, setFormUnits] = React.useState<Unit[]>([]);
  const [total, setTotal] = React.useState(0);
  const [pages, setPages] = React.useState(1);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filterRole, setFilterRole] = React.useState("");
  const [filterZone, setFilterZone] = React.useState("");
  const [modal, setModal] = React.useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = React.useState<AdminUser | null>(null);
  const [form, setForm] = React.useState({ ...EMPTY });
  const [saving, setSaving] = React.useState(false);
  const [granted, setGranted] = React.useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = React.useState<"info" | "access">("info");

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
  const [stats, setStats] = React.useState<{ label: string; value: number; tint: string; iconColor: string; icon: React.ReactNode }[]>([]);

  React.useEffect(() => {
    if (!showOverview) return;
    Promise.allSettled([
      usersApi.list(), zonesApi.list(), statesApi.list(), departmentsApi.list(), unitsApi.list(),
    ]).then(([u, z, s, d, un]) => {
      setStats([
        { label: "Total Users",   value: u.status  === "fulfilled" ? u.value.total        : 0, tint: "bg-[#e8f5ee] border-[#d4e8dc]", iconColor: "text-[#145c3f]", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
        { label: "Zonal Offices", value: z.status  === "fulfilled" ? z.value.data.length  : 0, tint: "bg-blue-50 border-blue-100",    iconColor: "text-blue-600",  icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
        { label: "State Offices", value: s.status  === "fulfilled" ? s.value.data.length  : 0, tint: "bg-amber-50 border-amber-100",  iconColor: "text-amber-600", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
        { label: "Departments",   value: d.status  === "fulfilled" ? d.value.data.length  : 0, tint: "bg-purple-50 border-purple-100",iconColor: "text-purple-600",icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
        { label: "Units",         value: un.status === "fulfilled" ? un.value.data.length : 0, tint: "bg-rose-50 border-rose-100",    iconColor: "text-rose-600",  icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
      ]);
    });
  }, [showOverview]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({ page, limit: 100, search: search || undefined, role: filterRole || undefined, zone_id: filterZone ? Number(filterZone) : undefined });
      setUsers(res.data); setTotal(res.total); setPages(res.pages);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [page, search, filterRole, filterZone]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    zonesApi.list().then(r => setZones(r.data)).catch(() => {});
    statesApi.list().then(r => setStates(r.data)).catch(() => {});
    departmentsApi.list().then(r => setDepts(r.data)).catch(() => {});
  }, []);

  const filteredStates = form.zone_id ? states.filter(s => String(s.zonal_id) === String(form.zone_id)) : states;

  // When dept changes in form, fetch its units
  const handleDeptChange = async (deptId: string) => {
    setForm(f => ({ ...f, department_id: deptId, unit_id: "" }));
    setFormUnits([]);
    if (!deptId) return;
    try { const r = await unitsApi.list(Number(deptId)); setFormUnits(r.data); } catch { /* silent */ }
  };

  const applyAccessTemplate = async (roleKey: string, unitCode?: string, syncDept = true) => {
    if (!roleKey) return;
    try {
      const res = await rolesApi.accessTemplate(roleKey, unitCode || undefined);
      setGranted(grantedFromAccess(res.data));
      if (syncDept && res.department_code) {
        const d = depts.find(x => x.department_code === res.department_code);
        if (d) await handleDeptChange(String(d.id));
      }
    } catch { /* keep current grants */ }
  };

  const openCreate = () => { setForm({ ...EMPTY, role: defaultRole }); setFormUnits([]); setGranted(new Set()); setActiveTab("info"); setEditing(null); setModal("create"); };
  const openEdit = async (u: AdminUser) => {
    setEditing(u);
    setForm({
      name: u.name, email: u.email || "", password: "", role: u.role,
      zone_id: String(u.zone_id || ""), state_id: String(u.state_id || ""),
      department_id: String(u.department_id || ""), unit_id: String(u.unit_id || ""),
      is_active: u.is_active,
    });
    // Load existing access into granted set
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
    if (u.department_id) {
      try { const r = await unitsApi.list(u.department_id); setFormUnits(r.data); } catch { setFormUnits([]); }
    } else { setFormUnits([]); }
    setActiveTab("info");
    setModal("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const access = buildAccessPayload(granted);

      const payload: any = {
        name: form.name, email: form.email || undefined, role: form.role,
        zone_id: form.zone_id ? Number(form.zone_id) : undefined,
        state_id: form.state_id ? Number(form.state_id) : undefined,
        department_id: form.department_id ? Number(form.department_id) : undefined,
        unit_id: form.unit_id ? Number(form.unit_id) : undefined,
        is_active: form.is_active,
        access,
      };
      if (form.password) payload.password = form.password;
      if (modal === "create") {
        if (!form.password) { toast.error("Password required"); setSaving(false); return; }
        await usersApi.create(payload);
        toast.success("User created");
      } else if (editing) {
        await usersApi.update(editing.id, payload);
        // Also update privileges separately to ensure access is saved
        await usersApi.updatePrivileges(editing.id, access);
        toast.success("User updated");
      }
      setModal(null); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (u: AdminUser) => {
    if (!confirm(`Deactivate user "${u.name}"? They will no longer be able to log in.`)) return;
    try { await usersApi.deactivate(u.id); toast.success("User deactivated"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleActivate = async (u: AdminUser) => {
    try { await usersApi.activate(u.id); toast.success("User activated"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      {/* Overview stats */}
      {showOverview && stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-2">
          {stats.map(s => (
            <div key={s.label} className={`${s.tint} rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shadow-sm ${s.iconColor}`}>
                  {s.icon}
                </div>
                <TrendingUp className="w-3.5 h-3.5 text-slate-300" />
              </div>
              <p className="text-3xl font-black text-slate-900 tracking-tight">{s.value}</p>
              <p className="text-sm font-semibold text-slate-700 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input className="w-full pl-9 pr-3 h-10 rounded-xl border border-[#d4e8dc] bg-white text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#25a872] outline-none transition-all"
            placeholder="Search name or staff ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="h-10 px-3 rounded-xl border border-[#d4e8dc] bg-white text-sm text-slate-700 focus:ring-2 focus:ring-[#25a872] outline-none"
          value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          {activeRoles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <select className="h-10 px-3 rounded-xl border border-[#d4e8dc] bg-white text-sm text-slate-700 focus:ring-2 focus:ring-[#25a872] outline-none"
          value={filterZone} onChange={e => { setFilterZone(e.target.value); setPage(1); }}>
          <option value="">All Zones</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.zonal_code}</option>)}
        </select>
        <Button onClick={openCreate} className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white rounded-xl h-10 gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>

      {/* Table */}
      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                <TableHead className="text-xs font-bold text-slate-600">Name</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Staff ID</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Role</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 hidden lg:table-cell">Department</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 hidden md:table-cell">Zone</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 hidden lg:table-cell">State</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-slate-400">Loading...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-slate-400">No users found</TableCell></TableRow>
              ) : users.map(u => (
                <TableRow key={u.id} className="hover:bg-[#f0fdf7] transition-colors">
                  <TableCell className="font-semibold text-slate-800">{u.name}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">{u.staff_id}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] border ${ROLE_COLORS[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                      {roleLabels[u.role] ?? u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 hidden lg:table-cell">{u.department?.name ?? "—"}</TableCell>
                  <TableCell className="text-slate-500 hidden md:table-cell">{u.zone?.zonal_code ?? "—"}</TableCell>
                  <TableCell className="text-slate-500 hidden lg:table-cell">{u.state?.code ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] border ${u.is_active ? "bg-[#e8f5ee] text-[#145c3f] border-[#d4e8dc]" : "bg-rose-50 text-rose-600 border-rose-200"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)} className="h-7 w-7 p-0 hover:bg-[#e8f5ee] hover:text-[#145c3f]"><Pencil className="w-3.5 h-3.5" /></Button>
                      {u.is_active ? (
                        <Button variant="ghost" size="sm" onClick={() => handleDeactivate(u)} title="Deactivate user"
                          className="h-7 w-7 p-0 hover:bg-rose-50 hover:text-rose-600"><UserX className="w-3.5 h-3.5" /></Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleActivate(u)} title="Reactivate user"
                          className="h-7 w-7 p-0 hover:bg-emerald-50 hover:text-emerald-600"><UserCheck className="w-3.5 h-3.5" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#d4e8dc]">
            <p className="text-xs text-slate-500">Showing {users.length} of {total} users</p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-7 w-7 p-0"><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-xs text-slate-600 px-2">Page {page} of {pages}</span>
              <Button variant="ghost" size="sm" disabled={page === pages} onClick={() => setPage(p => p + 1)} className="h-7 w-7 p-0"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </Card>

      <AdminModal title={modal === "create" ? "Add New User" : "Edit User"} open={modal !== null} onClose={() => setModal(null)} width="max-w-3xl">
        <form onSubmit={handleSave} className="space-y-6">

          {/* ── User Info ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Full Name" required>
                <Input placeholder="e.g. Amina Yusuf" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </Field>
              {modal === "create" && <p className="text-[10px] text-slate-400 mt-1">Staff ID auto-generated from role (e.g. SO-0001)</p>}
            </div>
            <Field label="Email">
              <Input type="email" placeholder="user@nhia.gov.ng" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label={modal === "create" ? "Password" : "New Password"} required={modal === "create"}>
              <Input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={modal === "create"} />
            </Field>

            <Field label="Role" required>
              <Select value={form.role || defaultRole} onValueChange={v => {
                setForm(f => ({ ...f, role: v }));
                void applyAccessTemplate(v);
              }}>
                <SelectTrigger displayValue={roleLabels[form.role] ?? form.role}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {activeRoles.map(r => (
                    <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {modal === "edit" && (
              <Field label="Status">
                <Select value={form.is_active ? "1" : "0"} onValueChange={v => setForm(f => ({ ...f, is_active: v === "1" }))}>
                  <SelectTrigger displayValue={form.is_active ? "Active" : "Inactive"}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Active</SelectItem>
                    <SelectItem value="0">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field label="Zone">
              <SearchSelect
                clearable
                value={form.zone_id}
                onChange={v => setForm(f => ({ ...f, zone_id: v, state_id: "" }))}
                placeholder="— Select Zone —"
                options={zones.map(z => ({ value: String(z.id), label: z.description, sub: z.zonal_code }))}
              />
            </Field>

            <Field label="State">
              <SearchSelect
                clearable
                value={form.state_id}
                onChange={v => setForm(f => ({ ...f, state_id: v }))}
                placeholder="— Select State —"
                options={filteredStates.map(s => ({ value: String(s.id), label: s.description, sub: s.code }))}
              />
            </Field>

            <Field label="Department">
              <SearchSelect
                clearable
                value={form.department_id}
                onChange={v => handleDeptChange(v)}
                placeholder="— Select Department —"
                options={depts.map(d => ({ value: String(d.id), label: d.name, sub: d.department_code }))}
              />
            </Field>

            <Field label="Unit">
              <SearchSelect
                clearable
                disabled={!form.department_id}
                value={form.unit_id}
                onChange={v => {
                  setForm(f => ({ ...f, unit_id: v }));
                  const unit = formUnits.find(u => String(u.id) === v);
                  void applyAccessTemplate(form.role, unit?.unit_code, false);
                }}
                placeholder={form.department_id ? "— Select Unit —" : "Select a department first"}
                options={formUnits.map(u => ({ value: String(u.id), label: u.name, sub: u.unit_code }))}
              />
            </Field>
          </div>

          {/* ── Module Access ── */}
          <div className="border-t border-[#d4e8dc] pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#145c3f]" /> Module Access
                <span className="ml-1 text-[10px] font-normal text-slate-400 normal-case">
                  ({countGrantedParents(granted)} modules)
                </span>
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setGranted(selectAllPrivilegeKeys())} className="text-xs text-[#145c3f] hover:underline font-medium">Select all</button>
                <span className="text-slate-300">|</span>
                <button type="button" onClick={() => setGranted(new Set())} className="text-xs text-rose-500 hover:underline font-medium">Clear all</button>
              </div>
            </div>
            <div className="max-h-[50vh] overflow-y-auto pr-1">
              <ModuleAccessPicker granted={granted} onChange={setGranted} />
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex justify-end gap-3 pt-2 border-t border-[#d4e8dc]">
            <Button type="button" variant="ghost" onClick={() => setModal(null)} className="rounded-xl text-slate-600">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white rounded-xl">
              {saving ? "Saving..." : modal === "create" ? "Create User" : "Save Changes"}
            </Button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
