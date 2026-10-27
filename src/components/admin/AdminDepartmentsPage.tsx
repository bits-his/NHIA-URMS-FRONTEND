import * as React from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { departmentsApi, type Department } from "@/lib/adminApi";
import AdminModal from "./AdminModal";

const inputCls = "w-full px-3 h-11 rounded-xl border border-[#d4e8dc] bg-[#f4f7f5] text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#25a872] focus:border-[#25a872] outline-none transition-all";

export default function AdminDepartmentsPage() {
  const [depts, setDepts] = React.useState<Department[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [modal, setModal] = React.useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = React.useState<Department | null>(null);
  const [form, setForm] = React.useState({ name: "", description: "" });
  const [saving, setSaving] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await departmentsApi.list(); setDepts(r.data); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  React.useEffect(() => { load(); }, []);

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
      if (modal === "create") { await departmentsApi.create(form as any); toast.success("Department created"); }
      else if (editing) { await departmentsApi.update(editing.department_code, form); toast.success("Department updated"); }
      setModal(null); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (d: Department) => {
    if (!confirm(`Delete department "${d.name}"?`)) return;
    try { await departmentsApi.delete(d.department_code); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const toggleExpand = (code: string) =>
    setExpanded(s => { const n = new Set(s); n.has(code) ? n.delete(code) : n.add(code); return n; });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white rounded-xl h-10 gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Add Department
        </Button>
      </div>

      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                <TableHead className="w-8" />
                <TableHead className="text-xs font-bold text-slate-600">Code</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Name</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 hidden md:table-cell">Description</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Units</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400">Loading...</TableCell></TableRow>
              ) : depts.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400">No departments yet</TableCell></TableRow>
              ) : depts.map(d => (
                <React.Fragment key={d.department_code}>
                  <TableRow className="hover:bg-[#f0fdf7] transition-colors">
                    <TableCell>
                      {(d.units?.length ?? 0) > 0 && (
                        <button onClick={() => toggleExpand(d.department_code)} className="p-0.5 text-slate-400 hover:text-slate-600">
                          {expanded.has(d.department_code) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      )}
                    </TableCell>
                    <TableCell><span className="font-mono text-xs font-bold text-[#145c3f]">{d.department_code}</span></TableCell>
                    <TableCell className="font-medium text-slate-800">{d.name}</TableCell>
                    <TableCell className="text-slate-400 text-xs hidden md:table-cell">{d.description || "—"}</TableCell>
                    <TableCell className="text-slate-500">{d.units?.length ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(d)} className="h-7 w-7 p-0 hover:bg-[#e8f5ee] hover:text-[#145c3f]"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(d)} className="h-7 w-7 p-0 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded.has(d.department_code) && d.units?.map(u => (
                    <TableRow key={u.unit_code} className="bg-blue-50/40">
                      <TableCell />
                      <TableCell className="pl-8 font-mono text-xs text-blue-700">{u.unit_code}</TableCell>
                      <TableCell className="text-xs text-slate-600" colSpan={4}>{u.name}</TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdminModal title={modal === "create" ? "Add Department" : "Edit Department"} open={modal !== null} onClose={() => setModal(null)}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Name <span className="text-rose-500">*</span></label>
            <input className={inputCls} placeholder="e.g. Underwriting" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Description</label>
            <textarea className={`${inputCls} h-auto`} rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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
