import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { stockApi } from "@/lib/api";
import CustomTable, { CustomTableField } from "@/components/CustomTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Download, Loader2, X } from "lucide-react";
import PageLayout from "../components/PageLayout";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";

export default function AssetDisposalView() {
  const [searchParams] = useSearchParams();
  const user = useSelector((s: RootState) => s.auth.user);
  const [rows, setRows] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    assetId: "",
    assetNumber: "",
    assetName: "",
    reason: "OBSOLETE",
    approvedBy: user?.name || "",
    disposalValue: 0,
    disposalDate: new Date().toISOString().slice(0, 10),
    remarks: "",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stockApi.getDisposals();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load disposals — is the API running?");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    stockApi.getStoreAssets().then((r) => setAssets(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [load]);

  useEffect(() => {
    const assetId = searchParams.get("assetId") || "";
    const reason = searchParams.get("reason") || "";
    if (!assetId && !reason) return;
    setShowForm(true);
    setForm((p) => ({
      ...p,
      assetId: assetId || p.assetId,
      reason: reason || p.reason,
    }));
  }, [searchParams]);

  useEffect(() => {
    const assetId = searchParams.get("assetId");
    if (!assetId || !assets.length) return;
    const a = assets.find((x) => String(x.id) === assetId);
    if (!a) return;
    setForm((p) => ({
      ...p,
      assetId: String(a.id),
      assetNumber: a.assetId || a.assetNumber || "",
      assetName: a.name || "",
    }));
  }, [assets, searchParams]);

  useEffect(() => {
    if (user?.name) setForm((p) => ({ ...p, approvedBy: p.approvedBy || user.name }));
  }, [user?.name]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetId) {
      toast.error("Select an asset");
      return;
    }
    setSaving(true);
    try {
      await stockApi.createDisposal({
        ...form,
        assetId: Number(form.assetId),
        disposalValue: Number(form.disposalValue) || 0,
      });
      toast.success("Disposal recorded");
      setShowForm(false);
      setForm((p) => ({
        ...p,
        assetId: "",
        assetNumber: "",
        assetName: "",
        remarks: "",
        disposalValue: 0,
      }));
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const fields: CustomTableField[] = [
    { title: "Disposal Ref", value: "disposalNumber", className: "font-mono font-bold text-slate-800" },
    {
      title: "Asset",
      value: "assetName",
      custom: true,
      component: (item) => (
        <span>
          <span className="font-semibold">{item.assetName || "—"}</span>
          <span className="block font-mono text-[10px] text-slate-500">{item.assetNumber}</span>
        </span>
      ),
    },
    { title: "Disposal Reason", value: "reason" },
    { title: "Approved By", value: "approvedBy" },
    { title: "Disposal Date", value: "disposalDate" },
    {
      title: "Realized Value (₦)",
      value: "disposalValue",
      custom: true,
      component: (item) => (
        <span className="font-semibold font-mono text-slate-900">
          ₦{Number(item.disposalValue || 0).toLocaleString()}
        </span>
      ),
    },
  ];

  const inputCls = "w-full px-3 py-2 rounded-md border border-slate-200 text-sm";

  return (
    <PageLayout
      title={
        <span className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-rose-600" /> Board Disposal Records
        </span>
      }
      description="Approved write-offs, auctions, and disposal certificates"
      actions={
        <>
          <Button variant="outline" size="sm" className="text-xs h-9 border-slate-200">
            <Download className="w-4 h-4 mr-1.5" /> Export Log
          </Button>
          <Button
            size="sm"
            className="bg-rose-700 hover:bg-rose-800 text-white text-xs h-9 font-semibold"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
            {showForm ? "Close Form" : "Initiate Disposal"}
          </Button>
        </>
      }
    >
      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="md:col-span-2 lg:col-span-3">
            <label className="font-bold text-slate-700 block mb-1">Asset *</label>
            <select
              className={inputCls}
              required
              value={form.assetId}
              onChange={(e) => {
                const a = assets.find((x) => String(x.id) === e.target.value);
                setForm({
                  ...form,
                  assetId: e.target.value,
                  assetNumber: a ? a.assetId || a.assetNumber || "" : "",
                  assetName: a?.name || "",
                });
              }}
            >
              <option value="">Select asset…</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.assetId || a.assetNumber} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Reason</label>
            <select className={inputCls} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
              <option value="OBSOLETE">Obsolete</option>
              <option value="DAMAGED">Damaged</option>
              <option value="LOST">Lost</option>
              <option value="AUCTIONED">Auctioned</option>
              <option value="DONATED">Donated</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Disposal Value (₦)</label>
            <Input type="number" min={0} step="0.01" className={inputCls} value={form.disposalValue || ""} onChange={(e) => setForm({ ...form, disposalValue: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Disposal Date</label>
            <input type="date" className={inputCls} value={form.disposalDate} onChange={(e) => setForm({ ...form, disposalDate: e.target.value })} />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Approved By</label>
            <input className={inputCls} required value={form.approvedBy} onChange={(e) => setForm({ ...form, approvedBy: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="font-bold text-slate-700 block mb-1">Remarks</label>
            <input className={inputCls} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </div>
          <div className="md:col-span-2 lg:col-span-3 flex justify-end">
            <Button type="submit" disabled={saving} className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
              Save Disposal
            </Button>
          </div>
        </form>
      )}

      <CustomTable
        data={rows}
        fields={fields}
        filter={true}
        loading={loading}
        pageSize={15}
        message="No board disposal records found"
      />
    </PageLayout>
  );
}
