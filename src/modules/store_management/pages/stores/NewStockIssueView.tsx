import React, { useEffect, useMemo, useState } from "react";
import PageLayout from "../../components/PageLayout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";
import { stockApi } from "@/lib/api";
import { Send, ArrowLeft, Loader2, Plus, Trash2, MapPin, ListOrdered, User, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { matchesStore, storeNameFromState, SELECT_CLS, LABEL_CLS } from "../../lib/storeOptions";

type Line = {
  key: string;
  inventoryItemId: string;
  itemCode: string;
  name: string;
  onHand: number;
  quantity: number;
};

type Option = { id: number; label: string };

function uid() {
  return Math.random().toString(36).slice(2);
}

const STEPS = [
  { id: 1, title: "Store & destination", icon: MapPin },
  { id: 2, title: "Line items", icon: ListOrdered },
  { id: 3, title: "Sign-off", icon: User },
];

export function NewStockIssueView() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [stateId, setStateId] = useState("");
  const [stateName, setStateName] = useState("");
  const [form, setForm] = useState({
    issueNumber: `SIV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    department: "",
    recipientName: "",
    issueDate: new Date().toISOString().slice(0, 10),
    remarks: "",
  });
  const [lines, setLines] = useState<Line[]>([
    { key: uid(), inventoryItemId: "", itemCode: "", name: "", onHand: 0, quantity: 1 },
  ]);

  useEffect(() => {
    stockApi.getInventoryItems()
      .then((r) => setCatalog(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("Failed to load inventory catalog"));
    stockApi.getZones()
      .then((r) => setZones((r.data || []).map((z: any) => ({ id: z.id, label: z.description }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!zoneId) { setStates([]); return; }
    let cancelled = false;
    stockApi.getStates(zoneId)
      .then((r) => {
        if (!cancelled) setStates((r.data || []).map((s: any) => ({ id: s.id, label: s.description })));
      })
      .catch(() => { if (!cancelled) setStates([]); });
    return () => { cancelled = true; };
  }, [zoneId]);

  useEffect(() => {
    if (!stateId) { setDepartments([]); return; }
    let cancelled = false;
    stockApi.getDepartments(stateId)
      .then((r) => {
        if (!cancelled) setDepartments((r.data || []).map((d: any) => ({ id: d.id, label: d.name || d.description })));
      })
      .catch(() => { if (!cancelled) setDepartments([]); });
    return () => { cancelled = true; };
  }, [stateId]);

  const fromLocation = storeNameFromState(stateName);

  const storeItems = useMemo(
    () => fromLocation ? catalog.filter((i) => matchesStore(i.storeLocation, fromLocation)) : [],
    [catalog, fromLocation]
  );

  const available = useMemo(
    () => storeItems.filter((i) => Number(i.quantityInStock || 0) > 0),
    [storeItems]
  );

  const selectItem = (key: string, id: string) => {
    const found = catalog.find((i) => String(i.id) === String(id));
    setLines((prev) =>
      prev.map((row) =>
        row.key === key
          ? {
              ...row,
              inventoryItemId: id,
              itemCode: found?.itemCode || "",
              name: found?.name || "",
              onHand: Number(found?.quantityInStock || 0),
              quantity: Math.min(row.quantity || 1, Number(found?.quantityInStock || 1) || 1),
            }
          : row
      )
    );
  };

  const changeZone = (id: string) => {
    setZoneId(id);
    setStateId("");
    setStateName("");
    setDepartments([]);
    setForm((p) => ({ ...p, department: "" }));
    setLines([{ key: uid(), inventoryItemId: "", itemCode: "", name: "", onHand: 0, quantity: 1 }]);
  };

  const changeState = (id: string) => {
    const sn = states.find((s) => String(s.id) === id)?.label || "";
    setStateId(id);
    setStateName(sn);
    setForm((p) => ({ ...p, department: "" }));
    setLines([{ key: uid(), inventoryItemId: "", itemCode: "", name: "", onHand: 0, quantity: 1 }]);
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!fromLocation) {
        setError("Select zone and state office — that office is the issuing store");
        return false;
      }
      if (!form.department.trim() || !form.recipientName.trim()) {
        setError("Department and recipient officer are required");
        return false;
      }
    }
    if (step === 2) {
      const valid = lines.filter((l) => l.inventoryItemId && l.quantity > 0);
      if (valid.length === 0) {
        setError("Add at least one inventory item");
        return false;
      }
      for (const line of valid) {
        if (line.quantity > line.onHand) {
          setError(`${line.name || line.itemCode}: only ${line.onHand} on hand`);
          return false;
        }
      }
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2)) {
      setCurrentStep(!fromLocation || !form.department.trim() ? 1 : 2);
      return;
    }
    const valid = lines.filter((l) => l.inventoryItemId && l.quantity > 0);
    setSaving(true);
    try {
      await stockApi.createStockIssue({
        issueNumber: form.issueNumber,
        department: form.department,
        recipientName: form.recipientName,
        issueDate: form.issueDate,
        issuedBy: user?.name || "Store Officer",
        fromLocation,
        toLocation: form.department,
        remarks: form.remarks,
        status: "APPROVED",
        lineItems: valid.map((l) => ({
          inventoryItemId: Number(l.inventoryItemId),
          itemCode: l.itemCode,
          name: l.name,
          quantity: Number(l.quantity),
        })),
      });
      toast.success("Stock issued — inventory updated");
      navigate("/store-management/transfers/requests");
    } catch (err: any) {
      toast.error(err?.message || "Failed to issue stock");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = SELECT_CLS;

  return (
    <PageLayout
      title="New Stock Issue"
      description="Issue inventory from a state office store to a department"
      actions={
        <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Back
        </Button>
      }
    >
      <div className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-[#145c3f] text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight text-white text-balance">Stock Issue Voucher</h2>
            <p className="text-xs text-emerald-100/90">National Health Insurance Authority</p>
          </div>
          <span className="px-3 py-1 rounded text-xs font-mono font-bold bg-white/10 text-emerald-200 border border-white/20" translate="no">
            {form.issueNumber}
          </span>
        </div>

        <div className="bg-[#f4f7f5] border-b border-slate-200 flex overflow-x-auto">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (step.id < currentStep || validateStep(currentStep)) setCurrentStep(step.id);
                }}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap border-r border-slate-200 ${
                  isActive ? "bg-white text-[#145c3f] border-b-2 border-b-[#145c3f]" : isDone ? "text-[#145c3f]" : "text-slate-600"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive || isDone ? "text-[#25a872]" : "text-slate-400"}`} aria-hidden="true" />
                {step.id}. {step.title}
              </button>
            );
          })}
        </div>

        {error && (
          <div role="alert" className="m-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (currentStep < 3) {
              if (validateStep(currentStep)) setCurrentStep((s) => s + 1);
            } else handleSubmit();
          }}
          className="p-6 space-y-5"
        >
          {currentStep === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={LABEL_CLS} htmlFor="issue-number">Voucher No</label>
                <input id="issue-number" name="issueNumber" autoComplete="off" spellCheck={false} className={`${inputCls} font-mono`} value={form.issueNumber} onChange={(e) => setForm((p) => ({ ...p, issueNumber: e.target.value }))} required />
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="issue-date">Issue date</label>
                <input id="issue-date" name="issueDate" type="date" className={inputCls} value={form.issueDate} onChange={(e) => setForm((p) => ({ ...p, issueDate: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="issue-zone">Zone <span className="text-rose-500">*</span></label>
                <select id="issue-zone" name="zoneId" className={inputCls} value={zoneId} onChange={(e) => changeZone(e.target.value)}>
                  <option value="">Select zone…</option>
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="issue-state">State office store <span className="text-rose-500">*</span></label>
                <select id="issue-state" name="stateId" className={inputCls} value={stateId} disabled={!zoneId} onChange={(e) => changeState(e.target.value)}>
                  <option value="">{zoneId ? "Select state…" : "Select zone first"}</option>
                  {states.map((s) => <option key={s.id} value={s.id}>{storeNameFromState(s.label)}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="department">To / Department <span className="text-rose-500">*</span></label>
                <select
                  id="department"
                  name="department"
                  className={inputCls}
                  value={form.department}
                  disabled={!stateId}
                  onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                >
                  <option value="">{stateId ? "Select department…" : "Select state office first"}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.label}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="recipient">Recipient officer <span className="text-rose-500">*</span></label>
                <input id="recipient" name="recipientName" autoComplete="name" className={inputCls} value={form.recipientName} onChange={(e) => setForm((p) => ({ ...p, recipientName: e.target.value }))} placeholder="Officer name" />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">Items from {fromLocation || "selected store"}</p>
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setLines((p) => [...p, { key: uid(), inventoryItemId: "", itemCode: "", name: "", onHand: 0, quantity: 1 }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Add line
                </Button>
              </div>
              {available.length === 0 && (
                <p role="status" className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  No stock on hand in this store. Receive items via Verification of Supply first.
                </p>
              )}
              {lines.map((line) => (
                <div key={line.key} className="grid grid-cols-1 sm:grid-cols-[1fr_110px_auto] gap-2 items-end">
                  <div>
                    <label className={LABEL_CLS} htmlFor={`item-${line.key}`}>Item</label>
                    <select id={`item-${line.key}`} className={inputCls} value={line.inventoryItemId} onChange={(e) => selectItem(line.key, e.target.value)}>
                      <option value="">Select inventory item…</option>
                      {storeItems.map((i) => (
                        <option key={i.id} value={i.id} disabled={Number(i.quantityInStock || 0) <= 0}>
                          {i.itemCode} — {i.name} ({i.quantityInStock ?? 0} on hand)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS} htmlFor={`qty-${line.key}`}>Qty</label>
                    <Input id={`qty-${line.key}`} type="number" min={1} max={line.onHand || undefined} inputMode="numeric" className={`${inputCls} tabular-nums`} value={line.quantity} onChange={(e) => setLines((p) => p.map((r) => r.key === line.key ? { ...r, quantity: Number(e.target.value) || 0 } : r))} />
                  </div>
                  {lines.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" aria-label="Remove line" className="h-10 text-rose-600" onClick={() => setLines((p) => p.filter((r) => r.key !== line.key))}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {currentStep === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
              <div>
                <p className={LABEL_CLS}>Issued by</p>
                <p className="h-10 flex items-center px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">{user?.name || "Store Officer"}</p>
              </div>
              <div>
                <p className={LABEL_CLS}>Store</p>
                <p className="h-10 flex items-center px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">{fromLocation}</p>
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL_CLS} htmlFor="remarks">Remarks</label>
                <textarea id="remarks" name="remarks" className={`${inputCls} h-24 py-2.5`} value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} placeholder="Optional note…" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Button type="button" variant="outline" className="text-xs" disabled={currentStep === 1} onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Previous
            </Button>
            {currentStep < 3 ? (
              <Button type="submit" className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs font-bold">
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
              </Button>
            ) : (
              <Button type="submit" disabled={saving} className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs font-bold min-w-[160px]">
                {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4 mr-1.5" aria-hidden="true" />}
                {saving ? "Issuing…" : "Issue stock"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </PageLayout>
  );
}

export default NewStockIssueView;
