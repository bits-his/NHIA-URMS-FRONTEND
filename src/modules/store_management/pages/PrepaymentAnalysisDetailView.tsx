import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout";
import { storeManagementApi } from "@/src/services/storeManagementApi";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, ExternalLink, FileSpreadsheet, Paperclip } from "lucide-react";

const API_ORIGIN = ((import.meta.env?.VITE_API_URL as string) || "http://localhost:3001/api").replace(/\/api\/?$/, "");

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 });

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <div className="text-sm font-semibold text-slate-900 break-words leading-snug">{children ?? "—"}</div>
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
      <PageLayout title="Stock Prepayment Register" description="Loading register entry…">
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
        description="This record is not on the Stock Prepayment Register"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Back
          </Button>
        }
      >
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">No Entry Found</h3>
          <p className="text-xs text-slate-500 mt-0.5">No stock prepayment register entry matches ID: {id || "—"}</p>
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
          <FileSpreadsheet className="w-5 h-5 text-[#25a872]" /> Stock Prepayment Register Entry
        </span>
      }
      description={`Register record ${row.controlNumber || ""}`}
      back
      backTo="/store-management/prepayment-analysis"
      contentClassName="flex-1 min-h-0"
    >
      <div className="bg-white border border-slate-200 rounded-lg w-full p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="font-mono text-base font-bold text-[#145c3f]" translate="no">{row.controlNumber}</span>
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${matched ? "bg-[#e8f5ee] text-[#0f3d2e]" : "bg-amber-50 text-amber-900"}`}>
            {matched ? "Qty matched" : "Qty variance"}
          </span>
        </div>

        <dl className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-3 w-full">
          <Fact label="Date">{formatDate(row.entryDate)}</Fact>
          <Fact label="Instrument">{row.procurementInstrument || "—"}</Fact>
          <Fact label="Invoice / delivery note"><span className="font-mono">{row.refInvoiceDeliveryNote || "—"}</span></Fact>
          <Fact label="Contractor">{row.contractorName || "—"}</Fact>
          <Fact label="Address">{row.contractorAddress || "—"}</Fact>
          <Fact label="Zone">{row.zone_name || "—"}</Fact>
          <Fact label="Store">{row.state_name || "—"}</Fact>
          <Fact label="Item">{row.itemDescription || "—"}</Fact>
          <Fact label="Ordered"><span className="tabular-nums">{ordered}</span></Fact>
          <Fact label="Supplied"><span className="tabular-nums">{supplied}</span></Fact>
          <Fact label="Variance"><span className="tabular-nums">{variance === 0 ? "0" : variance > 0 ? `−${variance}` : `+${Math.abs(variance)}`}</span></Fact>
          <Fact label="Rate">{naira.format(rate)}</Fact>
          <Fact label="Line value">{naira.format(lineValue)}</Fact>
          <Fact label="Award letter">
            {row.awardLetterPath ? (
              <a
                href={`${API_ORIGIN}${row.awardLetterPath}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[#145c3f] hover:underline"
              >
                <Paperclip className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="truncate">{row.awardLetterName || "View attachment"}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              "—"
            )}
          </Fact>
          <div className="col-span-2">
            <Fact label="Remarks">{row.remarks?.trim() || "—"}</Fact>
          </div>
        </dl>
      </div>
    </PageLayout>
  );
}
