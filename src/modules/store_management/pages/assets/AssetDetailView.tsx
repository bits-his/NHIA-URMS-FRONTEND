import React, { useState, useEffect } from "react";
import PageLayout from "@/src/modules/store_management/components/PageLayout";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { storeManagementApi } from "@/src/services/storeManagementApi";
import { ClipboardCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_ATTRIBUTES } from "@/src/store/useAssetManagement";

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

function parseAttributes(raw: unknown): Record<string, unknown> {
  let value = raw;
  for (let pass = 0; pass < 2 && typeof value === "string"; pass += 1) {
    const trimmed = value.trim();
    if (!trimmed) return {};
    try {
      value = JSON.parse(trimmed);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function specFields(category: string, raw: unknown) {
  const record = parseAttributes(raw);
  const defined = CATEGORY_ATTRIBUTES[category] || [];
  const used = new Set<string>();
  const rows: { key: string; label: string; value: string }[] = [];
  const push = (key: string, label: string, val: unknown) => {
    const value = val == null ? "" : String(val).trim();
    if (!value || used.has(key)) return;
    used.add(key);
    rows.push({ key, label, value });
  };
  for (const field of defined) push(field.key, field.label, record[field.key]);
  for (const [key, val] of Object.entries(record)) {
    const label = key
      .replace(/[_-]/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    push(key, label, val);
  }
  return rows;
}

function conditionTone(raw: string) {
  const v = String(raw || "").toLowerCase();
  if (/\bretir|\bdispos/.test(v)) return { label: "Retired", className: "bg-slate-200 text-slate-800 border-slate-300" };
  if (/\bobsolete/.test(v)) return { label: "Obsolete", className: "bg-amber-100 text-amber-950 border-amber-300" };
  if (/\bmissing|\blost/.test(v)) return { label: "Missing", className: "bg-rose-100 text-rose-900 border-rose-300" };
  if (/\bdefect|\bpoor|\bdamaged|\brepair/.test(v)) return { label: "Defective", className: "bg-rose-50 text-rose-800 border-rose-200" };
  return { label: raw || "Good", className: "bg-[#e8f5ee] text-[#0f3d2e] border-[#25a872]/40" };
}

export function AssetDetailView() {
  const { id: rawId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const pathname = location.pathname;
  const detailPrefix = "/store-management/assets/detail/";
  let extractedId = rawId ? decodeURIComponent(rawId) : "";
  if (pathname.includes(detailPrefix)) {
    const tail = pathname.substring(pathname.indexOf(detailPrefix) + detailPrefix.length);
    if (tail) extractedId = decodeURIComponent(tail);
  }

  useEffect(() => {
    if (!extractedId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await storeManagementApi.getAssetById(extractedId);
        if (!cancelled) setAsset(res?.data || res || null);
      } catch {
        if (!cancelled) setAsset(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [extractedId]);

  if (loading) {
    return (
      <PageLayout title="Asset Master Record" description="Loading asset details…">
        <div className="space-y-3 animate-pulse">
          <div className="h-20 rounded-xl bg-slate-200/70" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="h-64 rounded-xl bg-slate-100" />
            <div className="h-64 rounded-xl bg-slate-100" />
            <div className="h-64 rounded-xl bg-slate-100" />
          </div>
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
          <p className="text-xs text-slate-500 mt-0.5">No asset matches reference ID: {extractedId || "—"}</p>
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
  const cost = Number(asset.acquisitionCost || asset.acquisitionValue || 0);
  const accum = Number(asset.accumulatedDepreciation || 0);
  const nbv = Number(asset.netBookValue || asset.currentValue || Math.max(0, cost - accum));
  const specs = specFields(asset.primaryCategory || asset.category || "", asset.categoryAttributes);
  const money = (amount: number) => `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
  const cond = conditionTone(asset.physicalCondition || asset.operationalStatus || "Good");

  return (
    <PageLayout
      title={asset.name || "Asset"}
      description={tag}
      back
      backTo="/store-management/verification/verify"
      actions={
        <Button
          size="sm"
          onClick={() =>
            navigate(`/store-management/verification/verify/asset/${encodeURIComponent(String(asset.id))}`)
          }
          className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs h-8 font-semibold shadow-sm"
        >
          <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" /> Verify
        </Button>
      }
      contentClassName="p-2 md:p-2 gap-2"
    >
      <SectionBand title="Identification">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
          <InfoField label="Asset name" value={asset.name} />
          <InfoField label="Tag number" value={asset.nhiaTagNumber || tag} mono />
          <InfoField label="Condition" value={cond.label} />
          <InfoField label="Category" value={asset.primaryCategory || asset.category} />
          <InfoField label="Subcategory" value={asset.subCategory} />
          <InfoField label="Item type" value={asset.specificType} />
          <InfoField label="Serial number" value={asset.serialNumber || asset.barcodeQrCode} mono />
          <InfoField label="Tagging method" value={asset.taggingMethod} />
          <InfoField label="Operational status" value={asset.operationalStatus} />
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
          <InfoField label="Allocated year" value={asset.yearOfAllocation} />
          <InfoField label="Supervisor" value={asset.supervisor || asset.coordinator} />
          <InfoField label="Verification status" value={asset.verificationStatus} />
        </div>
      </SectionBand>

      <SectionBand title="Valuation">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
          <InfoField label="Acquisition cost" value={money(cost)} />
          <InfoField label="Net book value" value={money(nbv)} />
          <InfoField label="Accumulated depreciation" value={money(accum)} />
          <InfoField label="Useful life" value={asset.usefulLifeYears ? `${asset.usefulLifeYears} yrs` : null} />
          <InfoField label="Depreciation method" value={asset.depreciationMethod} />
          <InfoField label="Acquired date" value={asset.acquisitionDate || asset.purchaseDate || asset.date} />
          <InfoField label="Last verified" value={asset.lastVerificationDate} />
        </div>
      </SectionBand>

      {specs.length > 0 && (
        <SectionBand title={asset.primaryCategory ? `Specifications · ${asset.primaryCategory}` : "Specifications"}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
            {specs.map((spec) => (
              <InfoField key={spec.key} label={spec.label} value={spec.value} />
            ))}
          </div>
        </SectionBand>
      )}

      {asset.comments ? (
        <SectionBand title="Comments">
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{asset.comments}</p>
        </SectionBand>
      ) : null}
    </PageLayout>
  );
}

export default AssetDetailView;


