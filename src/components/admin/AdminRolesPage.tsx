import * as React from "react";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import CustomTable, { type CustomTableField } from "@/components/CustomTable";
import { rolesApi, type AppRole, type ReportScope } from "@/lib/adminApi";
import AdminModal from "./AdminModal";
import AdminConfirmDialog from "./AdminConfirmDialog";
import { cn } from "@/lib/utils";

const SCOPE_LABELS: Record<ReportScope, string> = {
  national: "National (all states)",
  zonal: "Zonal",
  state: "State",
  none: "No report scope",
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
  const [search, setSearch] = React.useState("");
  const [modal, setModal] = React.useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = React.useState<AppRole | null>(null);
  const [form, setForm] = React.useState({ ...EMPTY });
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<AppRole | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await rolesApi.list();
      setRoles(r.data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm({ ...EMPTY });
    setEditing(null);
    setModal("create");
  };

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
        toast.success("Role created successfully");
      } else if (editing) {
        await rolesApi.update(editing.id, payload);
        toast.success("Role updated successfully");
      }
      setModal(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await rolesApi.delete(deleteTarget.id);
      toast.success("Role deleted successfully");
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredRoles = React.useMemo(() => {
    if (!search.trim()) return roles;
    const q = search.toLowerCase();
    return roles.filter(
      r => r.label.toLowerCase().includes(q) || r.key.toLowerCase().includes(q) || r.staff_id_prefix.toLowerCase().includes(q)
    );
  }, [roles, search]);

  const fields: CustomTableField[] = React.useMemo(() => [
    {
      title: "Role Name",
      value: "label",
      className: "w-[21%] text-left",
      custom: true,
      component: (r: AppRole) => (
        <div className="min-w-0 truncate">
          <p className="font-semibold text-slate-900 text-xs truncate">{r.label}</p>
          {r.description && (
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{r.description}</p>
          )}
        </div>
      ),
    },
    {
      title: "Key (Slug)",
      value: "key",
      className: "w-[14%] text-left",
      custom: true,
      component: (r: AppRole) => (
        <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-700 border border-slate-200">
          {r.key}
        </span>
      ),
    },
    {
      title: "Staff ID Prefix",
      value: "staff_id_prefix",
      className: "w-[11%] text-left",
      custom: true,
      component: (r: AppRole) => (
        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-sm border border-indigo-100">
          {r.staff_id_prefix || "—"}
        </span>
      ),
    },
    {
      title: "Report Scope",
      value: "report_scope",
      className: "w-[15%] text-left",
      custom: true,
      component: (r: AppRole) => (
        <span className="text-[11px] font-medium text-slate-700">
          {SCOPE_LABELS[r.report_scope] || r.report_scope}
        </span>
      ),
    },
    {
      title: "Monthly Engine",
      value: "monthly",
      className: "w-[15%] text-left",
      custom: true,
      component: (r: AppRole) => (
        <div className="flex items-center gap-1 flex-wrap">
          {r.can_create_monthly && (
            <span className="text-[9px] font-bold px-1 py-0.2 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-100">
              Create
            </span>
          )}
          {r.can_review_monthly && (
            <span className="text-[9px] font-bold px-1 py-0.2 rounded-sm bg-blue-50 text-blue-700 border border-blue-100">
              Review
            </span>
          )}
          {!r.can_create_monthly && !r.can_review_monthly && (
            <span className="text-[10px] text-slate-400">None</span>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      value: "is_active",
      className: "w-[10%] text-center",
      custom: true,
      component: (r: AppRole) => (
        r.is_active ? (
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
      className: "w-[14%] text-right",
      custom: true,
      component: (r: AppRole) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEdit(r)}
            className="h-6 px-2 text-[11px] font-semibold text-[#145c3f] bg-[#e8f5ee]/70 border border-[#d4e8dc] hover:bg-[#e8f5ee] hover:border-[#145c3f] rounded-sm gap-1 cursor-pointer transition-colors"
          >
            <Pencil className="size-3" />
            <span>Edit</span>
          </Button>
          {!r.is_system && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(r)}
              className="h-6 px-2 text-[11px] font-semibold text-rose-600 bg-rose-50/70 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 rounded-sm gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="size-3" />
              <span>Delete</span>
            </Button>
          )}
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-2.5">
      {/* ── Toolbar (Unboxed - Not in a Card) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 py-0.5">
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search roles or prefixes…"
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

        <Button
          size="sm"
          onClick={openCreate}
          className="h-8.5 bg-[#145c3f] hover:bg-[#0f442e] text-white rounded-sm text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer px-3 shrink-0"
        >
          <Plus className="size-3.5" />
          Add Role
        </Button>
      </div>

      {/* ── CustomTable with fitViewport ── */}
      <CustomTable
        data={filteredRoles}
        fields={fields}
        loading={loading}
        fitViewport={true}
        pageSize={15}
        message="No system roles found"
      />

      {/* ── Role Modal (Normal Code Select - Not Native) ── */}
      <AdminModal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "create" ? "Add System Role" : `Edit Role — ${editing?.label || ""}`}
        description="Configure role nomenclature, Staff ID prefixing, and reporting governance boundaries."
        width="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Role Name *</label>
            <Input
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Audit Officer"
              required
              className="h-8.5 text-xs rounded-sm border-[#d4e8dc] focus-visible:ring-[#25a872]"
            />
          </div>

          {modal === "create" ? (
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Key (Slug)</label>
              <Input
                value={form.key}
                onChange={e => setForm(f => ({ ...f, key: e.target.value.toLowerCase() }))}
                placeholder="auto-generated from name if blank"
                className="h-8.5 text-xs rounded-sm border-[#d4e8dc] focus-visible:ring-[#25a872]"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Lowercase and hyphens only (e.g. audit-officer)</p>
            </div>
          ) : editing && (
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Key</label>
              <Input
                value={editing.key}
                disabled
                className="h-8.5 text-xs rounded-sm border-[#d4e8dc] bg-slate-100 text-slate-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Staff ID Prefix</label>
            <Input
              value={form.staff_id_prefix}
              onChange={e => setForm(f => ({ ...f, staff_id_prefix: e.target.value.toUpperCase() }))}
              placeholder="e.g. AUD"
              className="h-8.5 text-xs rounded-sm border-[#d4e8dc] focus-visible:ring-[#25a872]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Monthly Report Scope</label>
            <Select
              value={form.report_scope}
              onValueChange={v => setForm(f => ({ ...f, report_scope: v as ReportScope }))}
            >
              <SelectTrigger
                size="sm"
                displayValue={SCOPE_LABELS[form.report_scope] || form.report_scope}
                className="h-8.5 text-xs rounded-sm border-[#d4e8dc] bg-white font-medium"
              >
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SCOPE_LABELS) as ReportScope[]).map(s => (
                  <SelectItem key={s} value={s}>{SCOPE_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2 border-t border-[#e8f5ee] space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.can_create_monthly}
                onChange={e => setForm(f => ({ ...f, can_create_monthly: e.target.checked }))}
                className="accent-[#145c3f] rounded-sm size-3.5"
              />
              Can create monthly forms
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.can_review_monthly}
                onChange={e => setForm(f => ({ ...f, can_review_monthly: e.target.checked }))}
                className="accent-[#145c3f] rounded-sm size-3.5"
              />
              Can review / endorse monthly submissions
            </label>
            {modal === "edit" && (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="accent-[#145c3f] rounded-sm size-3.5"
                />
                Active Status
              </label>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Description</label>
            <textarea
              className="w-full h-16 p-2 rounded-sm border border-[#d4e8dc] text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#25a872] resize-none"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional notes or operational mandate"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#e8f5ee]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModal(null)}
              className="h-8 text-xs rounded-sm border-[#d4e8dc] text-slate-600 px-3 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="h-8 bg-[#145c3f] hover:bg-[#0f442e] text-white text-xs rounded-sm font-medium shadow-2xs px-3 cursor-pointer"
            >
              {saving ? "Saving..." : modal === "create" ? "Create Role" : "Save Changes"}
            </Button>
          </div>
        </form>
      </AdminModal>

      {/* ── Delete Confirmation Dialog ── */}
      <AdminConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Role"
        description={`Are you sure you want to delete role "${deleteTarget?.label}"? This action cannot be undone.`}
        confirmText="Delete Role"
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
