import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { AppDispatch, RootState } from "@/src/store/store";
import { fetchAssets, addTransfer, fetchTransfers } from "@/src/store/slices/assetSlice";
import PageLayout from "../components/PageLayout";
import {
  Building2,
  ShieldCheck,
  FileCheck,
  QrCode,
  ArrowRightLeft,
  CheckCircle2,
  PlusCircle,
  ClipboardList,
  Wrench,
  Warehouse,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardView() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { assets } = useSelector((s: RootState) => s.asset);
  const { transfers } = useSelector((s: RootState) => s.asset);
  useEffect(() => {
    dispatch(fetchAssets());
    dispatch(fetchTransfers());
  }, [dispatch]);

  const [showQuickTransferModal, setShowQuickTransferModal] = useState(false);
  const [showQuickMntModal, setShowQuickMntModal] = useState(false);

  const [trfData, setTrfData] = useState({
    assetNumber: assets[0]?.assetNumber || "NHIA/HQ/001",
    assetName: assets[0]?.name || "HP LaserJet Printer",
    fromOffice: "HQ Main Office",
    toOffice: "Kano Zonal Office",
    fromCustodian: "Ahmadu Bello",
    toCustodian: "Alhaji Danladi Usman",
    requestedBy: "Musa Ibrahim",
    remarks: "Quick Transfer from Dashboard",
  });

  const [mntData, setMntData] = useState({
    assetName: assets[0]?.name || "Cisco Switch",
    type: "PREVENTIVE",
    description: "Routine servicing and firmware check",
    vendor: "Cisco Certified Partner",
    cost: 75000,
  });

  const totalAcquisitionCost = assets.reduce(
    (acc: number, a: any) => acc + parseFloat(a.acquisitionValue || a.acquisitionCost || 0),
    0
  );

  const handleQuickTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(addTransfer(trfData));
    setShowQuickTransferModal(false);
  };

  const handleQuickMntSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowQuickMntModal(false);
  };

  return (
    <PageLayout
      title="NHIA Asset & Inventory Platform Dashboard"
      description="Enterprise Public Sector Control Dashboard for Assets, Stores Inventory, Verifications, and Field Audits"
      actions={
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate("/store-management/assets/register")}
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs h-8"
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
            Register New Asset
          </Button>
          <Button
            onClick={() => navigate("/store-management/prepayment-analysis")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8"
          >
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
            Prepayment Analysis
          </Button>
        </div>
      }
    >
      {/* Quick Action Hub Bar */}
      <div className="bg-slate-900 text-white p-3.5 rounded-lg shadow-md mb-4 flex items-center justify-between overflow-x-auto gap-3 text-xs">
        <span className="font-bold text-sky-300 uppercase tracking-wider text-[11px] shrink-0">
          Quick Operations:
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowQuickTransferModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded border border-slate-700 flex items-center gap-1.5"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 text-sky-400" />
            Initiate Transfer
          </button>

          <button
            onClick={() => setShowQuickMntModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded border border-slate-700 flex items-center gap-1.5"
          >
            <Wrench className="h-3.5 w-3.5 text-amber-400" />
            Log Maintenance
          </button>

          <button
            onClick={() => navigate("/store-management/verification/verify")}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded border border-slate-700 flex items-center gap-1.5"
          >
            <QrCode className="h-3.5 w-3.5 text-emerald-400" />
            Scan QR Code Audit
          </button>

          <button
            onClick={() => navigate("/store-management/reports/analytics")}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded border border-slate-700 flex items-center gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-purple-400" />
            Export Portfolio Report
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Asset Portfolio Valuation
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              ₦{totalAcquisitionCost.toLocaleString()}
            </h3>
            <p className="text-[11px] text-sky-600 font-medium mt-0.5">
              {assets.length} Master Registered Assets
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Verified Assets
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">
              {assets.filter((a: any) => String(a.verificationStatus || "").toLowerCase().startsWith("verified")).length}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Marked verified on the asset register
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Transfers
            </p>
            <h3 className="text-2xl font-bold text-purple-700 mt-1">{transfers.length}</h3>
            <p className="text-[11px] text-purple-600 font-medium mt-0.5">
              Inter-Office Movements
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Store SKUs in Stock
            </p>
            <h3 className="text-2xl font-bold text-indigo-700 mt-1">12 SKUs</h3>
            <p className="text-[11px] text-indigo-600 font-medium mt-0.5">
              Central & Regional Stores
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Warehouse className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        {/* Active Asset Register List */}
        <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-sky-600" />
              Active Master Asset Register Items
            </h3>
            <Link
              to="/store-management/assets/list"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              View All Assets →
            </Link>
          </div>

          <div className="divide-y divide-gray-100 overflow-y-auto flex-1 mt-2">
            {assets.map((asset: any) => {
              const cost = parseFloat(asset.acquisitionValue || asset.acquisitionCost || 0);
              return (
                <div
                  key={asset.id}
                  className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 p-1.5 rounded transition-all"
                >
                  <div>
                    <p className="font-bold text-slate-900">{asset.name}</p>
                    <p className="text-slate-500 text-[11px]">
                      <span className="font-mono text-sky-700 font-bold">
                        {asset.assetNumber || asset.assetId}
                      </span>{" "}
                      • {asset.department || "Admin"} ({asset.custodian || "Store Officer"})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {asset.status || "Active"}
                    </span>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      ₦{cost.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-Time Movement Feed */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-slate-600" />
              Real-Time Movement Feed
            </h3>
          </div>

          <div className="space-y-2.5 mt-3 flex-1 overflow-y-auto max-h-[400px]">
            {transfers.map((trf: any) => (
              <div
                key={trf.id}
                className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 font-mono">
                    {trf.transferNumber || "TRF-2026"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                    {trf.status || "TRANSFERRED"}
                  </span>
                </div>
                <p className="text-slate-800 text-[11px] font-semibold">
                  {trf.fromOffice} → <span className="font-bold">{trf.toOffice}</span>
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>Custodian: {trf.toCustodian}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Transfer Modal */}
      {showQuickTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-lg p-5">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-sky-600" />
                Quick Asset Transfer Request
              </h3>
              <button
                onClick={() => setShowQuickTransferModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickTransferSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Asset
                </label>
                <select
                  value={trfData.assetNumber}
                  onChange={(e) => setTrfData({ ...trfData, assetNumber: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-gray-300 font-mono font-bold"
                >
                  {assets.map((a: any) => (
                    <option key={a.id} value={a.assetNumber}>
                      {a.assetNumber} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">From Office</label>
                  <input
                    type="text"
                    value={trfData.fromOffice}
                    onChange={(e) => setTrfData({ ...trfData, fromOffice: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">To Office</label>
                  <input
                    type="text"
                    value={trfData.toOffice}
                    onChange={(e) => setTrfData({ ...trfData, toOffice: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowQuickTransferModal(false)}
                  className="px-3 py-1.5 rounded border text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-sky-600 text-white font-semibold hover:bg-sky-700"
                >
                  Submit Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Maintenance Modal */}
      {showQuickMntModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-lg p-5">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-600" />
                Quick Log Maintenance / Repair
              </h3>
              <button
                onClick={() => setShowQuickMntModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickMntSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Vendor / Service Provider
                </label>
                <input
                  type="text"
                  value={mntData.vendor}
                  onChange={(e) => setMntData({ ...mntData, vendor: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowQuickMntModal(false)}
                  className="px-3 py-1.5 rounded border text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-amber-600 text-white font-semibold hover:bg-amber-700"
                >
                  Log Maintenance Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default DashboardView;
