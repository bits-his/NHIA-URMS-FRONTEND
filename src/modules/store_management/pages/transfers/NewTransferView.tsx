import React, { useEffect, useMemo, useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useNavigate } from "react-router-dom";
import { stockApi } from "@/lib/api";
import {
  ArrowRightLeft,
  CheckCircle2,
  ArrowLeft,
  Building2,
  User,
  Tag,
  Loader2,
  ArrowRight,
  Search,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";

export function NewTransferView() {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const [assets, setAssets] = useState<any[]>([]);
  const [assetQuery, setAssetQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(true);

  const [formData, setFormData] = useState({
    assetNumber: "",
    assetName: "",
    assetId: "" as string | number,
    fromOffice: "",
    toOffice: "",
    fromCustodian: "",
    toCustodian: "",
    requestedBy: user?.name || "",
    remarks: "",
  });

  useEffect(() => {
    setLoadingAssets(true);
    stockApi
      .getStoreAssets()
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        setAssets(list);
      })
      .catch(() => toast.error("Failed to load assets — is the API running?"))
      .finally(() => setLoadingAssets(false));
  }, []);

  useEffect(() => {
    if (user?.name) setFormData((p) => ({ ...p, requestedBy: p.requestedBy || user.name }));
  }, [user?.name]);

  const filteredAssets = useMemo(() => {
    const q = assetQuery.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => {
      const hay = [a.assetId, a.assetNumber, a.name, a.facilitySite, a.officeDeptUnit, a.assignedCustodian, a.custodian]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [assets, assetQuery]);

  const selected = useMemo(
    () => assets.find((a) => String(a.id) === String(formData.assetId)),
    [assets, formData.assetId]
  );

  const selectAsset = (found: any | null) => {
    if (!found) {
      setFormData((p) => ({
        ...p,
        assetId: "",
        assetNumber: "",
        assetName: "",
      }));
      return;
    }
    setFormData((p) => ({
      ...p,
      assetId: found.id,
      assetNumber: found.assetId || found.assetNumber || "",
      assetName: found.name || "",
      fromCustodian: found.assignedCustodian || found.custodian || p.fromCustodian,
      fromOffice: found.facilitySite || found.officeDeptUnit || p.fromOffice,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assetId && !formData.assetNumber) {
      toast.error("Select an asset");
      return;
    }
    if (!formData.toOffice.trim()) {
      toast.error("Enter destination office");
      return;
    }
    if (!formData.toCustodian.trim()) {
      toast.error("Enter receiving custodian");
      return;
    }
    setSaving(true);
    try {
      await stockApi.createTransfer({
        assetId: formData.assetId || undefined,
        assetNumber: formData.assetNumber,
        assetName: formData.assetName,
        fromOffice: formData.fromOffice,
        toOffice: formData.toOffice,
        fromCustodian: formData.fromCustodian,
        toCustodian: formData.toCustodian,
        requestedBy: formData.requestedBy,
        remarks: formData.remarks,
        status: "SUBMITTED",
      });
      setSuccessMsg(true);
      toast.success("Transfer submitted for approval");
      setTimeout(() => navigate("/store-management/transfers/requests"), 700);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create transfer");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25a872]/35 focus:border-[#25a872] disabled:bg-slate-50 disabled:text-slate-500";
  const labelCls = "block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5";

  return (
    <PageLayout
      title="New Asset Transfer"
      description="Request custody handoff between offices — submitted for approval"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/store-management/transfers/requests")}
          className="text-xs border-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Transfers
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {successMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            Transfer request created — opening the transfers board…
          </div>
        )}

        {/* Live route preview */}
        <div className="rounded-xl border border-[#145c3f]/20 bg-[linear-gradient(135deg,#e8f5ee_0%,#ffffff_55%)] p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#145c3f]/70 mb-3">
            Transfer preview
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <PreviewSide
              title="Leaving"
              office={formData.fromOffice || "Source office"}
              person={formData.fromCustodian || "Current custodian"}
              asset={formData.assetName || "Select an asset"}
              tag={formData.assetNumber}
            />
            <div className="flex justify-center">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#145c3f] text-white shadow-sm">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <PreviewSide
              title="Arriving"
              office={formData.toOffice || "Destination office"}
              person={formData.toCustodian || "Receiving custodian"}
              asset={formData.assetName || "—"}
              tag={formData.assetNumber}
              emphasize
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5">
          {/* Asset picker */}
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <header className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Tag className="h-4 w-4 text-[#145c3f]" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">1. Asset</h3>
                <p className="text-[11px] text-slate-500">Choose the tagged asset leaving custody</p>
              </div>
            </header>
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={assetQuery}
                  onChange={(e) => setAssetQuery(e.target.value)}
                  placeholder="Search tag or name…"
                  className={`${inputCls} pl-9`}
                />
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                {loadingAssets && (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Loading assets…
                  </div>
                )}
                {!loadingAssets && filteredAssets.length === 0 && (
                  <div className="p-6 text-center text-xs text-amber-800 bg-amber-50">
                    {assets.length === 0
                      ? "No assets in register. Register an asset first."
                      : "No assets match that search."}
                  </div>
                )}
                {!loadingAssets &&
                  filteredAssets.map((a) => {
                    const active = String(a.id) === String(formData.assetId);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => selectAsset(a)}
                        className={`w-full text-left px-3 py-2.5 transition-colors duration-150 ease-out ${
                          active ? "bg-[#e8f5ee]" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{a.name}</p>
                            <p className="font-mono text-[11px] text-[#145c3f] font-semibold">
                              {a.assetId || a.assetNumber}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {a.facilitySite || a.officeDeptUnit || "No site"} ·{" "}
                              {a.assignedCustodian || a.custodian || "Unassigned"}
                            </p>
                          </div>
                          {active && <CheckCircle2 className="h-4 w-4 text-[#145c3f] shrink-0 mt-0.5" />}
                        </div>
                      </button>
                    );
                  })}
              </div>

              {selected && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-[11px] text-slate-600">
                  Selected: <span className="font-bold text-slate-900">{selected.name}</span>
                  <span className="font-mono text-[#145c3f] ml-1">
                    ({selected.assetId || selected.assetNumber})
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Movement + people */}
          <div className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <header className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#145c3f]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">2. Offices</h3>
                  <p className="text-[11px] text-slate-500">Source is prefilled from the asset when available</p>
                </div>
              </header>
              <div className="p-4 grid grid-cols-1 gap-3">
                <div>
                  <label className={labelCls}>Source office (from)</label>
                  <input
                    type="text"
                    value={formData.fromOffice}
                    onChange={(e) => setFormData({ ...formData, fromOffice: e.target.value })}
                    className={inputCls}
                    placeholder="e.g. HQ Main Store"
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Destination office (to)</label>
                  <input
                    type="text"
                    value={formData.toOffice}
                    onChange={(e) => setFormData({ ...formData, toOffice: e.target.value })}
                    className={inputCls}
                    placeholder="e.g. Kano Zonal Office"
                    required
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <header className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <User className="h-4 w-4 text-[#25a872]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">3. Custodians</h3>
                  <p className="text-[11px] text-slate-500">Who holds the asset before and after the move</p>
                </div>
              </header>
              <div className="p-4 grid grid-cols-1 gap-3">
                <div>
                  <label className={labelCls}>Current custodian</label>
                  <input
                    type="text"
                    value={formData.fromCustodian}
                    onChange={(e) => setFormData({ ...formData, fromCustodian: e.target.value })}
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Receiving custodian</label>
                  <input
                    type="text"
                    value={formData.toCustodian}
                    onChange={(e) => setFormData({ ...formData, toCustodian: e.target.value })}
                    className={inputCls}
                    required
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <header className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#145c3f]" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">4. Request details</h3>
              <p className="text-[11px] text-slate-500">Requester and purpose for the audit trail</p>
            </div>
          </header>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Requested by</label>
              <input
                type="text"
                value={formData.requestedBy}
                onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
                className={inputCls}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Purpose / notes</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className={`${inputCls} h-24 py-2.5 resize-y`}
                placeholder="Reason for transfer, delivery instructions…"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <p className="text-[11px] text-slate-500">
            Submits as <span className="font-bold text-amber-800">SUBMITTED</span> — next step is approval on the transfers board.
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              className="text-xs h-10"
              onClick={() => navigate("/store-management/transfers/requests")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !formData.assetId}
              className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white font-bold text-xs h-10 min-w-[180px]"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-4 w-4 mr-1.5" />
              )}
              Submit Transfer
            </Button>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}

function PreviewSide({
  title,
  office,
  person,
  asset,
  tag,
  emphasize,
}: {
  title: string;
  office: string;
  person: string;
  asset: string;
  tag?: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3.5 py-3 ${
        emphasize ? "bg-white border-[#145c3f]/25 shadow-sm" : "bg-white/70 border-slate-200"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">{title}</p>
      <p className="text-sm font-bold text-slate-900 truncate">{office}</p>
      <p className="text-[11px] text-slate-500 truncate">{person}</p>
      <div className="mt-2 pt-2 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-800 truncate">{asset}</p>
        {tag ? <p className="font-mono text-[10px] text-[#145c3f]">{tag}</p> : null}
      </div>
    </div>
  );
}

export default NewTransferView;
