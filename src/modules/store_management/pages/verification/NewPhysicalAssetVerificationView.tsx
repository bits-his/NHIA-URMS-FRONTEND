import React, { useEffect, useMemo, useState } from "react";
import PageLayout from "../../components/PageLayout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";
import { stockApi } from "@/lib/api";
import {
  ClipboardCheck,
  ArrowLeft,
  MapPin,
  ListOrdered,
  User,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Option = { id: number; label: string };

type CountRow = {
  key: string;
  assetId: number | null;
  assetNumber: string;
  assetName: string;
  category: string;
  custodian: string;
  bookBalance: number;
  physicalCount: number;
  condition: string;
  remarks: string;
};

const STEPS = [
  { id: 1, title: "Location & Type", icon: MapPin },
  { id: 2, title: "Physical Count", icon: ListOrdered },
  { id: 3, title: "Sign-off", icon: User },
];

const TYPES = [
  { value: "annual", label: "Annual" },
  { value: "monthly", label: "Monthly" },
  { value: "periodic", label: "Periodic" },
  { value: "surprise", label: "Surprise" },
];

const CONDITIONS = ["GOOD", "FAIR", "POOR", "DAMAGED", "MISSING"];

function uid() {
  return Math.random().toString(36).slice(2);
}

function labelOf(options: Option[], id: string) {
  if (!id) return "";
  return options.find((o) => String(o.id) === String(id))?.label || "";
}

export default function NewPhysicalAssetVerificationView() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);

  const [currentStep, setCurrentStep] = useState(1);
  const [zones, setZones] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [units, setUnits] = useState<Option[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [form, setForm] = useState({
    stocktakingType: "periodic",
    verificationDate: new Date().toISOString().slice(0, 10),
    zone_id: "",
    state_id: "",
    department_id: "",
    unit_id: "",
    zone_name: "",
    state_name: "",
    department_name: "",
    unit_name: "",
    storeKeeper: user?.name || "",
    auditOfficer: "",
    remarks: "",
  });

  const [rows, setRows] = useState<CountRow[]>([]);

  useEffect(() => {
    stockApi
      .getZones()
      .then((r) => setZones((r.data || []).map((z: any) => ({ id: z.id, label: z.description }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.name) setForm((p) => ({ ...p, storeKeeper: p.storeKeeper || user.name }));
  }, [user?.name]);

  const loadRegisterAssets = async () => {
    setLoadingAssets(true);
    try {
      const res = await stockApi.getStoreAssets();
      const list = Array.isArray(res.data) ? res.data : [];
      setAssets(list);
      setRows(
        list.map((a: any) => ({
          key: uid(),
          assetId: a.id,
          assetNumber: a.assetId || a.assetNumber || a.nhiaTagNumber || `AST-${a.id}`,
          assetName: a.name || "Asset",
          category: a.primaryCategory || a.category || "",
          custodian: a.assignedCustodian || a.custodian || "",
          bookBalance: 1,
          physicalCount: 1,
          condition: "GOOD",
          remarks: "",
        }))
      );
      if (list.length === 0) {
        toast.message("No assets in Master Register", {
          description: "Register assets first, then run physical verification.",
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load assets");
      setAssets([]);
      setRows([]);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleZoneChange = async (zoneId: string) => {
    setForm((p) => ({
      ...p,
      zone_id: zoneId,
      zone_name: labelOf(zones, zoneId),
      state_id: "",
      state_name: "",
      department_id: "",
      department_name: "",
      unit_id: "",
      unit_name: "",
    }));
    setStates([]);
    setDepartments([]);
    setUnits([]);
    if (!zoneId) return;
    try {
      const r = await stockApi.getStates(zoneId);
      setStates((r.data || []).map((s: any) => ({ id: s.id, label: s.description })));
    } catch {
      setStates([]);
    }
  };

  const handleStateChange = async (stateId: string) => {
    setForm((p) => ({
      ...p,
      state_id: stateId,
      state_name: labelOf(states, stateId),
      department_id: "",
      department_name: "",
      unit_id: "",
      unit_name: "",
    }));
    setDepartments([]);
    setUnits([]);
    if (!stateId) return;
    try {
      const r = await stockApi.getDepartments(stateId);
      setDepartments((r.data || []).map((d: any) => ({ id: d.id, label: d.name })));
    } catch {
      setDepartments([]);
    }
  };

  const handleDeptChange = async (deptId: string) => {
    setForm((p) => ({
      ...p,
      department_id: deptId,
      department_name: labelOf(departments, deptId),
      unit_id: "",
      unit_name: "",
    }));
    setUnits([]);
    if (!deptId) return;
    try {
      const r = await stockApi.getUnits(deptId);
      setUnits((r.data || []).map((u: any) => ({ id: u.id, label: u.name })));
    } catch {
      setUnits([]);
    }
  };

  const updateRow = (key: string, patch: Partial<CountRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const exceptions = useMemo(
    () => rows.filter((r) => r.bookBalance !== r.physicalCount || r.condition === "MISSING"),
    [rows]
  );

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!form.zone_id || !form.state_id) {
        setValidationError("Zone and State are required");
        return false;
      }
      if (!form.stocktakingType) {
        setValidationError("Select stocktaking type");
        return false;
      }
    }
    if (step === 2) {
      if (rows.length === 0) {
        setValidationError("Load assets from the Master Register before counting");
        return false;
      }
    }
    if (step === 3) {
      if (!form.storeKeeper.trim()) {
        setValidationError("Store keeper / verifying officer is required");
        return false;
      }
    }
    setValidationError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep === 1 && rows.length === 0) loadRegisterAssets();
    setCurrentStep((s) => Math.min(3, s + 1));
  };

  const submit = async (status: "DRAFT" | "SUBMITTED") => {
    for (let s = 1; s <= 3; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }
    setSaving(true);
    try {
      const res = await stockApi.createPhysicalVerification({
        ...form,
        zone_id: form.zone_id ? Number(form.zone_id) : null,
        state_id: form.state_id ? Number(form.state_id) : null,
        department_id: form.department_id ? Number(form.department_id) : null,
        unit_id: form.unit_id ? Number(form.unit_id) : null,
        zone_name: form.zone_name || labelOf(zones, form.zone_id),
        state_name: form.state_name || labelOf(states, form.state_id),
        department_name: form.department_name || labelOf(departments, form.department_id),
        unit_name: form.unit_name || labelOf(units, form.unit_id),
        status,
        items: rows.map((r) => ({
          assetId: r.assetId,
          assetNumber: r.assetNumber,
          assetName: r.assetName,
          category: r.category,
          custodian: r.custodian,
          bookBalance: r.bookBalance,
          physicalCount: r.physicalCount,
          condition: r.condition,
          remarks: r.remarks,
        })),
      });
      toast.success(status === "DRAFT" ? "Draft saved" : "Physical verification submitted");
      const id = res.data?.id;
      if (id) navigate(`/store-management/verification/verify/${id}`);
      else navigate("/store-management/verification/verify");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save verification");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 rounded border border-slate-300 font-semibold bg-white focus:ring-1 focus:ring-[#25a872]";
  const labelCls = "block font-bold text-slate-700 mb-1";

  return (
    <PageLayout
      title="New Physical Asset Verification"
      description="Count tagged assets against the Master Register"
      actions={
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => navigate("/store-management/verification/verify")}
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
      }
    >
      <div className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-[#145c3f] text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-white/10 border border-white/20 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-[#25a872]" />
            </div>
            <div>
              <h2 className="text-base font-bold">Physical Stocktaking Exercise</h2>
              <p className="text-xs text-emerald-100/90">Book balance vs physical count</p>
            </div>
          </div>
          <span className="text-xs font-mono bg-white/10 border border-white/20 px-2 py-1 rounded">
            {assets.length} register asset{assets.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="bg-[#f4f7f5] border-b border-slate-200 flex overflow-x-auto">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const active = currentStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (step.id < currentStep || validateStep(currentStep)) setCurrentStep(step.id);
                }}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap border-r border-slate-200 ${
                  active ? "bg-white text-[#145c3f] border-b-2 border-b-[#145c3f]" : "text-slate-600"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-[#25a872]" : "text-slate-400"}`} />
                {step.id}. {step.title}
              </button>
            );
          })}
        </div>

        {validationError && (
          <div className="m-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {validationError}
          </div>
        )}

        <div className="p-6 space-y-5 text-xs">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2">1. Location & Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className={labelCls}>Zone *</label>
                  <select className={inputCls} value={form.zone_id} onChange={(e) => handleZoneChange(e.target.value)}>
                    <option value="">Select zone</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>State *</label>
                  <select
                    className={inputCls}
                    value={form.state_id}
                    disabled={!form.zone_id}
                    onChange={(e) => handleStateChange(e.target.value)}
                  >
                    <option value="">Select state</option>
                    {states.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Department</label>
                  <select
                    className={inputCls}
                    value={form.department_id}
                    disabled={!form.state_id}
                    onChange={(e) => handleDeptChange(e.target.value)}
                  >
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Unit</label>
                  <select
                    className={inputCls}
                    value={form.unit_id}
                    disabled={!form.department_id}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        unit_id: e.target.value,
                        unit_name: labelOf(units, e.target.value),
                      }))
                    }
                  >
                    <option value="">Select unit</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Stocktaking Type *</label>
                  <select
                    className={inputCls}
                    value={form.stocktakingType}
                    onChange={(e) => setForm((p) => ({ ...p, stocktakingType: e.target.value }))}
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Verification Date</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.verificationDate}
                    onChange={(e) => setForm((p) => ({ ...p, verificationDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <h3 className="font-bold text-sm text-slate-900">2. Physical Count</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={loadingAssets}
                  onClick={loadRegisterAssets}
                >
                  {loadingAssets ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  )}
                  Load from Master Register
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                Book balance defaults to 1 per tagged asset. Enter the physical count found on site.
                {exceptions.length > 0 && (
                  <span className="ml-2 font-semibold text-amber-800">
                    {exceptions.length} exception{exceptions.length === 1 ? "" : "s"}
                  </span>
                )}
              </p>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <tr>
                      <th className="p-2">Tag</th>
                      <th className="p-2">Asset</th>
                      <th className="p-2 w-20 text-right">Book</th>
                      <th className="p-2 w-24 text-right">Physical</th>
                      <th className="p-2 w-20 text-right">Var</th>
                      <th className="p-2 w-28">Condition</th>
                      <th className="p-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          {loadingAssets ? "Loading assets…" : "Click “Load from Master Register” to begin"}
                        </td>
                      </tr>
                    )}
                    {rows.map((r) => {
                      const variance = r.bookBalance - r.physicalCount;
                      return (
                        <tr key={r.key} className={variance !== 0 ? "bg-amber-50/50" : undefined}>
                          <td className="p-2 font-mono text-[#145c3f] font-semibold">{r.assetNumber}</td>
                          <td className="p-2">
                            <p className="font-semibold text-slate-900">{r.assetName}</p>
                            <p className="text-[10px] text-slate-500">{r.custodian || "—"}</p>
                          </td>
                          <td className="p-2 text-right font-mono">{r.bookBalance}</td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min={0}
                              className={`${inputCls} text-right`}
                              value={r.physicalCount}
                              onChange={(e) =>
                                updateRow(r.key, { physicalCount: Number(e.target.value) || 0 })
                              }
                            />
                          </td>
                          <td className={`p-2 text-right font-mono font-bold ${variance !== 0 ? "text-amber-800" : "text-slate-500"}`}>
                            {variance}
                          </td>
                          <td className="p-2">
                            <select
                              className={inputCls}
                              value={r.condition}
                              onChange={(e) => updateRow(r.key, { condition: e.target.value })}
                            >
                              {CONDITIONS.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              className={inputCls}
                              value={r.remarks}
                              onChange={(e) => updateRow(r.key, { remarks: e.target.value })}
                              placeholder="Optional"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2">3. Sign-off</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Store Keeper / Verifying Officer *</label>
                  <input
                    className={inputCls}
                    value={form.storeKeeper}
                    onChange={(e) => setForm((p) => ({ ...p, storeKeeper: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Audit Officer</label>
                  <input
                    className={inputCls}
                    value={form.auditOfficer}
                    onChange={(e) => setForm((p) => ({ ...p, auditOfficer: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Remarks</label>
                  <textarea
                    className={`${inputCls} min-h-[80px]`}
                    value={form.remarks}
                    onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
                <p className="font-semibold text-slate-800 mb-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#145c3f]" /> Summary
                </p>
                {rows.length} asset(s) counted · {exceptions.length} exception(s) ·{" "}
                {[form.zone_name, form.state_name].filter(Boolean).join(" / ") || "Location pending"}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              disabled={currentStep === 1}
              className="text-xs"
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            {currentStep < 3 ? (
              <Button
                type="button"
                className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs font-bold"
                onClick={handleNext}
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  className="text-xs"
                  onClick={() => submit("DRAFT")}
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs font-bold"
                  onClick={() => submit("SUBMITTED")}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-1.5" />}
                  Submit Verification
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
