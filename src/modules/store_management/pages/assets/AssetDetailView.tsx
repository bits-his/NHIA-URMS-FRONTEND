import React, { useState, useEffect } from "react";
import PageLayout from "@/src/modules/store_management/components/PageLayout";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { storeManagementApi } from "@/src/services/storeManagementApi";
import {
  ArrowLeft,
  ClipboardCheck,
  Tag,
  MapPin,
  CircleDollarSign,
  ShieldCheck,
  Building,
  User,
  Calendar,
  Layers,
  AlertTriangle,
  FileText,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function InfoRow({
  label,
  value,
  icon: Icon,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 gap-2">
      <div className="flex items-center gap-1.5 text-slate-500 shrink-0">
        {Icon ? <Icon className="w-3.5 h-3.5 text-slate-400" /> : null}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div
        className={`text-xs font-semibold break-words text-right truncate max-w-[55%] ${
          highlight
            ? "text-[#145c3f] font-bold"
            : mono
            ? "font-mono text-slate-800"
            : "text-slate-800"
        }`}
        title={typeof value === "string" ? value : undefined}
      >
        {value ?? "—"}
      </div>
    </div>
  );
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
        description="This record does not exist in the master asset register"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Back
          </Button>
        }
      >
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">No Asset Found</h3>
          <p className="text-xs text-slate-500 mt-0.5">No asset matches reference ID: {extractedId || "—"}</p>
          <Button
            size="sm"
            onClick={() => navigate("/store-management/assets/list")}
            className="mt-4 bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs"
          >
            Go to Asset Register
          </Button>
        </div>
      </PageLayout>
    );
  }

  const tag = asset.assetId || asset.assetNumber || asset.nhiaTagNumber || `AST-${asset.id}`;
  const cost = Number(asset.acquisitionCost || asset.acquisitionValue || 0);
  const accum = Number(asset.accumulatedDepreciation || 0);
  const nbv = Number(asset.netBookValue || asset.currentValue || Math.max(0, cost - accum));
  const attrs = Object.entries(asset.categoryAttributes || {});
  const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
  const cond = conditionTone(asset.physicalCondition || asset.operationalStatus || "Good");

  return (
    <PageLayout
      title={
        <span className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#25a872]" /> Asset Master Profile
        </span>
      }
      description={`Master Register record for ${tag}`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-xs h-8 font-semibold border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Back
          </Button>
          <Button
            size="sm"
            onClick={() =>
              navigate(`/store-management/verification/verify/asset/${encodeURIComponent(String(asset.id))}`)
            }
            className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs h-8 font-semibold shadow-sm"
          >
            <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" /> Verify Condition
          </Button>
        </div>
      }
      contentClassName="gap-3.5"
    >
      {/* ─── Compact Hero Overview Header ─────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm px-4 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-[#e8f5ee] text-[#145c3f] border border-[#25a872]/40 tracking-wide">
                {tag}
              </span>
              <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-bold ${cond.className}`}>
                {cond.label}
              </span>
              <span className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {asset.operationalStatus || "Active (in-use)"}
              </span>
              <span className="rounded-lg bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                {asset.verificationStatus || "Verified & Passed"}
              </span>
            </div>

            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate">
              {asset.name || "Unnamed Asset"}
            </h1>
            <p className="text-xs text-slate-500 truncate">
              {asset.primaryCategory || "General Asset"} &bull; {asset.subCategory || "Equipment"} &bull; {asset.specificType || "Standard"}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200/70">
            <div className="pr-3 border-r border-slate-200 text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Net Book Value</p>
              <p className="text-sm sm:text-base font-bold text-[#145c3f] tabular-nums">{naira.format(nbv)}</p>
            </div>
            <div className="pr-3 border-r border-slate-200 text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cost</p>
              <p className="text-sm sm:text-base font-bold text-slate-800 tabular-nums">{naira.format(cost)}</p>
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Last Verified</p>
              <p className="text-xs font-bold text-slate-700 tabular-nums">{asset.lastVerificationDate || "Never"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3-Column Compact Balanced Layout ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Column 1: Identification & Classification */}
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
              <div className="p-1.5 bg-[#e8f5ee] rounded-lg text-[#145c3f]">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Identification</h2>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              <InfoRow label="Asset Name" value={asset.name} icon={FileText} />
              <InfoRow label="Tag Number" value={asset.nhiaTagNumber || tag} icon={Tag} mono highlight />
              <InfoRow label="Category" value={asset.primaryCategory || asset.category} icon={Layers} />
              <InfoRow label="Subcategory" value={asset.subCategory} />
              <InfoRow label="Item Type" value={asset.specificType} />
              <InfoRow label="Serial Number" value={asset.serialNumber || asset.barcodeQrCode} mono />
              <InfoRow label="Tagging Method" value={asset.taggingMethod || "QR Code"} />
            </div>
          </div>
        </div>

        {/* Column 2: Location, Custody & Hierarchy */}
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
              <div className="p-1.5 bg-[#e8f5ee] rounded-lg text-[#145c3f]">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Location & Custody</h2>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              <InfoRow label="Custodian" value={asset.assignedCustodian || asset.custodian || "Unassigned"} icon={User} highlight />
              <InfoRow label="Zone" value={asset.zone_name || (asset.facilitySite === "HQ" ? "Headquarters" : asset.facilitySite)} icon={Building} />
              <InfoRow label="State Office" value={asset.state_name || asset.location} />
              <InfoRow label="Department" value={asset.department_name || asset.officeDeptUnit} />
              <InfoRow label="Unit" value={asset.unit_name} />
              <InfoRow label="Room / Spot" value={asset.specificLocation} />
              <InfoRow label="Allocated Year" value={asset.yearOfAllocation || "—"} />
              <InfoRow label="Supervisor" value={asset.supervisor || asset.coordinator} />
            </div>
          </div>
        </div>

        {/* Column 3: Financials & Verification */}
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
              <div className="p-1.5 bg-[#e8f5ee] rounded-lg text-[#145c3f]">
                <CircleDollarSign className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Valuation & Audit</h2>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              <InfoRow label="Acquisition Cost" value={naira.format(cost)} icon={CircleDollarSign} />
              <InfoRow label="Net Book Value" value={naira.format(nbv)} highlight />
              <InfoRow label="Accum. Dep." value={naira.format(accum)} />
              <InfoRow label="Useful Life" value={`${asset.usefulLifeYears || 5} yrs`} />
              <InfoRow label="Dep. Method" value={asset.depreciationMethod || "Straight-Line"} />
              <InfoRow label="Acquired Date" value={asset.acquisitionDate || asset.purchaseDate || asset.date} icon={Calendar} />
              <InfoRow label="Condition" value={<span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold border ${cond.className}`}>{cond.label}</span>} />
              <InfoRow label="Verification Status" value={asset.verificationStatus || "Verified & Passed"} />
            </div>
          </div>

          <div className="pt-2">
            <Button
              size="sm"
              onClick={() =>
                navigate(`/store-management/verification/verify/asset/${encodeURIComponent(String(asset.id))}`)
              }
              className="w-full h-8 bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5"
            >
              <ClipboardCheck className="w-3.5 h-3.5" /> Conduct Physical Verification
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Compact Category Attributes (Horizontal strip) ──────────────── */}
      {attrs.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm p-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Sliders className="w-3.5 h-3.5 text-[#145c3f]" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Technical Specifications ({asset.primaryCategory})
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {attrs.map(([key, val]) => (
              <div
                key={key}
                className="bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5"
              >
                <span className="font-semibold text-slate-500 uppercase text-[10px]">
                  {key.replace(/([A-Z])/g, " $1").trim()}:
                </span>
                <span className="font-bold text-slate-800">{String(val) || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {asset.comments ? (
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm p-3.5">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Comment / Observations
          </h2>
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{asset.comments}</p>
        </div>
      ) : null}
    </PageLayout>
  );
}

export default AssetDetailView;


