import * as React from "react";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomTable, { type CustomTableField } from "@/components/CustomTable";
import { zonesApi, type ZonalOffice } from "@/lib/adminApi";
import AdminModal from "./AdminModal";
import AdminConfirmDialog from "./AdminConfirmDialog";

export default function AdminZonesPage() {
  const [zones, setZones] = React.useState<ZonalOffice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [modal, setModal] = React.useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = React.useState<ZonalOffice | null>(null);
  const [form, setForm] = React.useState({ zonal_code: "", description: "" });
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ZonalOffice | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await zonesApi.list();
      setZones(r.data);
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
    setForm({ zonal_code: "", description: "" });
    setEditing(null);
    setModal("create");
  };

  const openEdit = (z: ZonalOffice) => {
    setEditing(z);
    setForm({ zonal_code: z.zonal_code, description: z.description });
    setModal("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === "create") {
        await zonesApi.create(form);
        toast.success("Zonal office created successfully");
      } else if (editing) {
        await zonesApi.update(editing.zonal_code, { description: form.description });
        toast.success("Zonal office updated successfully");
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
      await zonesApi.delete(deleteTarget.zonal_code);
      toast.success("Zonal office deleted successfully");
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredZones = React.useMemo(() => {
    if (!search.trim()) return zones;
    const q = search.toLowerCase();
    return zones.filter(
      z => z.zonal_code.toLowerCase().includes(q) || z.description.toLowerCase().includes(q)
    );
  }, [zones, search]);

  const fields: CustomTableField[] = React.useMemo(() => [
    {
      title: "Zone Code",
      value: "zonal_code",
      className: "w-[18%] text-left",
      custom: true,
      component: (z: ZonalOffice) => (
        <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-sm border border-sky-100">
          {z.zonal_code}
        </span>
      ),
    },
    {
      title: "Geopolitical Description",
      value: "description",
      className: "w-[45%] text-left",
      custom: true,
      component: (z: ZonalOffice) => (
        <span className="font-semibold text-slate-800 text-xs">
          {z.description}
        </span>
      ),
    },
    {
      title: "State Offices Under Zone",
      value: "states",
      className: "w-[23%] text-left",
      custom: true,
      component: (z: ZonalOffice) => (
        <span className="text-[11px] font-medium text-slate-600">
          {Array.isArray(z.states) ? `${z.states.length} state branches` : "—"}
        </span>
      ),
    },
    {
      title: "Actions",
      value: "actions",
      className: "w-[14%] text-right",
      custom: true,
      component: (z: ZonalOffice) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEdit(z)}
            className="h-6 px-2 text-[11px] font-semibold text-[#145c3f] bg-[#e8f5ee]/70 border border-[#d4e8dc] hover:bg-[#e8f5ee] hover:border-[#145c3f] rounded-sm gap-1 cursor-pointer transition-colors"
          >
            <Pencil className="size-3" />
            <span>Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteTarget(z)}
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
            placeholder="Search geopolitical zones…"
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
          Add Zonal Office
        </Button>
      </div>

      {/* ── CustomTable with fitViewport ── */}
      <CustomTable
        data={filteredZones}
        fields={fields}
        loading={loading}
        fitViewport={true}
        pageSize={15}
        message="No zonal offices found"
      />

      {/* ── Zone Modal ── */}
      <AdminModal
        title={modal === "create" ? "Add Zonal Office" : "Edit Zonal Office"}
        description="Configure geopolitical zone routing codes and administrative designations."
        open={modal !== null}
        onClose={() => setModal(null)}
        width="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Zonal Code *</label>
            <Input
              value={form.zonal_code}
              onChange={e => setForm(f => ({ ...f, zonal_code: e.target.value.toUpperCase() }))}
              placeholder="e.g. NW"
              disabled={modal === "edit"}
              required
              className="h-8.5 text-xs rounded-sm border-[#d4e8dc] focus-visible:ring-[#25a872]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Description *</label>
            <Input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. North West"
              required
              className="h-8.5 text-xs rounded-sm border-[#d4e8dc] focus-visible:ring-[#25a872]"
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
              {saving ? "Saving..." : modal === "create" ? "Create Zone" : "Save Changes"}
            </Button>
          </div>
        </form>
      </AdminModal>

      {/* ── Delete Confirmation Dialog ── */}
      <AdminConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Geopolitical Zone"
        description={`Are you sure you want to delete zone "${deleteTarget?.zonal_code}" (${deleteTarget?.description})? This action cannot be undone.`}
        confirmText="Delete Zone"
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
