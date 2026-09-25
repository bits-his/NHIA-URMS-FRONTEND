import * as React from "react";
import { Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usersApi, type AdminUser } from "@/lib/adminApi";
import AdminModal from "./AdminModal";
import ModuleAccessPicker from "./ModuleAccessPicker";
import { MODULE_CONFIG, moduleConfigForAccess, resolveModuleTitle } from "@/src/access/moduleConfig";
import { normalizeFunctionalityTitle } from "@/src/access/accessUtils";
import {
  buildAccessPayload,
  countGrantedParents,
  selectAllPrivilegeKeys,
} from "@/src/access/privilegeTree";

const ROLE_LABELS: Record<string, string> = {
  "state-officer": "State Officer",
  "zonal-coordinator": "Zonal Coordinator",
  "state-coordinator": "State Coordinator",
  "department-officer": "Department Officer",
  "sdo": "SDO", "hq-department": "HQ Department", "dg-ceo": "DG-CEO", "admin": "Admin",
};
const ROLE_COLORS: Record<string, string> = {
  "admin": "bg-purple-100 text-purple-700 border-purple-200",
  "dg-ceo": "bg-rose-100 text-rose-700 border-rose-200",
  "zonal-coordinator": "bg-blue-100 text-blue-700 border-blue-200",
  "state-coordinator": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "department-officer": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "hq-department": "bg-amber-100 text-amber-700 border-amber-200",
  "sdo": "bg-[#e8f5ee] text-[#145c3f] border-[#d4e8dc]",
  "state-officer": "bg-slate-100 text-slate-700 border-slate-200",
};

export default function AdminPrivilegesPage() {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<AdminUser | null>(null);
  const [granted, setGranted] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await usersApi.list({ search: search || undefined });
      setUsers(r.data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, [search]);

  const openPrivileges = (u: AdminUser) => {
    setSelected(u);
    const keys = new Set<string>();
    const accessArr = Array.isArray(u.functionalities) ? u.functionalities : [];
    accessArr.forEach((entry: any) => {
      if (!entry?.access_to) return;
      const mod = moduleConfigForAccess(entry.access_to);
      if (!mod) return;
      keys.add(mod.title);
      if (Array.isArray(entry.functionalities)) {
        entry.functionalities.forEach((funcTitle: string) => {
          keys.add(normalizeFunctionalityTitle(funcTitle, mod.title));
        });
      }
    });
    setGranted(keys);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const access = buildAccessPayload(granted);
      await usersApi.updatePrivileges(selected.id, access as any);
      toast.success(`Privileges updated for ${selected.name}`);
      setSelected(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const parentCount = countGrantedParents(granted);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          className="w-full pl-9 pr-3 h-10 rounded-xl border border-[#d4e8dc] bg-white text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#25a872] outline-none transition-all"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                <TableHead className="text-xs font-bold text-slate-600">Name</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Staff ID</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Role</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Modules Granted</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">Loading...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">No users found</TableCell></TableRow>
              ) : users.map((u) => {
                const accessArr = Array.isArray(u.functionalities) ? u.functionalities : [];
                const parents = accessArr.filter((e: any) => e?.access_to);
                return (
                  <TableRow key={u.id} className="hover:bg-[#f0fdf7] transition-colors">
                    <TableCell className="font-medium text-slate-800">{u.name}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{u.staff_id}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] border ${ROLE_COLORS[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {parents.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No modules assigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {parents.map((entry: any) => {
                            const mod = moduleConfigForAccess(entry.access_to);
                            return (
                              <span
                                key={entry.access_to}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#e8f5ee] text-[#145c3f] border border-[#d4e8dc]"
                              >
                                {mod?.title ?? resolveModuleTitle(entry.access_to)}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPrivileges(u)}
                        className="h-8 gap-1.5 text-xs hover:bg-[#e8f5ee] hover:text-[#145c3f]"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdminModal title={`Module Access — ${selected?.name ?? ""}`} open={selected !== null} onClose={() => setSelected(null)} width="max-w-2xl">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f4f7f5] border border-[#d4e8dc]">
              <div className="w-9 h-9 rounded-full bg-[#25a872] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {selected.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{selected.name}</p>
                <p className="text-xs text-slate-500">{selected.staff_id} · {ROLE_LABELS[selected.role] ?? selected.role}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs font-bold text-[#145c3f]">{parentCount} modules</p>
                <p className="text-[10px] text-slate-400">{granted.size - parentCount} pages</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Module Access</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setGranted(selectAllPrivilegeKeys())} className="text-xs text-[#145c3f] hover:underline font-medium">Select all</button>
                <span className="text-slate-300">|</span>
                <button type="button" onClick={() => setGranted(new Set())} className="text-xs text-rose-500 hover:underline font-medium">Clear all</button>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto pr-1">
              <ModuleAccessPicker granted={granted} onChange={setGranted} />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-[#d4e8dc]">
              <Button type="button" variant="ghost" onClick={() => setSelected(null)} className="rounded-xl text-slate-600">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white rounded-xl">
                {saving ? "Saving..." : "Save Privileges"}
              </Button>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
