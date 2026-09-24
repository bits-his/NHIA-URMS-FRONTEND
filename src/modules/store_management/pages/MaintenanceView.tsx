import React, { useCallback, useEffect, useState } from "react";
import { stockApi } from "@/lib/api";
import CustomTable, { CustomTableField } from "@/components/CustomTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wrench, Plus, Download, Loader2, X } from "lucide-react";
import PageLayout from "../components/PageLayout";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";

export default function MaintenanceView() {
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
    type: "PREVENTIVE",
    description: "",
    vendor: "",
    cost: 0,
    startDate: new Date().toISOString().slice(0, 10),
    performedBy: user?.name || "",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stockApi.getMaintenance();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load maintenance — is the API running?");
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
    if (user?.name) setForm((p) => ({ ...p, performedBy: p.performedBy || user.name }));
  }, [user?.name]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetId) {
      toast.error("Select an asset");
      return;
    }
    setSaving(true);
    try {
      await stockApi.createMaintenance({
        ...form,
        assetId: Number(form.assetId),
        cost: Number(form.cost) || 0,
      });
      toast.success("Maintenance logged");
      setShowForm(false);
      setForm((p) => ({
        ...p,
        description: "",
        vendor: "",
        cost: 0,
        assetId: "",
        assetNumber: "",
        assetName: "",
      }));
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const fields: CustomTableField[] = [
    { title: "Maintenance Ref", value: "maintenanceNo", className: "font-mono font-bold text-slate-800" },
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
    { title: "Vendor / Technician", value: "vendor" },
    { title: "Type", value: "type" },
    { title: "Description", value: "description" },
    {
      title: "Cost (₦)",
      value: "cost",
      custom: true,
      component: (item) => (
        <span className="font-semibold font-mono text-slate-900">
          ₦{Number(item.cost || 0).toLocaleString()}
        </span>
      ),
    },
    { title: "Performed By", value: "performedBy" },
  ];

  const inputCls = "w-full px-3 py-2 rounded-md border border-slate-200 text-sm";

  return (
    <PageLayout
      title={
        <span className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-[#25a872]" /> Maintenance & Repairs
        </span>
      }
      description="Preventive servicing, repairs, and vendor maintenance logs"
      actions={
        <>
          <Button variant="outline" size="sm" className="text-xs h-9 border-slate-200">
            <Download className="w-4 h-4 mr-1.5" /> Export Log
          </Button>
          <Button
            size="sm"
            className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs h-9 font-semibold"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
            {showForm ? "Close Form" : "Log Repair Work"}
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
            <label className="font-bold text-slate-700 block mb-1">Type</label>
            <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="PREVENTIVE">Preventive</option>
              <option value="CORRECTIVE">Corrective</option>
              <option value="OVERHAUL">Overhaul</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Vendor *</label>
            <input className={inputCls} required value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Cost (₦)</label>
            <Input type="number" min={0} step="0.01" className={inputCls} value={form.cost || ""} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) || 0 })} />
          </div>
          <div className="md:col-span-2">
            <label className="font-bold text-slate-700 block mb-1">Description *</label>
            <input className={inputCls} required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Start Date</label>
            <input type="date" className={inputCls} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Performed By</label>
            <input className={inputCls} required value={form.performedBy} onChange={(e) => setForm({ ...form, performedBy: e.target.value })} />
          </div>
          <div className="md:col-span-2 lg:col-span-3 flex justify-end">
            <Button type="submit" disabled={saving} className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs font-semibold">
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
              Save Maintenance
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
        message="No maintenance records found"
      />
    </PageLayout>
  );
}
