import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";
import { storeManagementApi } from "@/src/services/storeManagementApi";
import { stockApi } from "@/lib/api";
import PageLayout from "../../components/PageLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  User,
  Tag,
  Calendar,
  Building,
  FileText,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { PHYSICAL_CONDITIONS } from "../../lib/storeOptions";

const VERIFY_STATUSES = ["Verified & Passed", "Partial Pass", "Exception"];

function toItemCondition(label: string) {
  const u = String(label || "Good").toUpperCase();
  if (["MISSING", "DAMAGED", "POOR", "FAIR", "GOOD", "DEFECTIVE", "OBSOLETE", "RETIRED"].includes(u)) return u;
  if (u === "EXCELLENT") return "GOOD";
  return "GOOD";
}

function conditionTone(raw: string) {
  const v = String(raw || "").toLowerCase();
  if (/\bretir|\bdispos/.test(v)) return { label: "Retired", className: "bg-slate-200 text-slate-800 border-slate-300" };
  if (/\bobsolete/.test(v)) return { label: "Obsolete", className: "bg-amber-100 text-amber-950 border-amber-300" };
  if (/\bmissing|\blost/.test(v)) return { label: "Missing", className: "bg-rose-100 text-rose-900 border-rose-300" };
  if (/\bdefect|\bpoor|\bdamaged|\brepair/.test(v)) return { label: "Defective", className: "bg-rose-50 text-rose-800 border-rose-200" };
  return { label: raw || "Good", className: "bg-[#e8f5ee] text-[#0f3d2e] border-[#25a872]/40" };
}

