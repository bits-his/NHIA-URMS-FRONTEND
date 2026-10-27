import * as React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { zonesApi, type ZonalOffice } from "@/lib/adminApi";
import AdminModal from "./AdminModal";

const inputCls = "w-full pl-3 pr-3 h-11 rounded-xl border border-[#d4e8dc] bg-[#f4f7f5] text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#25a872] focus:border-[#25a872] outline-none transition-all";

export default function AdminZonesPage() {
  const [zones, setZones] = React.useState<ZonalOffice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = React.useState<ZonalOffice | null>(null);
  const [form, setForm] = React.useState({ zonal_code: "", description: "" });
  const [saving, setSaving] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await zonesApi.list(); setZones(r.data); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  React.useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ zonal_code: "", description: "" }); setEditing(null); setModal("create"); };
  const openEdit = (z: ZonalOffice) => { setEditing(z); setForm({ zonal_code: z.zonal_code, description: z.description }); setModal("edit"); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === "create") { await zonesApi.create(form); toast.success("Zone created"); }
      else if (editing) { await zonesApi.update(editing.zonal_code, { description: form.description }); toast.success("Zone updated"); }
      setModal(null); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (z: ZonalOffice) => {
    if (!confirm(`Delete zone "${z.zonal_code}"?`)) return;
    try { await zonesApi.delete(z.zonal_code); toast.success("Zone deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white rounded-xl h-10 gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Add Zone
        </Button>
      </div>

      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                <TableHead className="text-xs font-bold text-slate-600">Code</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Description</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">States</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400">Loading...</TableCell></TableRow>
              ) : zones.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400">No zones yet</TableCell></TableRow>
              ) : zones.map(z => (
                <TableRow key={z.zonal_code} className="hover:bg-[#f0fdf7] transition-colors">
                  <TableCell><span className="font-mono text-xs font-bold text-[#145c3f]">{z.zonal_code}</span></TableCell>
                  <TableCell className="font-medium text-slate-800">{z.description}</TableCell>
                  <TableCell>
                    <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[10px]">{z.states?.length ?? 0} states</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(z)} className="h-7 w-7 p-0 hover:bg-[#e8f5ee] hover:text-[#145c3f]"><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(z)} className="h-7 w-7 p-0 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdminModal title={modal === "create" ? "Add Zonal Office" : "Edit Zonal Office"} open={modal !== null} onClose={() => setModal(null)}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Zonal Code <span className="text-rose-500">*</span></label>
            <input className={inputCls} placeholder="e.g. NW" value={form.zonal_code} onChange={e => setForm(f => ({ ...f, zonal_code: e.target.value }))} required disabled={modal === "edit"} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Description <span className="text-rose-500">*</span></label>
            <input className={inputCls} placeholder="e.g. Northwest" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
          </div>
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
