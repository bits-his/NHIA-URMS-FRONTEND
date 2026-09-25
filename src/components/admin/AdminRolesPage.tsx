import * as React from "react";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rolesApi, type AppRole, type ReportScope } from "@/lib/adminApi";
import AdminModal from "./AdminModal";

const inputCls = "w-full pl-3 pr-3 h-11 rounded-xl border border-[#d4e8dc] bg-[#f4f7f5] text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#25a872] focus:border-[#25a872] outline-none transition-all";

const SCOPE_LABELS: Record<ReportScope, string> = {
  national: "National (all states)",
  zonal:    "Zonal",
  state:    "State",
  none:     "No report scope",
};

const EMPTY = {
  label: "",
  key: "",
  staff_id_prefix: "",
  report_scope: "none" as ReportScope,
  can_create_monthly: false,
  can_review_monthly: false,
  description: "",
  is_active: true,
};

export default function AdminRolesPage() {
  const [roles, setRoles] = React.useState<AppRole[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = React.useState<AppRole | null>(null);
  const [form, setForm] = React.useState({ ...EMPTY });
  const [saving, setSaving] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await rolesApi.list(); setRoles(r.data); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  React.useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setModal("create"); };
  const openEdit = (role: AppRole) => {
    setEditing(role);
    setForm({
      label: role.label,
      key: role.key,
      staff_id_prefix: role.staff_id_prefix,
      report_scope: role.report_scope,
      can_create_monthly: role.can_create_monthly,
      can_review_monthly: role.can_review_monthly,
      description: role.description || "",
      is_active: role.is_active,
    });
    setModal("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        key: form.key.trim() || undefined,
        staff_id_prefix: form.staff_id_prefix.trim() || undefined,
        report_scope: form.report_scope,
        can_create_monthly: form.can_create_monthly,
        can_review_monthly: form.can_review_monthly,
        description: form.description.trim() || undefined,
        ...(modal === "edit" ? { is_active: form.is_active } : {}),
      };
      if (modal === "create") {
        await rolesApi.create(payload as Omit<AppRole, "id" | "is_system">);
        toast.success("Role created");
      } else if (editing) {
        await rolesApi.update(editing.id, payload);
        toast.success("Role updated");
      }
      setModal(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (role: AppRole) => {
    if (!confirm(`Delete role "${role.label}"?`)) return;
    try { await rolesApi.delete(role.id); toast.success("Role deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          Create roles here, then assign them when adding users. Report scope controls which monthly data each role sees.
        </p>
        <Button onClick={openCreate} className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white rounded-xl h-10 gap-2 shadow-sm shrink-0">
          <Plus className="w-4 h-4" /> Add Role
        </Button>
      </div>

      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                <TableHead className="text-xs font-bold text-slate-600">Role</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Key</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Staff ID Prefix</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Report Scope</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Monthly</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-400">Loading...</TableCell></TableRow>
              ) : roles.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-slate-400">No roles yet</TableCell></TableRow>
              ) : roles.map(role => (
                <TableRow key={role.id} className="hover:bg-[#f0fdf7] transition-colors">
                  <TableCell className="font-semibold text-slate-800">
                    <span className="flex items-center gap-2">
                      {role.is_system && <Shield className="w-3.5 h-3.5 text-[#25a872]" />}
                      {role.label}
                    </span>
                  </TableCell>
                  <TableCell><span className="font-mono text-xs text-slate-600">{role.key}</span></TableCell>
                  <TableCell><span className="font-mono text-xs font-bold text-[#145c3f]">{role.staff_id_prefix}</span></TableCell>
                  <TableCell className="text-xs text-slate-600">{SCOPE_LABELS[role.report_scope]}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.can_create_monthly && <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-100">Create</Badge>}
                      {role.can_review_monthly && <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-100">Review</Badge>}
                      {!role.can_create_monthly && !role.can_review_monthly && <span className="text-xs text-slate-400">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${role.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                      {role.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(role)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {!role.is_system && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600" onClick={() => handleDelete(role)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdminModal open={!!modal} onClose={() => setModal(null)} title={modal === "create" ? "Add Role" : "Edit Role"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Display Name *</label>
            <input className={inputCls} value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Audit Officer" required />
          </div>
          {modal === "create" && (
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Key (slug)</label>
              <input className={inputCls} value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value.toLowerCase() }))} placeholder="auto-generated from name if empty" />
              <p className="text-[10px] text-slate-400 mt-1">Lowercase, hyphens only — e.g. audit-officer</p>
            </div>
          )}
          {modal === "edit" && editing && (
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Key</label>
              <input className={`${inputCls} bg-slate-100`} value={editing.key} disabled />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Staff ID Prefix</label>
            <input className={inputCls} value={form.staff_id_prefix} onChange={e => setForm(f => ({ ...f, staff_id_prefix: e.target.value.toUpperCase() }))} placeholder="e.g. AUD" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Monthly Report Scope</label>
            <select className={inputCls} value={form.report_scope} onChange={e => setForm(f => ({ ...f, report_scope: e.target.value as ReportScope }))}>
              {(Object.keys(SCOPE_LABELS) as ReportScope[]).map(s => (
                <option key={s} value={s}>{SCOPE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.can_create_monthly} onChange={e => setForm(f => ({ ...f, can_create_monthly: e.target.checked }))} className="accent-[#145c3f]" />
              Can create (forms only — no list)
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.can_review_monthly} onChange={e => setForm(f => ({ ...f, can_review_monthly: e.target.checked }))} className="accent-[#145c3f]" />
              Can review (list / view / forward — no create)
            </label>
            <p className="text-[11px] text-slate-400 leading-snug">
              Applies across pages the user can open via Privileges. Privileges control which pages appear; these flags control create-only vs review-only behaviour. Anyone with page access can fill forms unless they are review-only.
            </p>
            {modal === "edit" && (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-[#145c3f]" />
                Active
              </label>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Description</label>
            <textarea className={`${inputCls} h-20 py-2 resize-none`} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white">
              {saving ? "Saving..." : modal === "create" ? "Create Role" : "Save Changes"}
            </Button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
