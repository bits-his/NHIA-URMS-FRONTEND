import * as React from "react";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import CustomTable, { type CustomTableField } from "@/components/CustomTable";
import { unitsApi, departmentsApi, type Unit, type Department } from "@/lib/adminApi";
import AdminModal from "./AdminModal";
import AdminConfirmDialog from "./AdminConfirmDialog";

export default function AdminUnitsPage() {
  const [units, setUnits] = React.useState<Unit[]>([]);
  const [depts, setDepts] = React.useState<Department[]>([]);
  const [filterDept, setFilterDept] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = React.useState<Unit | null>(null);
  const [form, setForm] = React.useState({ name: "", description: "", department_code: "" });
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Unit | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await unitsApi.list(filterDept || undefined);
      setUnits(r.data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, [filterDept]);

  React.useEffect(() => {
    departmentsApi.list().then(r => setDepts(r.data)).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm({ name: "", description: "", department_code: filterDept || "" });
    setEditing(null);
    setModal("create");
  };

  const openEdit = (u: Unit) => {
    setEditing(u);
    setForm({ name: u.name, description: u.description || "", department_code: u.department_code });
    setModal("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.department_code) {
      toast.error("Please select a department");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name, description: form.description, department_code: form.department_code };
      if (modal === "create") {
        await unitsApi.create(payload);
        toast.success("Operational unit created successfully");
      } else if (editing) {
        await unitsApi.update(editing.unit_code, payload);
        toast.success("Operational unit updated successfully");
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
      await unitsApi.delete(deleteTarget.unit_code);
      toast.success("Operational unit deleted successfully");
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredUnits = React.useMemo(() => {
    if (!search.trim()) return units;
    const q = search.toLowerCase();
    return units.filter(
      u => u.name.toLowerCase().includes(q) || u.unit_code.toLowerCase().includes(q) || (u.department?.name && u.department.name.toLowerCase().includes(q))
    );
  }, [units, search]);

  const fields: CustomTableField[] = React.useMemo(() => [
    {
      title: "Unit Code",
      value: "unit_code",
      className: "w-[18%] text-left",
      custom: true,
      component: (u: Unit) => (
        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-sm border border-teal-100">
          {u.unit_code}
        </span>
      ),
    },
    {
      title: "Unit Name & Scope",
      value: "name",
      className: "w-[40%] text-left",
      custom: true,
      component: (u: Unit) => (
        <div className="min-w-0 truncate">
          <p className="font-semibold text-slate-800 text-xs truncate">{u.name}</p>
          {u.description && (
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{u.description}</p>
          )}
        </div>
      ),
    },
    {
      title: "Parent Department",
      value: "department_code",
      className: "w-[28%] text-left",
      custom: true,
      component: (u: Unit) => (
        <span className="text-[11px] font-medium text-slate-700 truncate block">
          {u.department?.name || u.department_code || "—"}
        </span>
      ),
    },
    {
      title: "Actions",
      value: "actions",
      className: "w-[14%] text-right",
      custom: true,
      component: (u: Unit) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEdit(u)}
            className="h-6 px-2 text-[11px] font-semibold text-[#145c3f] bg-[#e8f5ee]/70 border border-[#d4e8dc] hover:bg-[#e8f5ee] hover:border-[#145c3f] rounded-sm gap-1 cursor-pointer transition-colors"
          >
            <Pencil className="size-3" />
            <span>Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteTarget(u)}
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
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search units or codes…"
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

          <div className="w-[160px]">
            <Select
              value={filterDept || "ALL"}
              onValueChange={v => setFilterDept(v === "ALL" ? "" : v)}
            >
              <SelectTrigger
                size="sm"
                displayValue={filterDept ? (depts.find(d => d.department_code === filterDept)?.name || filterDept) : "All Departments"}
                className="h-8.5 rounded-sm border-[#d4e8dc] bg-white text-xs font-medium shadow-2xs truncate"
              >
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                {depts.map(d => (
                  <SelectItem key={d.department_code} value={d.department_code}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          size="sm"
          onClick={openCreate}
          className="h-8.5 bg-[#145c3f] hover:bg-[#0f442e] text-white rounded-sm text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer px-3 shrink-0"
        >
          <Plus className="size-3.5" />
          Add Unit
        </Button>
      </div>

      {/* ── CustomTable with fitViewport ── */}
      <CustomTable
        data={filteredUnits}
        fields={fields}
        loading={loading}
        fitViewport={true}
        pageSize={15}
        message="No operational units found"
      />

      {/* ── Unit Modal ── */}
      <AdminModal
        title={modal === "create" ? "Add Operational Unit" : "Edit Operational Unit"}
        description="Configure unit designation and associate with an HQ parent department."
        open={modal !== null}
        onClose={() => setModal(null)}
        width="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Parent Department *</label>
            <Select
              value={form.department_code}
              onValueChange={v => setForm(f => ({ ...f, department_code: v }))}
            >
              <SelectTrigger
                size="sm"
                displayValue={depts.find(d => d.department_code === form.department_code)?.name || (form.department_code ? form.department_code : "— Select Department —")}
                className="h-8.5 text-xs rounded-sm border-[#d4e8dc] bg-white font-medium"
              >
                <SelectValue placeholder="— Select Department —" />
              </SelectTrigger>
              <SelectContent>
                {depts.map(d => (
                  <SelectItem key={d.department_code} value={d.department_code}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Unit Name *</label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Formal Claims Review Unit"
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
              placeholder="Operational responsibilities"
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
              {saving ? "Saving..." : modal === "create" ? "Create Unit" : "Save Changes"}
            </Button>
          </div>
        </form>
      </AdminModal>

      {/* ── Delete Confirmation Dialog ── */}
      <AdminConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Operational Unit"
        description={`Are you sure you want to delete unit "${deleteTarget?.name}" (${deleteTarget?.unit_code})? This action cannot be undone.`}
        confirmText="Delete Unit"
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
