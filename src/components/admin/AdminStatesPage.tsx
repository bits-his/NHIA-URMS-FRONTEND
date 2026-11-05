import * as React from "react";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import CustomTable, { type CustomTableField } from "@/components/CustomTable";
import { statesApi, zonesApi, type StateOffice, type ZonalOffice } from "@/lib/adminApi";
import AdminModal from "./AdminModal";
import AdminConfirmDialog from "./AdminConfirmDialog";

export default function AdminStatesPage() {
  const [states, setStates] = React.useState<StateOffice[]>([]);
  const [zones, setZones] = React.useState<ZonalOffice[]>([]);
  const [filterZone, setFilterZone] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = React.useState<StateOffice | null>(null);
  const [form, setForm] = React.useState({
    code: "",
    description: "",
    zonal_code: "",
    is_hq: false,
    is_zonal_office: false,
  });
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<StateOffice | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await statesApi.list(filterZone || undefined);
      setStates(r.data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, [filterZone]);

  React.useEffect(() => {
    zonesApi.list().then(r => setZones(r.data)).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm({ code: "", description: "", zonal_code: "", is_hq: false, is_zonal_office: false });
    setEditing(null);
    setModal("create");
  };

  const openEdit = (s: StateOffice) => {
    setEditing(s);
    setForm({
      code: s.code,
      description: s.description,
      zonal_code: s.zonal_code,
      is_hq: Boolean(s.is_hq),
      is_zonal_office: Boolean(s.is_zonal_office),
    });
    setModal("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.zonal_code) {
      toast.error("Please select a geopolitical zone");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        description: form.description,
        zonal_code: form.zonal_code,
        is_hq: form.is_hq,
        is_zonal_office: form.is_zonal_office,
      };
      if (modal === "create") {
        await statesApi.create({ ...payload, code: form.code.toUpperCase() });
        toast.success("State office created successfully");
      } else if (editing) {
        await statesApi.update(editing.code, payload);
        toast.success("State office updated successfully");
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
      await statesApi.delete(deleteTarget.code);
      toast.success("State office deleted successfully");
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredStates = React.useMemo(() => {
    if (!search.trim()) return states;
    const q = search.toLowerCase();
    return states.filter(
      s => s.code.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.zonal_code.toLowerCase().includes(q)
    );
  }, [states, search]);

  const fields: CustomTableField[] = React.useMemo(() => [
    {
      title: "State Code",
      value: "code",
      className: "w-[15%] text-left",
      custom: true,
      component: (s: StateOffice) => (
        <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-sm border border-amber-100">
          {s.code}
        </span>
      ),
    },
    {
      title: "State Office / Description",
      value: "description",
      className: "w-[35%] text-left",
      custom: true,
      component: (s: StateOffice) => (
        <span className="font-semibold text-slate-800 text-xs">
          {s.description}
        </span>
      ),
    },
    {
      title: "Geopolitical Zone",
      value: "zonal_code",
      className: "w-[18%] text-left",
      custom: true,
      component: (s: StateOffice) => (
        <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded-sm border border-sky-100">
          Zone {s.zonal_code}
        </span>
      ),
    },
    {
      title: "Office Designation",
      value: "is_hq",
      className: "w-[18%] text-left",
      custom: true,
      component: (s: StateOffice) => (
        <div className="flex items-center gap-1 flex-wrap">
          {s.is_hq && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-sm bg-purple-50 text-purple-700 border border-purple-100">
              National HQ
            </span>
          )}
          {s.is_zonal_office && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-sm bg-blue-50 text-blue-700 border border-blue-100">
              Zonal Office
            </span>
          )}
          {!s.is_hq && !s.is_zonal_office && (
            <span className="text-[11px] text-slate-400">State Branch</span>
          )}
        </div>
      ),
    },
    {
      title: "Actions",
      value: "actions",
      className: "w-[14%] text-right",
      custom: true,
      component: (s: StateOffice) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEdit(s)}
            className="h-6 px-2 text-[11px] font-semibold text-[#145c3f] bg-[#e8f5ee]/70 border border-[#d4e8dc] hover:bg-[#e8f5ee] hover:border-[#145c3f] rounded-sm gap-1 cursor-pointer transition-colors"
          >
            <Pencil className="size-3" />
            <span>Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteTarget(s)}
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
              placeholder="Search states or codes…"
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

          <div className="w-[140px]">
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
        </div>

        <Button
          size="sm"
          onClick={openCreate}
          className="h-8.5 bg-[#145c3f] hover:bg-[#0f442e] text-white rounded-sm text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer px-3 shrink-0"
        >
          <Plus className="size-3.5" />
          Add State Office
        </Button>
      </div>

      {/* ── CustomTable with fitViewport ── */}
      <CustomTable
        data={filteredStates}
        fields={fields}
        loading={loading}
        fitViewport={true}
        pageSize={15}
        message="No state offices found"
      />

      {/* ── State Modal (Normal Code Select - Not Native) ── */}
      <AdminModal
        title={modal === "create" ? "Add State Office" : "Edit State Office"}
        description="Configure state branch geopolitical routing, code designator, and regional hub status."
        open={modal !== null}
        onClose={() => setModal(null)}
        width="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">State Code *</label>
            <Input
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. KN or FCT"
              disabled={modal === "edit"}
              required
              className="h-8.5 text-xs rounded-sm border-[#d4e8dc] focus-visible:ring-[#25a872]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">State Name / Description *</label>
            <Input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Kano State"
              required
              className="h-8.5 text-xs rounded-sm border-[#d4e8dc] focus-visible:ring-[#25a872]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Geopolitical Zone *</label>
            <Select
              value={form.zonal_code}
              onValueChange={v => setForm(f => ({ ...f, zonal_code: v }))}
            >
              <SelectTrigger
                size="sm"
                displayValue={zones.find(z => z.zonal_code === form.zonal_code)?.description || (form.zonal_code ? form.zonal_code : "— Select Zone —")}
                className="h-8.5 text-xs rounded-sm border-[#d4e8dc] bg-white font-medium"
              >
                <SelectValue placeholder="— Select Zone —" />
              </SelectTrigger>
              <SelectContent>
                {zones.map(z => (
                  <SelectItem key={z.zonal_code} value={z.zonal_code}>
                    {z.description} ({z.zonal_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2 border-t border-[#e8f5ee] space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_hq}
                onChange={e => setForm(f => ({ ...f, is_hq: e.target.checked }))}
                className="accent-[#145c3f] rounded-sm size-3.5"
              />
              Designate as National Headquarters
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_zonal_office}
                onChange={e => setForm(f => ({ ...f, is_zonal_office: e.target.checked }))}
                className="accent-[#145c3f] rounded-sm size-3.5"
              />
              Designate as Zonal Office Hub
            </label>
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
              {saving ? "Saving..." : modal === "create" ? "Create State Office" : "Save Changes"}
            </Button>
          </div>
        </form>
      </AdminModal>

      {/* ── Delete Confirmation Dialog ── */}
      <AdminConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete State Office"
        description={`Are you sure you want to delete state office "${deleteTarget?.description}" (${deleteTarget?.code})? This action cannot be undone.`}
        confirmText="Delete State Office"
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
