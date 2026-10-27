import * as React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { unitsApi, departmentsApi, type Unit, type Department } from "@/lib/adminApi";
import AdminModal from "./AdminModal";

const inputCls = "w-full pl-3 pr-3 h-11 rounded-xl border border-[#d4e8dc] bg-[#f4f7f5] text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#25a872] focus:border-[#25a872] outline-none transition-all";

export default function AdminUnitsPage() {
  const [units, setUnits] = React.useState<Unit[]>([]);
  const [depts, setDepts] = React.useState<Department[]>([]);
  const [filterDept, setFilterDept] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = React.useState<Unit | null>(null);
  const [form, setForm] = React.useState({ name: "", description: "", department_code: "" });
  const [saving, setSaving] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await unitsApi.list(filterDept || undefined); setUnits(r.data); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  React.useEffect(() => { load(); }, [filterDept]);
  React.useEffect(() => { departmentsApi.list().then(r => setDepts(r.data)).catch(() => {}); }, []);

  const openCreate = () => { setForm({ name: "", description: "", department_code: "" }); setEditing(null); setModal("create"); };
  const openEdit = (u: Unit) => {
    setEditing(u);
    setForm({ name: u.name, description: u.description || "", department_code: u.department_code });
    setModal("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.department_code) { toast.error("Please select a department"); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, description: form.description, department_code: form.department_code };
      if (modal === "create") { await unitsApi.create(payload); toast.success("Unit created"); }
      else if (editing) { await unitsApi.update(editing.unit_code, payload); toast.success("Unit updated"); }
      setModal(null); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (u: Unit) => {
    if (!confirm(`Delete unit "${u.name}"?`)) return;
    try { await unitsApi.delete(u.unit_code); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <select className="h-10 px-3 rounded-xl border border-[#d4e8dc] bg-white text-sm text-slate-700 focus:ring-2 focus:ring-[#25a872] outline-none"
          value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {depts.map(d => <option key={d.department_code} value={d.department_code}>{d.department_code} – {d.name}</option>)}
        </select>
        <Button onClick={openCreate} className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white rounded-xl h-10 gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Add Unit
        </Button>
      </div>

      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                <TableHead className="text-xs font-bold text-slate-600">Code</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Name</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Department</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 hidden md:table-cell">Description</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">Loading...</TableCell></TableRow>
              ) : units.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">No units found</TableCell></TableRow>
              ) : units.map(u => (
                <TableRow key={u.unit_code} className="hover:bg-[#f0fdf7] transition-colors">
                  <TableCell><span className="font-mono text-xs font-bold text-[#145c3f]">{u.unit_code}</span></TableCell>
                  <TableCell className="font-medium text-slate-800">{u.name}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{u.department?.name ?? "—"}</TableCell>
                  <TableCell className="text-slate-400 text-xs hidden md:table-cell">{u.description || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)} className="h-7 w-7 p-0 hover:bg-[#e8f5ee] hover:text-[#145c3f]"><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(u)} className="h-7 w-7 p-0 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdminModal title={modal === "create" ? "Add Unit" : "Edit Unit"} open={modal !== null} onClose={() => setModal(null)}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Name <span className="text-rose-500">*</span></label>
            <input className={inputCls} placeholder="e.g. Claims Processing" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Department <span className="text-rose-500">*</span></label>
            <select className={inputCls} value={form.department_code} onChange={e => setForm(f => ({ ...f, department_code: e.target.value }))} required>
              <option value="">— Select Department —</option>
              {depts.map(d => <option key={d.department_code} value={d.department_code}>{d.department_code} – {d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Description</label>
            <textarea className={`${inputCls} h-auto`} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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
