import * as React from "react";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomTable, { type CustomTableField } from "@/components/CustomTable";
import { departmentsApi, type Department } from "@/lib/adminApi";
import AdminModal from "./AdminModal";
import AdminConfirmDialog from "./AdminConfirmDialog";

export default function AdminDepartmentsPage() {
  const [depts, setDepts] = React.useState<Department[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [modal, setModal] = React.useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = React.useState<Department | null>(null);
  const [form, setForm] = React.useState({ name: "", description: "" });
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Department | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await departmentsApi.list();
      setDepts(r.data);
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
    setForm({ name: "", description: "" });
    setEditing(null);
    setModal("create");
  };

  const openEdit = (d: Department) => {
    setEditing(d);
    setForm({ name: d.name, description: d.description || "" });
    setModal("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === "create") {
        await departmentsApi.create(form as any);
        toast.success("Department created successfully");
      } else if (editing) {
        await departmentsApi.update(editing.department_code, form);
        toast.success("Department updated successfully");
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
      await departmentsApi.delete(deleteTarget.department_code);
      toast.success("Department deleted successfully");
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredDepts = React.useMemo(() => {
    if (!search.trim()) return depts;
    const q = search.toLowerCase();
    return depts.filter(
      d => d.name.toLowerCase().includes(q) || d.department_code.toLowerCase().includes(q) || (d.description && d.description.toLowerCase().includes(q))
    );
  }, [depts, search]);

  const fields: CustomTableField[] = React.useMemo(() => [
    {
      title: "Department Code",
      value: "department_code",
      className: "w-[18%] text-left",
      custom: true,
      component: (d: Department) => (
        <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-sm border border-rose-100">
          {d.department_code}
        </span>
      ),
    },
    {
      title: "Department Name & Mandate",
      value: "name",
      className: "w-[45%] text-left",
      custom: true,
      component: (d: Department) => (
        <div className="min-w-0 truncate">
          <p className="font-semibold text-slate-800 text-xs truncate">{d.name}</p>
          {d.description && (
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{d.description}</p>
          )}
        </div>
      ),
    },
    {
      title: "Operational Units",
      value: "units",
      className: "w-[23%] text-left",
      custom: true,
      component: (d: Department) => (
        <span className="text-[11px] font-medium text-slate-600">
          {Array.isArray(d.units) && d.units.length > 0 ? `${d.units.length} units configured` : "0 units"}
        </span>
      ),
    },
    {
      title: "Actions",
      value: "actions",
      className: "w-[14%] text-right",
      custom: true,
      component: (d: Department) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEdit(d)}
            className="h-6 px-2 text-[11px] font-semibold text-[#145c3f] bg-[#e8f5ee]/70 border border-[#d4e8dc] hover:bg-[#e8f5ee] hover:border-[#145c3f] rounded-sm gap-1 cursor-pointer transition-colors"
          >
            <Pencil className="size-3" />
            <span>Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteTarget(d)}
            className="h-6 px-2 text-[11px] font-semibold text-rose-600 bg-rose-50/70 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 rounded-sm gap-1 cursor-pointer transition-colors"
          >
            <Trash2 className="size-3" />
            <span>Delete</span>
          </Button>
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
            placeholder="Search departments…"
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
          Add Department
        </Button>
      </div>

      {/* ── CustomTable with fitViewport ── */}
      <CustomTable
        data={filteredDepts}
        fields={fields}
        loading={loading}
        fitViewport={true}
        pageSize={15}
        message="No departments found"
      />

      {/* ── Department Modal ── */}
      <AdminModal
        title={modal === "create" ? "Add HQ Department" : "Edit Department"}
        description="Configure institutional directorate structure and operational description."
        open={modal !== null}
        onClose={() => setModal(null)}
        width="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Department Name *</label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Formal Sector Department"
              required
              className="h-8.5 text-xs rounded-sm border-[#d4e8dc] focus-visible:ring-[#25a872]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Description</label>
            <textarea
              className="w-full h-20 p-2 rounded-sm border border-[#d4e8dc] text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#25a872] resize-none"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Mandate and responsibilities"
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
              {saving ? "Saving..." : modal === "create" ? "Create Department" : "Save Changes"}
            </Button>
          </div>
        </form>
      </AdminModal>

      {/* ── Delete Confirmation Dialog ── */}
      <AdminConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Department"
        description={`Are you sure you want to delete department "${deleteTarget?.name}" (${deleteTarget?.department_code})? This action cannot be undone.`}
        confirmText="Delete Department"
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