export default function VerifyAssetView() {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);

  const [asset, setAsset] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    physicalCondition: "Good",
    verificationStatus: "Verified & Passed",
    physicalCount: 1,
    bookBalance: 1,
    verificationDate: new Date().toISOString().slice(0, 10),
    remarks: "",
  });

  useEffect(() => {
    if (!assetId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await storeManagementApi.getAssetById(assetId);
        const data = res?.data || res || null;
        if (cancelled) return;
        setAsset(data);
        if (data) {
          setForm((p) => ({
            ...p,
            physicalCondition: data.physicalCondition || "Good",
            verificationStatus: data.verificationStatus || "Verified & Passed",
          }));
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load asset");
        if (!cancelled) setAsset(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  const variance = Number(form.bookBalance || 0) - Number(form.physicalCount || 0);
  const hasException =
    form.physicalCondition === "Missing" || Number(form.physicalCount) === 0 || variance !== 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset?.id) return;
    setError(null);
    if (form.physicalCount < 0 || form.bookBalance < 0) {
      setError("Counts cannot be negative.");
      return;
    }
    if (hasException && !form.remarks.trim()) {
      setError("Please provide an explanatory remark for the variance, missing count, or exception condition.");
      return;
    }
    setSaving(true);
    try {
      const status = hasException ? "Exception" : form.verificationStatus || "Verified & Passed";

      await storeManagementApi.updateAsset(asset.id, {
        physicalCondition: form.physicalCondition,
        lastVerificationDate: form.verificationDate,
        verificationStatus: status,
        operationalStatus:
          form.physicalCondition === "Retired"
            ? "Retired"
            : form.physicalCondition === "Obsolete"
              ? "Obsolete"
              : form.physicalCondition === "Missing"
                ? "Missing"
                : undefined,
      });

      await stockApi.createPhysicalVerification({
        stocktakingType: "periodic",
        verificationDate: form.verificationDate,
        storeKeeper: user?.name || "Officer",
        auditOfficer: "",
        remarks: form.remarks,
        status: "SUBMITTED",
        items: [
          {
            assetId: asset.id,
            assetNumber: asset.assetId || asset.assetNumber || asset.nhiaTagNumber,
            assetName: asset.name,
            category: asset.primaryCategory || asset.category,
            custodian: asset.assignedCustodian || asset.custodian,
            bookBalance: Number(form.bookBalance) || 1,
            physicalCount: Number(form.physicalCount) || 0,
            condition: toItemCondition(form.physicalCondition),
            remarks: form.remarks,
          },
        ],
      });

      toast.success(hasException ? "Verification saved with exception" : "Physical asset verification saved successfully");
      navigate("/store-management/verification/verify");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save verification");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Physical Asset Verification" description="Loading asset details…">
        <div className="space-y-4 animate-pulse">
          <div className="h-28 rounded-2xl bg-slate-200/70" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 rounded-2xl bg-slate-100" />
            <div className="h-96 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!asset) {
    return (
      <PageLayout
        title="Asset Not Found"
        description="Cannot verify this asset record"
        actions={
          <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/store-management/verification/verify")}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Back to List
          </Button>
        }
      >
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Asset Record Not Found</h3>
          <p className="text-sm text-slate-500 mt-1">No asset matches reference: {assetId}</p>
          <Button
            onClick={() => navigate("/store-management/verification/verify")}
            className="mt-5 bg-[#145c3f] hover:bg-[#0f3d2e] text-white"
          >
            Return to Verification List
          </Button>
        </div>
      </PageLayout>
    );
  }

  const tag = asset.assetId || asset.assetNumber || asset.nhiaTagNumber || `AST-${asset.id}`;
  const recordedCond = conditionTone(asset.physicalCondition || "Good");

  return (
    <PageLayout
      title={
        <span className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-[#25a872]" /> Physical Asset Verification
        </span>
      }
      description={`Conduct physical stocktaking and condition assessment for ${tag}`}
      actions={
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8 font-semibold border-slate-300 hover:bg-slate-50"
          onClick={() => navigate("/store-management/verification/verify")}
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Back to List
        </Button>
      }
      contentClassName="gap-3.5"
    >
      {/* ─── Compact Asset Information Profile Banner ──────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm px-4 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-[#e8f5ee] text-[#145c3f] border border-[#25a872]/40">
                {tag}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {asset.primaryCategory || "General Asset"}
              </span>
              <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-bold ${recordedCond.className}`}>
                Current: {recordedCond.label}
              </span>
            </div>

            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate">
              {asset.name || "Asset"}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <strong>Custodian:</strong> {asset.assignedCustodian || asset.custodian || "Unassigned"}
              </span>
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <strong>Dept:</strong> {asset.department_name || asset.officeDeptUnit || asset.location || "—"}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <strong>Spot:</strong> {asset.specificLocation || "—"}
              </span>
            </div>
          </div>

          <div className="shrink-0 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200/70 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Last Verified</p>
            <p className="text-xs font-bold text-slate-800 tabular-nums">
              {asset.lastVerificationDate || "Never Verified"}
            </p>
            <p className="text-[10px] text-slate-500">Status: {asset.verificationStatus || "Unverified"}</p>
          </div>
        </div>
      </div>

      {/* ─── Main Form: 2-Column Balanced Compact Layout ───────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 flex items-center gap-2.5 shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            <div>{error}</div>
          </div>
        )}

        {hasException && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900 flex items-start gap-2.5 shadow-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
            <div>
              <p className="font-bold">Verification Exception Detected</p>
              <p className="font-normal text-amber-800 mt-0.5">
                Variance or missing condition logged. Please state reason in remarks below.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {/* Column 1: Physical Count & Assessment */}
          <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm p-4 space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="p-1.5 bg-[#e8f5ee] rounded-lg text-[#145c3f]">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Physical Count & Condition</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1" htmlFor="book-balance">
                  Book Balance
                </label>
                <input
                  id="book-balance"
                  name="bookBalance"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.bookBalance}
                  onChange={(e) => setForm((p) => ({ ...p, bookBalance: Number(e.target.value) || 0 }))}
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 bg-slate-50 font-semibold text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#25a872]/40 text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1" htmlFor="physical-count">
                  Physical Count <span className="text-rose-500">*</span>
                </label>
                <input
                  id="physical-count"
                  name="physicalCount"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.physicalCount}
                  onChange={(e) => setForm((p) => ({ ...p, physicalCount: Number(e.target.value) || 0 }))}
                  className="w-full h-10 px-3.5 rounded-lg border-2 border-[#145c3f] bg-white font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#25a872]/40 text-sm"
                  required
                />
              </div>
            </div>

            {/* Dynamic Variance Banner */}
            <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
              variance === 0
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-amber-50 border-amber-300 text-amber-950"
            }`}>
              <div className="flex items-center gap-2">
                {variance === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                )}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider">Count Variance</p>
                  <p className="text-xs font-medium opacity-85">
                    {variance === 0 ? "Book balance matches physical count" : `Variance: Book (${form.bookBalance}) vs Actual (${form.physicalCount})`}
                  </p>
                </div>
              </div>
              <span className={`text-base font-extrabold tabular-nums px-2.5 py-0.5 rounded-md ${
                variance === 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-200 text-amber-900"
              }`}>
                {variance > 0 ? `-${variance}` : variance < 0 ? `+${Math.abs(variance)}` : "0"}
              </span>
            </div>

            {/* Condition Selection with Custom Select */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Physical Condition Assessment <span className="text-rose-500">*</span>
              </label>
              <Select
                value={form.physicalCondition}
                onValueChange={(val) => setForm((p) => ({ ...p, physicalCondition: val }))}
              >
                <SelectTrigger displayValue={form.physicalCondition} className="bg-white border-slate-300 h-10">
                  <SelectValue placeholder="Select Condition" />
                </SelectTrigger>
                <SelectContent>
                  {PHYSICAL_CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Verification Status Selection with Custom Select */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Verification Verdict
              </label>
              <Select
                value={hasException ? "Exception" : form.verificationStatus}
                disabled={hasException}
                onValueChange={(val) => setForm((p) => ({ ...p, verificationStatus: val }))}
              >
                <SelectTrigger
                  displayValue={hasException ? "Exception (Auto-flagged)" : form.verificationStatus}
                  className="bg-white border-slate-300 h-10"
                >
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {VERIFY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Column 2: Sign-Off, Officer & Remarks */}
          <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm p-4 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <div className="p-1.5 bg-[#e8f5ee] rounded-lg text-[#145c3f]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Sign-Off & Remarks</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1" htmlFor="verify-date">
                    Verification Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="verify-date"
                    name="verificationDate"
                    type="date"
                    value={form.verificationDate}
                    onChange={(e) => setForm((p) => ({ ...p, verificationDate: e.target.value }))}
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#25a872]/40"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Verifying Officer
                  </label>
                  <div className="h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-2 text-xs font-bold text-slate-800 truncate">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{user?.name || "Verifying Officer"}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1" htmlFor="remarks">
                  Remarks {hasException ? <span className="text-rose-500">* (Required)</span> : <span className="text-slate-400 font-normal">(Optional)</span>}
                </label>
                <textarea
                  id="remarks"
                  name="remarks"
                  rows={3}
                  value={form.remarks}
                  onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                  placeholder="Record observations regarding physical condition, defects, or reasons for count variance..."
                  className="w-full p-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25a872]/40 resize-none"
                  required={hasException}
                />
              </div>
            </div>

            {/* Action CTAs */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate("/store-management/verification/verify")}
                className="h-10 px-5 rounded-lg font-semibold border-slate-300 hover:bg-slate-50 text-slate-700 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                size="sm"
                className="h-10 px-6 rounded-lg font-bold bg-[#145c3f] hover:bg-[#0f3d2e] text-white shadow-sm flex items-center gap-1.5 text-xs"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                    Save & Submit Verification
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}

