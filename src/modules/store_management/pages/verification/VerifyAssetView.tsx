import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";
import { storeManagementApi } from "@/src/services/storeManagementApi";
import { stockApi } from "@/lib/api";
import PageLayout from "../../components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ClipboardCheck, Loader2, AlertCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PHYSICAL_CONDITIONS } from "../../lib/storeOptions";

const VERIFY_STATUSES = ["Verified & Passed", "Partial Pass", "Exception"];

function toItemCondition(label: string) {
  const u = String(label || "Good").toUpperCase();
  if (["MISSING", "DAMAGED", "POOR", "FAIR", "GOOD", "DEFECTIVE", "OBSOLETE", "RETIRED"].includes(u)) return u;
  if (u === "EXCELLENT") return "GOOD";
  return "GOOD";
}

function SectionBand({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-[#d4e8dc] bg-white overflow-hidden shadow-sm">
      <div className="bg-[#e8f5ee] px-3 py-2 border-b border-[#d4e8dc]">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">{title}</h3>
      </div>
      <div className="p-3 bg-[#f4f7f5]">{children}</div>
    </section>
  );
}

function InfoField({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="space-y-1 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-medium text-slate-800 break-words ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function FieldLabel({ htmlFor, children, required }: { htmlFor?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
      {children}
      {required ? <span className="text-rose-600"> *</span> : null}
    </label>
  );
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
        <div className="space-y-2 animate-pulse">
          <div className="h-24 rounded-sm bg-slate-200/70" />
          <div className="h-24 rounded-sm bg-slate-100" />
        </div>
      </PageLayout>
    );
  }

  if (!asset) {
    return (
      <PageLayout
        title="Asset Not Found"
        description="This record is not on Physical Asset Verification"
        back
        backTo="/store-management/verification/verify"
      >
        <div className="p-6 text-center bg-white rounded-sm border border-[#d4e8dc]">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">No Asset Found</h3>
          <p className="text-xs text-slate-500 mt-0.5">No asset matches reference: {assetId}</p>
          <Button
            size="sm"
            onClick={() => navigate("/store-management/verification/verify")}
            className="mt-4 bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs"
          >
            Back to Physical Asset Verification
          </Button>
        </div>
      </PageLayout>
    );
  }

  const tag = asset.assetId || asset.assetNumber || asset.nhiaTagNumber || `AST-${asset.id}`;
  const varianceLabel = variance > 0 ? `-${variance}` : variance < 0 ? `+${Math.abs(variance)}` : "0";

  return (
    <PageLayout
      title={asset.name || "Asset"}
      description={tag}
      back
      backTo="/store-management/verification/verify"
      contentClassName="p-2 md:p-2 gap-2"
    >
      <SectionBand title="Identification">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
          <InfoField label="Asset name" value={asset.name} />
          <InfoField label="Tag number" value={asset.nhiaTagNumber || tag} mono />
          <InfoField label="Condition" value={asset.physicalCondition} />
          <InfoField label="Category" value={asset.primaryCategory || asset.category} />
          <InfoField label="Subcategory" value={asset.subCategory} />
          <InfoField label="Item type" value={asset.specificType} />
          <InfoField label="Serial number" value={asset.serialNumber || asset.barcodeQrCode} mono />
          <InfoField label="Last verified" value={asset.lastVerificationDate} />
          <InfoField label="Verification status" value={asset.verificationStatus} />
        </div>
      </SectionBand>

      <SectionBand title="Location and custody">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
          <InfoField label="Custodian" value={asset.assignedCustodian || asset.custodian} />
          <InfoField label="Zone" value={asset.zone_name || (asset.facilitySite === "HQ" ? "Headquarters" : asset.facilitySite)} />
          <InfoField label="State office" value={asset.state_name || asset.location} />
          <InfoField label="Department" value={asset.department_name || asset.officeDeptUnit} />
          <InfoField label="Unit" value={asset.unit_name} />
          <InfoField label="Room / spot" value={asset.specificLocation} />
        </div>
      </SectionBand>

      <form onSubmit={handleSubmit} className="space-y-2">
        {error && (
          <div role="alert" className="rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}
        {hasException && (
          <div className="rounded-sm border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>Variance or a missing condition was recorded. Add the reason in remarks.</span>
          </div>
        )}

        <SectionBand title="Verification">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabel htmlFor="book-balance">Book balance</FieldLabel>
              <Input
                id="book-balance"
                name="bookBalance"
                type="number"
                min={0}
                inputMode="numeric"
                value={form.bookBalance}
                onChange={(e) => setForm((p) => ({ ...p, bookBalance: Number(e.target.value) || 0 }))}
                className="tabular-nums"
              />
            </div>
            <div>
              <FieldLabel htmlFor="physical-count" required>Physical count</FieldLabel>
              <Input
                id="physical-count"
                name="physicalCount"
                type="number"
                min={0}
                inputMode="numeric"
                value={form.physicalCount}
                onChange={(e) => setForm((p) => ({ ...p, physicalCount: Number(e.target.value) || 0 }))}
                className="tabular-nums"
                required
              />
            </div>
            <div>
              <FieldLabel>Count variance</FieldLabel>
              <p className={`h-10 flex items-center px-3 rounded-sm border text-sm font-semibold tabular-nums ${
                variance === 0 ? "border-[#d4e8dc] bg-[#e8f5ee] text-[#0f3d2e]" : "border-amber-300 bg-amber-50 text-amber-950"
              }`}>
                {varianceLabel}
              </p>
            </div>
            <div>
              <FieldLabel required>Physical condition</FieldLabel>
              <Select value={form.physicalCondition} onValueChange={(val) => setForm((p) => ({ ...p, physicalCondition: val }))}>
                <SelectTrigger size="sm" displayValue={form.physicalCondition}>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {PHYSICAL_CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Verification verdict</FieldLabel>
              <Select
                value={hasException ? "Exception" : form.verificationStatus}
                disabled={hasException}
                onValueChange={(val) => setForm((p) => ({ ...p, verificationStatus: val }))}
              >
                <SelectTrigger size="sm" displayValue={hasException ? "Exception" : form.verificationStatus}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {VERIFY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="verify-date" required>Verification date</FieldLabel>
              <Input
                id="verify-date"
                name="verificationDate"
                type="date"
                value={form.verificationDate}
                onChange={(e) => setForm((p) => ({ ...p, verificationDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <FieldLabel>Verifying officer</FieldLabel>
              <p className="h-8 flex items-center px-2.5 rounded-sm border border-[#d4e8dc] bg-white text-xs font-medium text-slate-800 truncate">
                {user?.name || "Verifying officer"}
              </p>
            </div>
            <div>
              <FieldLabel htmlFor="remarks" required={hasException}>Remarks</FieldLabel>
              <textarea
                id="remarks"
                name="remarks"
                value={form.remarks}
                onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                placeholder={hasException ? "Reason for the variance or missing condition" : "Observations"}
                className="min-h-[72px] w-full rounded-sm border-2 border-[#1a7a52] bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#1a7a52]/20"
                required={hasException}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate("/store-management/verification/verify")}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} size="sm" className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white">
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" aria-hidden="true" /> : <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />}
              {saving ? "Saving…" : "Save verification"}
            </Button>
          </div>
        </SectionBand>
      </form>
    </PageLayout>
  );
}

