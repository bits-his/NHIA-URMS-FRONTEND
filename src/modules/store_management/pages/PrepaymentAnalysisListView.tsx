import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { storeManagementApi } from "@/src/services/storeManagementApi";
import CustomTable, { CustomTableField } from "@/components/CustomTable";
import { Button } from "@/components/ui/button";
import { Plus, Paperclip, ExternalLink, FileSpreadsheet, Eye, CheckCircle2, AlertTriangle } from "lucide-react";
import PageLayout from "../components/PageLayout";
import ListSearchBar from "../components/ListSearchBar";
import { useCreateReviewAccess } from "@/src/access/createReviewAccess";

const API_ORIGIN = ((import.meta.env?.VITE_API_URL as string) || "http://localhost:3001/api").replace(/\/api\/?$/, "");

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default function PrepaymentAnalysisListView() {
  const navigate = useNavigate();
  const { canCreate, createOnly } = useCreateReviewAccess();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(!createOnly);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<"all" | "matched" | "variance" | "award">("all");

  useEffect(() => {
    if (!createOnly) return;
    navigate("/store-management/prepayment-analysis/new", { replace: true });
  }, [createOnly, navigate]);

  useEffect(() => {
    if (createOnly) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await storeManagementApi.getPrepaymentAnalyses();
        if (!cancelled) setRows(Array.isArray(res.data) ? res.data : []);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load register");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createOnly]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.controlNumber,
        r.contractorName,
        r.contractorAddress,
        r.procurementInstrument,
        r.refInvoiceDeliveryNote,
        r.itemDescription,
        r.remarks,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  const counts = useMemo(() => {
    let matched = 0;
    let variance = 0;
    let award = 0;
    for (const r of searched) {
      const ordered = Number(r.quantityOrdered || 0);
      const supplied = Number(r.quantitySupplied || 0);
      if (ordered === supplied) matched += 1;
      else variance += 1;
      if (r.awardLetterPath) award += 1;
    }
    return { total: searched.length, matched, variance, award };
  }, [searched]);

  const filtered = useMemo(() => {
    if (bucket === "matched") {
      return searched.filter((r) => Number(r.quantityOrdered || 0) === Number(r.quantitySupplied || 0));
    }
    if (bucket === "variance") {
      return searched.filter((r) => Number(r.quantityOrdered || 0) !== Number(r.quantitySupplied || 0));
    }
    if (bucket === "award") return searched.filter((r) => r.awardLetterPath);
    return searched;
  }, [searched, bucket]);

  const toggleBucket = (next: typeof bucket) => {
    setBucket((prev) => (prev === next ? "all" : next));
  };

  const kpis = [
    {
      key: "all" as const,
      label: "Total",
      value: counts.total,
      icon: <FileSpreadsheet className="w-3.5 h-3.5 text-[#25a872]" />,
      accent: "border-[#d4e8dc] bg-white",
      onClick: () => setBucket("all"),
    },
    {
      key: "matched" as const,
      label: "Matched",
      value: counts.matched,
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      accent: "border-emerald-200 bg-emerald-50/50",
      onClick: () => toggleBucket("matched"),
    },
    {
      key: "variance" as const,
      label: "Variance",
      value: counts.variance,
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
      accent: "border-amber-200 bg-amber-50/50",
      onClick: () => toggleBucket("variance"),
    },
    {
      key: "award" as const,
      label: "Award letter",
      value: counts.award,
      icon: <Paperclip className="w-3.5 h-3.5 text-slate-500" />,
      accent: "border-slate-200 bg-white",
      onClick: () => toggleBucket("award"),
    },
  ];

  const fields: CustomTableField[] = [
    {
      title: "Control No.",
      value: "controlNumber",
      className: "whitespace-nowrap",
      custom: true,
      component: (item) => (
        <button
          type="button"
          onClick={() => navigate(`/store-management/prepayment-analysis/${item.id}`)}
          className="font-mono text-sm font-semibold tabular-nums text-[#145c3f] whitespace-nowrap hover:underline cursor-pointer"
        >
          {item.controlNumber}
        </button>
      ),
    },
    {
      title: "Date",
      value: "entryDate",
      className: "whitespace-nowrap",
      custom: true,
      component: (item) => (
        <span className="text-slate-700 tabular-nums whitespace-nowrap">{formatDate(item.entryDate)}</span>
      ),
    },
    {
      title: "Instrument",
      value: "procurementInstrument",
      custom: true,
      component: (item) => (
        <span className="inline-flex rounded-md bg-[#e8f5ee] px-2 py-0.5 text-[11px] font-semibold text-[#0f3d2e] whitespace-nowrap">
          {item.procurementInstrument || "—"}
        </span>
      ),
    },
    {
      title: "Contractor",
      value: "contractorName",
      className: "min-w-[140px] font-medium text-slate-900",
    },
    {
      title: "Ref",
      value: "refInvoiceDeliveryNote",
      custom: true,
      component: (item) => (
        <span className="font-mono text-xs text-slate-700 whitespace-nowrap">
          {item.refInvoiceDeliveryNote || "—"}
        </span>
      ),
    },
    {
      title: "Item",
      value: "itemDescription",
      className: "min-w-[160px] text-slate-800",
    },
    {
      title: "Ordered",
      value: "quantityOrdered",
      className: "text-right whitespace-nowrap",
      custom: true,
      component: (item) => (
        <span className="font-mono font-semibold tabular-nums">{item.quantityOrdered ?? 0}</span>
      ),
    },
    {
      title: "Supplied",
      value: "quantitySupplied",
      className: "text-right whitespace-nowrap",
      custom: true,
      component: (item) => {
        const ordered = Number(item.quantityOrdered || 0);
        const supplied = Number(item.quantitySupplied || 0);
        const variance = ordered !== supplied;
        return (
          <span className={`font-mono font-semibold tabular-nums ${variance ? "text-amber-800" : "text-slate-900"}`}>
            {supplied}
          </span>
        );
      },
    },
    {
      title: "Rate",
      value: "rate",
      className: "text-right whitespace-nowrap",
      custom: true,
      component: (item) => (
        <span className="font-mono font-semibold tabular-nums text-slate-900">
          {naira.format(Number(item.rate || 0))}
        </span>
      ),
    },
    {
      title: "Award",
      value: "awardLetterPath",
      className: "whitespace-nowrap",
      custom: true,
      component: (item) =>
        item.awardLetterPath ? (
          <a
            href={`${API_ORIGIN}${item.awardLetterPath}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#145c3f] hover:underline"
          >
            <Paperclip className="w-3.5 h-3.5" aria-hidden="true" />
            View
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        ) : (
          <span className="text-slate-400 text-[11px]">None</span>
        ),
    },
    {
      title: "Remarks",
      value: "remarks",
      className: "min-w-[120px]",
      custom: true,
      component: (item) => <span className="text-slate-700">{item.remarks || "—"}</span>,
    },
    {
      title: "",
      value: "id",
      className: "whitespace-nowrap",
      custom: true,
      component: (item) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate(`/store-management/prepayment-analysis/${item.id}`)}
          className="h-8 px-2 text-[11px] font-semibold text-[#145c3f] hover:bg-[#e8f5ee]"
        >
          <Eye className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> View
        </Button>
      ),
    },
  ];

  if (createOnly) return null;

  return (
    <PageLayout
      title={
        <span className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-[#25a872]" /> Stock Prepayment Register
        </span>
      }
      description="Stock Verification — Stock Prepayment Register"
      actions={
        canCreate ? (
        <Button
          size="sm"
          onClick={() => navigate("/store-management/prepayment-analysis/new")}
          className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs h-9 font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" /> New entry
        </Button>
        ) : null
      }
      contentClassName="gap-3 min-w-0"
    >
      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={kpi.onClick}
            className={`rounded-lg border px-3 py-2 flex items-center gap-2.5 text-left ${kpi.accent} ${bucket === kpi.key ? "ring-2 ring-[#145c3f] ring-offset-1" : ""}`}
          >
            {kpi.icon}
            <div className="min-w-0">
              <p className="text-lg font-bold text-slate-800 tabular-nums leading-none">{kpi.value}</p>
              <p className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">{kpi.label}</p>
            </div>
          </button>
        ))}
      </div>

      <ListSearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search control no, contractor, item…"
        id="par-search"
      />

      <div className="min-w-0 w-full overflow-x-auto">
        <CustomTable
          data={filtered}
          fields={fields}
          filter={false}
          loading={loading}
          pageSize={20}
          message={
            bucket === "all"
              ? "No stock prepayment register records yet — add an entry"
              : `No ${bucket} records match this search`
          }
        />
      </div>
    </PageLayout>
  );
}
