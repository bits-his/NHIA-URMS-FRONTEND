import * as React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { statesApi, zonesApi, type StateOffice, type ZonalOffice } from "@/lib/adminApi";
import AdminModal from "./AdminModal";

const inputCls = "w-full pl-3 pr-3 h-11 rounded-xl border border-[#d4e8dc] bg-[#f4f7f5] text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#25a872] focus:border-[#25a872] outline-none transition-all";

export default function AdminStatesPage() {
  const [states, setStates] = React.useState<StateOffice[]>([]);
  const [zones, setZones] = React.useState<ZonalOffice[]>([]);
  const [filterZone, setFilterZone] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = React.useState<StateOffice | null>(null);
  const [form, setForm] = React.useState({ code: "", description: "", zonal_id: "", is_hq: false, is_zonal_office: false });
  const [saving, setSaving] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await statesApi.list(filterZone ? Number(filterZone) : undefined); setStates(r.data); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  React.useEffect(() => { load(); }, [filterZone]);
  React.useEffect(() => { zonesApi.list().then(r => setZones(r.data)).catch(() => {}); }, []);

  const openCreate = () => { setForm({ code: "", description: "", zonal_id: "", is_hq: false, is_zonal_office: false }); setEditing(null); setModal("create"); };
  const openEdit = (s: StateOffice) => {
    setEditing(s);
    setForm({
      code: s.code,
      description: s.description,
      zonal_id: String(s.zonal_id),
      is_hq: Boolean(s.is_hq),
      is_zonal_office: Boolean(s.is_zonal_office),
    });
    setModal("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.zonal_id) { toast.error("Please select a zone"); return; }
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        description: form.description,
        zonal_id: Number(form.zonal_id),
        is_hq: form.is_hq,
        is_zonal_office: form.is_zonal_office,
      };
      if (modal === "create") { await statesApi.create(payload); toast.success("State created"); }
      else if (editing) { await statesApi.update(editing.id, payload); toast.success("State updated"); }
      setModal(null); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (s: StateOffice) => {
    if (!confirm(`Delete state "${s.code}"?`)) return;
    try { await statesApi.delete(s.id); toast.success("State deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <select className="h-10 px-3 rounded-xl border border-[#d4e8dc] bg-white text-sm text-slate-700 focus:ring-2 focus:ring-[#25a872] outline-none"
          value={filterZone} onChange={e => setFilterZone(e.target.value)}>
          <option value="">All Zones</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.zonal_code} – {z.description}</option>)}
        </select>
        <Button onClick={openCreate} className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white rounded-xl h-10 gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Add State
        </Button>
      </div>

      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                <TableHead className="text-xs font-bold text-slate-600">Code</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Description</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Zone</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Office type</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">Loading...</TableCell></TableRow>
              ) : states.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">No states found</TableCell></TableRow>
              ) : states.map(s => (
                <TableRow key={s.id} className="hover:bg-[#f0fdf7] transition-colors">
                  <TableCell><span className="font-mono text-xs font-bold text-[#145c3f]">{s.code}</span></TableCell>
                  <TableCell className="font-medium text-slate-800">{s.description}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{s.zone?.zonal_code ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {s.is_hq ? <span className="rounded-md bg-[#145c3f] px-2 py-0.5 text-[10px] font-semibold text-white">HQ</span> : null}
                      {s.is_zonal_office ? <span className="rounded-md bg-[#e8f5ee] px-2 py-0.5 text-[10px] font-semibold text-[#0f3d2e]">Zonal office</span> : null}
                      {!s.is_hq && !s.is_zonal_office ? <span className="text-xs text-slate-400">State office</span> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="h-7 w-7 p-0 hover:bg-[#e8f5ee] hover:text-[#145c3f]"><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(s)} className="h-7 w-7 p-0 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdminModal title={modal === "create" ? "Add State Office" : "Edit State Office"} open={modal !== null} onClose={() => setModal(null)}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">State Code <span className="text-rose-500">*</span></label>
            <input className={inputCls} placeholder="e.g. LAGOS" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Description <span className="text-rose-500">*</span></label>
            <input className={inputCls} placeholder="e.g. Lagos State Office" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Zone <span className="text-rose-500">*</span></label>
            <select className={inputCls} value={form.zonal_id} onChange={e => setForm(f => ({ ...f, zonal_id: e.target.value }))} required>
              <option value="">— Select Zone —</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.zonal_code} – {z.description}</option>)}
            </select>
          </div>
          <fieldset className="space-y-2 rounded-xl border border-[#d4e8dc] bg-[#f4f7f5] px-3 py-3">
            <legend className="px-1 text-xs font-bold uppercase tracking-wider text-slate-600">Office type</legend>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_hq}
                onChange={e => setForm(f => ({ ...f, is_hq: e.target.checked }))}
                className="accent-[#145c3f]"
              />
              Headquarters (HQ)
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_zonal_office}
                onChange={e => setForm(f => ({ ...f, is_zonal_office: e.target.checked }))}
                className="accent-[#145c3f]"
              />
              Zonal office
            </label>
            <p className="text-[11px] text-slate-500">Leave both unchecked for a regular state office. Either or both can be marked.</p>
          </fieldset>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)} className="rounded-xl text-slate-600">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white rounded-xl">
              {saving ? "Saving..." : modal === "create" ? "Create" : "Save"}
            </Button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
