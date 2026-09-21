import * as React from "react";
import { ArrowLeft, Plus, Pencil, Save, X, Loader2, PackageSearch, Ban, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stockApi } from "@/lib/api";
import { useCreateReviewAccess } from "@/src/access/createReviewAccess";

const ALL = "all";

const isAssetActive = (v: unknown) => v === true || v === 1;

interface Option { id: number; label: string; }

interface Asset {
  id: number;
  item_class: string;
  item_description: string;
  asset_tag: string | null;
  book_balance: number;
  state_id: number;
  unit_id: number | null;
  is_active?: boolean;
  state?: { description: string; zonal_id?: number };
  unit?: { name: string; department_id?: number };
}

interface AssetForm {
  zone_id: string;
  state_id: string;
  department_id: string;
  unit_id: string;
  item_class: string;
  item_description: string;
  asset_tag: string;
  book_balance: string;
}

const emptyForm = (): AssetForm => ({
  zone_id: "", state_id: "", department_id: "", unit_id: "",
  item_class: "", item_description: "", asset_tag: "", book_balance: "1",
});

const STATUS_FILTER_OPTIONS = [
  { value: ALL,      label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

const statusLabel = (value: string) =>
  STATUS_FILTER_OPTIONS.find(s => s.value === value)?.label ?? "All Statuses";

const labelOf = (options: Option[], value: string, fallback: string) =>
  value && value !== ALL ? (options.find(o => String(o.id) === value)?.label ?? fallback) : fallback;

interface Props { onBack: () => void; }

export default function StockAssetManager({ onBack }: Props) {
  const { canCreate, createOnly } = useCreateReviewAccess();
  const [zones,       setZones]       = React.useState<Option[]>([]);
  const [states,      setStates]      = React.useState<Option[]>([]);
  const [assets,      setAssets]      = React.useState<Asset[]>([]);
  const [loading,     setLoading]     = React.useState(!createOnly);

  const [filterZone,    setFilterZone]    = React.useState(ALL);
  const [filterState,   setFilterState]   = React.useState(ALL);
  const [filterStatus,  setFilterStatus]  = React.useState(ALL);

  const [showForm,    setShowForm]    = React.useState(createOnly);
  const [editId,      setEditId]      = React.useState<number | null>(null);
  const [form,        setForm]        = React.useState<AssetForm>(emptyForm());
  const [formStates,  setFormStates]  = React.useState<Option[]>([]);
  const [formDepts,   setFormDepts]   = React.useState<Option[]>([]);
  const [formUnits,   setFormUnits]   = React.useState<Option[]>([]);
  const [saving,      setSaving]      = React.useState(false);

  React.useEffect(() => {
    stockApi.getZones().then(r =>
      setZones(r.data.map((z: any) => ({ id: z.id, label: z.description })))
    ).catch(() => {});
  }, []);

  React.useEffect(() => {
    stockApi.getStates(filterZone === ALL ? undefined : filterZone).then(r => {
      const list = r.data.map((s: any) => ({ id: s.id, label: s.description }));
      setStates(list);
      setFilterState(prev =>
        prev === ALL || list.some(s => String(s.id) === prev) ? prev : ALL
      );
    }).catch(() => {});
  }, [filterZone]);

  const loadFilteredAssets = React.useCallback(async () => {
    if (createOnly) return;
    setLoading(true);
    try {
      const status = filterStatus === ALL ? "all" : filterStatus as "active" | "inactive";
      const r = await stockApi.getAssets(
        filterState !== ALL ? filterState : undefined,
        undefined,
        status,
      );
      let data: Asset[] = r.data.map((a: any) => ({
        ...a,
        is_active: isAssetActive(a.is_active),
      }));
      if (filterState === ALL && filterZone !== ALL) {
        const zoneStateIds = new Set(states.map(s => s.id));
        data = data.filter(a => zoneStateIds.has(a.state_id));
      }
      setAssets(data);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [filterZone, filterState, filterStatus, states, createOnly]);

  React.useEffect(() => { if (!createOnly) loadFilteredAssets(); }, [loadFilteredAssets, createOnly]);

  const loadFormStates = async (zoneId: string) => {
    if (!zoneId) { setFormStates([]); return []; }
    const r = await stockApi.getStates(zoneId);
    const list = r.data.map((s: any) => ({ id: s.id, label: s.description }));
    setFormStates(list);
    return list;
  };

  const loadFormDepartments = async (stateId: string) => {
    if (!stateId) { setFormDepts([]); return []; }
    const r = await stockApi.getDepartments(stateId);
    const list = r.data.map((d: any) => ({ id: d.id, label: d.name }));
    setFormDepts(list);
    return list;
  };

  const loadFormUnits = async (departmentId: string) => {
    if (!departmentId) { setFormUnits([]); return []; }
    const r = await stockApi.getUnits(departmentId);
    const list = r.data.map((u: any) => ({ id: u.id, label: u.name }));
    setFormUnits(list);
    return list;
  };

  const handleFormZone = async (zoneId: string) => {
    setForm(p => ({ ...p, zone_id: zoneId, state_id: "", department_id: "", unit_id: "" }));
    setFormDepts([]); setFormUnits([]);
    await loadFormStates(zoneId);
  };

  const handleFormState = async (stateId: string) => {
    setForm(p => ({ ...p, state_id: stateId, department_id: "", unit_id: "" }));
    setFormUnits([]);
    await loadFormDepartments(stateId);
  };

  const handleFormDepartment = async (departmentId: string) => {
    setForm(p => ({ ...p, department_id: departmentId, unit_id: "" }));
    await loadFormUnits(departmentId);
  };

  const findZoneForState = async (stateId: number): Promise<string> => {
    for (const z of zones) {
      const r = await stockApi.getStates(z.id);
      if (r.data.some((s: any) => s.id === stateId)) return String(z.id);
    }
    return "";
  };

  const resolveDepartmentForUnit = async (stateId: string, unitId: string): Promise<string> => {
    const depts = await stockApi.getDepartments(stateId);
    for (const d of depts.data) {
      const u = await stockApi.getUnits(d.id);
      if (u.data.some((x: any) => String(x.id) === unitId)) return String(d.id);
    }
    return "";
  };

  const closeForm = () => {
    if (createOnly) {
      setEditId(null);
      setForm(emptyForm());
      setFormStates([]);
      setFormDepts([]);
      setFormUnits([]);
      setShowForm(true);
      return;
    }
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm());
    setFormStates([]);
    setFormDepts([]);
    setFormUnits([]);
  };

  const cancelForm = () => {
    if (createOnly) {
      onBack();
      return;
    }
    closeForm();
  };

  const openCreate = () => {
    if (!canCreate) return;
    setEditId(null);
    setForm(emptyForm());
    setFormStates([]);
    setFormDepts([]);
    setFormUnits([]);
    setShowForm(true);
  };

  const openEdit = async (a: Asset) => {
    setEditId(a.id);
    const zoneId = await findZoneForState(a.state_id);
    let deptId = "";
    if (a.unit_id) {
      deptId = await resolveDepartmentForUnit(String(a.state_id), String(a.unit_id));
    }

    if (zoneId) await loadFormStates(zoneId);
    if (a.state_id) await loadFormDepartments(String(a.state_id));
    if (deptId) await loadFormUnits(deptId);

    setForm({
      zone_id: zoneId,
      state_id: String(a.state_id),
      department_id: deptId,
      unit_id: a.unit_id ? String(a.unit_id) : "",
      item_class: a.item_class,
      item_description: a.item_description,
      asset_tag: a.asset_tag || "",
      book_balance: String(a.book_balance),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.zone_id || !form.state_id || !form.item_class || !form.item_description) {
      toast.error("Zone, State, Item Class and Description are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        state_id:         Number(form.state_id),
        unit_id:          form.unit_id ? Number(form.unit_id) : null,
        item_class:       form.item_class,
        item_description: form.item_description,
        asset_tag:        form.asset_tag || null,
        book_balance:     parseInt(form.book_balance) || 1,
      };

      if (editId) {
        await stockApi.updateAsset(editId, payload);
        toast.success("Asset updated");
      } else {
        await stockApi.createAsset(payload);
        toast.success("Asset created");
      }

      closeForm();
      setFilterZone(form.zone_id);
      setFilterState(form.state_id);
    } catch (err: any) {
      toast.error("Failed to save", { description: err.message });
    } finally { setSaving(false); }
  };

  const handleSetActive = async (id: number, is_active: boolean) => {
    const action = is_active ? "reactivate" : "deactivate";
    if (!window.confirm(`${is_active ? "Reactivate" : "Deactivate"} this asset?`)) return;
    try {
      await stockApi.setAssetStatus(id, is_active);
      toast.success(is_active ? "Asset reactivated" : "Asset deactivated");
      loadFilteredAssets();
    } catch (err: any) {
      toast.error(`Failed to ${action} asset`, { description: err.message });
    }
  };

  const f = (k: keyof AssetForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const showStateColumn = filterState === ALL;
  const listTitle = loading
    ? "Loading..."
    : `${assets.length} asset${assets.length !== 1 ? "s" : ""}`;

  const formCard = (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="rounded-2xl border-primary/30 shadow-md">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">{editId ? "Edit Asset" : "New Asset"}</CardTitle>
            <CardDescription className="text-xs">Register an asset under zone → state → department → unit</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={cancelForm} className="h-7 w-7">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Zone <span className="text-red-500">*</span></Label>
              <Select value={form.zone_id} onValueChange={handleFormZone}>
                <SelectTrigger className="w-full"
                  displayValue={labelOf(zones, form.zone_id, "Select Zone")}>
                  <SelectValue placeholder="Select Zone" />
                </SelectTrigger>
                <SelectContent>{zones.map(z => <SelectItem key={z.id} value={String(z.id)}>{z.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">State <span className="text-red-500">*</span></Label>
              <Select value={form.state_id} onValueChange={handleFormState} disabled={!form.zone_id}>
                <SelectTrigger className="w-full"
                  displayValue={labelOf(formStates, form.state_id, "Select State")}>
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>{formStates.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Department</Label>
              <Select value={form.department_id} onValueChange={handleFormDepartment} disabled={!form.state_id}>
                <SelectTrigger className="w-full"
                  displayValue={labelOf(formDepts, form.department_id, "Select Department")}>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>{formDepts.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Unit</Label>
              <Select value={form.unit_id} onValueChange={v => setForm(p => ({ ...p, unit_id: v }))} disabled={!form.department_id}>
                <SelectTrigger className="w-full"
                  displayValue={labelOf(formUnits, form.unit_id, "Select Unit")}>
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent>{formUnits.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Item Class <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Furniture" value={form.item_class} onChange={f("item_class")} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">Item Description <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Executive Chair" value={form.item_description} onChange={f("item_description")} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Asset Tag / S/N</Label>
              <Input placeholder="e.g. NHIA/FCT/001" value={form.asset_tag} onChange={f("asset_tag")} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-xs">Book Balance</Label>
              <Input type="number" min="0" value={form.book_balance} onChange={f("book_balance")} />
            </div>
            <div className="flex gap-2 md:col-span-3 justify-end">
              <Button variant="outline" onClick={cancelForm}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2 bg-[#145c3f] hover:bg-[#0f3d2e] text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving..." : "Save Asset"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-end sticky top-0 z-30">
        {!showForm && canCreate && (
          <Button className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20" onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Asset
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">

          {showForm || createOnly ? formCard : (
            <>
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardContent className="pt-5 pb-4">
                  <div className="flex flex-row items-end gap-3 w-full">
                    <div className="flex-1 min-w-0 space-y-2">
                      <Label className="text-xs">Zone</Label>
                      <Select value={filterZone} onValueChange={setFilterZone}>
                        <SelectTrigger className="w-full"
                          displayValue={filterZone === ALL ? "All Zones" : labelOf(zones, filterZone, "All Zones")}>
                          <SelectValue placeholder="All Zones" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL}>All Zones</SelectItem>
                          {zones.map(z => <SelectItem key={z.id} value={String(z.id)}>{z.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <Label className="text-xs">State</Label>
                      <Select value={filterState} onValueChange={setFilterState}>
                        <SelectTrigger className="w-full"
                          displayValue={filterState === ALL ? "All States" : labelOf(states, filterState, "All States")}>
                          <SelectValue placeholder="All States" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL}>All States</SelectItem>
                          {states.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <Label className="text-xs">Status</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full"
                          displayValue={statusLabel(filterStatus)}>
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_FILTER_OPTIONS.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b border-[#d4e8dc]">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <PackageSearch className="w-4 h-4 text-primary" />
                    {listTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading...</span>
                    </div>
                  ) : assets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <PackageSearch className="w-8 h-8 opacity-30" />
                      <p className="text-sm">No assets found</p>
                      {canCreate && (
                      <Button variant="outline" size="sm" onClick={openCreate} className="mt-2 gap-2">
                        <Plus className="w-4 h-4" /> New Asset
                      </Button>
                      )}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                          {showStateColumn && (
                            <TableHead className="text-xs font-bold text-slate-600">State</TableHead>
                          )}
                          <TableHead className="text-xs font-bold text-slate-600">Item Class</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600">Description</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600">Asset Tag</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 text-center">Book Balance</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600">Unit</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600">Status</TableHead>
                          <TableHead className="text-right text-xs font-bold text-slate-600">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assets.map((a, i) => {
                          const inactive = !isAssetActive(a.is_active);
                          return (
                          <motion.tr key={a.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className={`hover:bg-[#f8fdfb] transition-colors border-b border-slate-100 last:border-0 ${inactive ? "opacity-60" : ""}`}>
                            {showStateColumn && (
                              <TableCell className="text-sm text-slate-600">{a.state?.description || "—"}</TableCell>
                            )}
                            <TableCell className="text-sm font-medium">{a.item_class}</TableCell>
                            <TableCell className="text-sm text-slate-700">{a.item_description}</TableCell>
                            <TableCell className="text-xs font-mono text-slate-500">{a.asset_tag || "—"}</TableCell>
                            <TableCell className="text-sm text-center font-semibold">{a.book_balance.toLocaleString()}</TableCell>
                            <TableCell className="text-xs text-slate-500">{a.unit?.name || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${inactive ? "text-slate-500 border-slate-300" : "text-emerald-700 border-emerald-200 bg-emerald-50"}`}>
                                {inactive ? "Inactive" : "Active"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {inactive ? (
                                  <Button variant="ghost" size="sm" title="Reactivate"
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                    onClick={() => handleSetActive(a.id, true)}>
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </Button>
                                ) : (
                                  <>
                                    <Button variant="ghost" size="sm" title="Edit"
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-primary hover:bg-primary/10"
                                      onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                                    <Button variant="ghost" size="sm" title="Deactivate"
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                      onClick={() => handleSetActive(a.id, false)}><Ban className="w-3.5 h-3.5" /></Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </motion.tr>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}

        </div>
      </ScrollArea>
    </div>
  );
}
