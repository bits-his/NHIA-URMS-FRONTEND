import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout";
import { storeManagementApi } from "@/src/services/storeManagementApi";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Package,
  Paperclip,
  Truck,
} from "lucide-react";

const API_ORIGIN = ((import.meta.env?.VITE_API_URL as string) || "http://localhost:3001/api").replace(/\/api\/?$/, "");

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 });

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function InfoRow({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 shrink-0">{label}</span>
      <div
        className={`text-xs font-semibold text-right break-words max-w-[65%] ${
          highlight ? "text-[#145c3f] font-bold" : mono ? "font-mono text-slate-800" : "text-slate-800"
        }`}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

export default function PrepaymentAnalysisDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await storeManagementApi.getPrepaymentAnalysisById(id);
        if (!cancelled) setRow(res?.data || res || null);
      } catch {
        if (!cancelled) setRow(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <PageLayout title="Prepayment Analysis" description="Loading register entry…">
        <div className="space-y-3 animate-pulse">
          <div className="h-20 rounded-xl bg-slate-200/70" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="h-56 rounded-xl bg-slate-100" />
            <div className="h-56 rounded-xl bg-slate-100" />
            <div className="h-56 rounded-xl bg-slate-100" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!row) {
    return (
      <PageLayout
        title="Entry Not Found"
        description="This record is not on the Prepayment Analysis Register"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Back
          </Button>
        }
      >
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">No Entry Found</h3>
          <p className="text-xs text-slate-500 mt-0.5">No prepayment analysis matches ID: {id || "—"}</p>
          <Button
            size="sm"
            onClick={() => navigate("/store-management/prepayment-analysis")}
            className="mt-4 bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs"
          >
            Go to Register
          </Button>
        </div>
      </PageLayout>
    );
  }

  const ordered = Number(row.quantityOrdered || 0);
  const supplied = Number(row.quantitySupplied || 0);
  const variance = ordered - supplied;
  const matched = ordered === supplied;
  const rate = Number(row.rate || 0);
  const lineValue = rate * ordered;

  return (
    <PageLayout
      title={
        <span className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-[#25a872]" /> Prepayment Analysis Entry
        </span>
      }
      description={`Register record ${row.controlNumber || ""}`}
      back
      backTo="/store-management/prepayment-analysis"
      contentClassName="gap-3.5"
    >
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-[#145c3f] text-white px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/10 border border-white/20 rounded-lg text-emerald-200 shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/90">Control Number</p>
              <h1 className="text-lg font-bold font-mono tracking-tight truncate">{row.controlNumber}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="rounded-lg bg-white/10 border border-white/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
              {formatDate(row.entryDate)}
            </span>
            <span className="rounded-lg bg-white/10 border border-white/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
              {row.procurementInstrument || "—"}
            </span>
            <span
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                matched
                  ? "bg-emerald-100 text-emerald-900 border-emerald-200"
                  : "bg-amber-100 text-amber-950 border-amber-300"
              }`}
            >
              {matched ? "Qty matched" : "Qty variance"}
            </span>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-slate-100 bg-[#f4f7f5]/60">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Item</p>
          <p className="text-sm font-bold text-slate-900">{row.itemDescription || "—"}</p>
          <p className="text-xs text-slate-600 mt-0.5">{row.contractorName}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ordered</p>
            <p className="text-base font-bold font-mono tabular-nums text-slate-900">{ordered}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Supplied</p>
            <p className={`text-base font-bold font-mono tabular-nums ${matched ? "text-slate-900" : "text-amber-800"}`}>
              {supplied}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Variance</p>
            <p className={`text-base font-bold font-mono tabular-nums ${variance === 0 ? "text-slate-900" : "text-amber-800"}`}>
              {variance === 0 ? "0" : variance > 0 ? `−${variance}` : `+${Math.abs(variance)}`}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Line value</p>
            <p className="text-base font-bold font-mono tabular-nums text-[#145c3f]">{naira.format(lineValue)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
            <div className="p-1.5 bg-[#e8f5ee] rounded-lg text-[#145c3f]">
              <ClipboardList className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Procurement</h2>
          </div>
          <InfoRow label="Date" value={formatDate(row.entryDate)} mono />
          <InfoRow label="Instrument" value={row.procurementInstrument || "—"} highlight />
          <InfoRow label="Ref (Invoice / DN)" value={row.refInvoiceDeliveryNote || "—"} mono />
          <InfoRow label="Zone" value={row.zone_name || "—"} />
          <InfoRow label="State" value={row.state_name || "—"} />
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
            <div className="p-1.5 bg-[#e8f5ee] rounded-lg text-[#145c3f]">
              <Truck className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Contractor</h2>
          </div>
          <InfoRow label="Name" value={row.contractorName || "—"} highlight />
          <InfoRow label="Address" value={row.contractorAddress || "—"} />
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
            <div className="p-1.5 bg-[#e8f5ee] rounded-lg text-[#145c3f]">
              <Package className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Quantities & Rate</h2>
          </div>
          <InfoRow label="Item" value={row.itemDescription || "—"} />
          <InfoRow label="Qty ordered" value={ordered} mono />
          <InfoRow label="Qty supplied" value={supplied} mono />
          <InfoRow label="Rate" value={naira.format(rate)} mono highlight />
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
          <div className="p-1.5 bg-[#e8f5ee] rounded-lg text-[#145c3f]">
            <FileText className="w-4 h-4" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Award Letter & Remarks</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Award letter</p>
            {row.awardLetterPath ? (
              <a
                href={`${API_ORIGIN}${row.awardLetterPath}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[#25a872]/40 bg-[#e8f5ee] px-3 py-2 text-xs font-semibold text-[#145c3f] hover:bg-[#d8efe4]"
              >
                <Paperclip className="w-4 h-4" aria-hidden="true" />
                <span className="truncate max-w-[220px]">{row.awardLetterName || "View attachment"}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <p className="text-xs text-slate-500">No award letter attached</p>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Remarks</p>
            <p className="text-xs text-slate-800 whitespace-pre-wrap">{row.remarks?.trim() || "—"}</p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
