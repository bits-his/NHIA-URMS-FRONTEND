import React, { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { storeManagementApi } from "@/src/services/storeManagementApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, Paperclip, ExternalLink, Eye, RefreshCw, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateReviewAccess } from "@/src/access/createReviewAccess";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import PageLayout from "@/src/components/PageLayout";

const API_ORIGIN = ((import.meta.env?.VITE_API_URL as string) || "http://localhost:3001/api").replace(/\/api\/?$/, "");

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

type Bucket = "all" | "matched" | "variance" | "award";

const BUCKET_LABELS: Record<Bucket, string> = {
  all: "All",
  matched: "Matched",
  variance: "Variance",
  award: "Award letter",
};

export default function PrepaymentAnalysisListView() {
  const navigate = useNavigate();
  const { canCreate, createOnly } = useCreateReviewAccess();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(!createOnly);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<Bucket>("all");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await storeManagementApi.getPrepaymentAnalyses();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load register");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!createOnly) return;
    navigate("/store-management/prepayment-analysis/new", { replace: true });
  }, [createOnly, navigate]);

  useEffect(() => {
    if (createOnly) return;
    load();
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

  const toggleBucket = (next: Bucket) => {
    setBucket((prev) => (prev === next ? "all" : next));
  };

  const resetFilters = () => {
    setQuery("");
    setBucket("all");
  };

  const hasActiveFilters = Boolean(query || bucket !== "all");

  const statCards = [
    { key: "all" as const, label: "Total", value: counts.total, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]", onClick: () => setBucket("all") },
    { key: "matched" as const, label: "Matched", value: counts.matched, tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100", onClick: () => toggleBucket("matched") },
    { key: "variance" as const, label: "Variance", value: counts.variance, tone: "text-amber-800 bg-amber-50/80 border-amber-100", onClick: () => toggleBucket("variance") },
    { key: "award" as const, label: "Award letter", value: counts.award, tone: "text-slate-600 bg-white border-slate-200", onClick: () => toggleBucket("award") },
  ];

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "controlNumber",
        header: "Control No.",
        accessorKey: "controlNumber",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold tabular-nums text-[#145c3f] whitespace-nowrap">
            {row.original.controlNumber}
          </span>
        ),
      },
      {
        id: "entryDate",
        header: "Date",
        accessorKey: "entryDate",
        cell: ({ row }) => (
          <span className="text-slate-700 tabular-nums whitespace-nowrap">{formatDate(row.original.entryDate)}</span>
        ),
      },
      {
        id: "instrument",
        header: "Instrument",
        accessorKey: "procurementInstrument",
        cell: ({ row }) => (
          <span className="inline-flex rounded-md bg-[#e8f5ee] px-2 py-0.5 text-[11px] font-semibold text-[#0f3d2e] whitespace-nowrap">
            {row.original.procurementInstrument || "—"}
          </span>
        ),
      },
      {
        id: "contractor",
        header: "Contractor",
        accessorKey: "contractorName",
        cell: ({ row }) => <span className="font-medium text-slate-900 min-w-[140px]">{row.original.contractorName || "—"}</span>,
      },
      {
        id: "ref",
        header: "Ref",
        accessorKey: "refInvoiceDeliveryNote",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-700 whitespace-nowrap">{row.original.refInvoiceDeliveryNote || "—"}</span>
        ),
      },
      {
        id: "item",
        header: "Item",
        accessorKey: "itemDescription",
        cell: ({ row }) => <span className="text-slate-800 min-w-[160px]">{row.original.itemDescription || "—"}</span>,
      },
      {
        id: "ordered",
        header: "Ordered",
        accessorKey: "quantityOrdered",
        cell: ({ row }) => (
          <span className="font-mono font-semibold tabular-nums text-right block">{row.original.quantityOrdered ?? 0}</span>
        ),
      },
      {
        id: "supplied",
        header: "Supplied",
        accessorKey: "quantitySupplied",
        cell: ({ row }) => {
          const ordered = Number(row.original.quantityOrdered || 0);
          const supplied = Number(row.original.quantitySupplied || 0);
          const variance = ordered !== supplied;
          return (
            <span className={`font-mono font-semibold tabular-nums text-right block ${variance ? "text-amber-800" : "text-slate-900"}`}>
              {supplied}
            </span>
          );
        },
      },
      {
        id: "rate",
        header: "Rate",
        accessorKey: "rate",
        cell: ({ row }) => (
          <span className="font-mono font-semibold tabular-nums text-slate-900 text-right block">
            {naira.format(Number(row.original.rate || 0))}
          </span>
        ),
      },
      {
        id: "award",
        header: "Award",
        cell: ({ row }) =>
          row.original.awardLetterPath ? (
            <a
              href={`${API_ORIGIN}${row.original.awardLetterPath}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
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
        id: "remarks",
        header: "Remarks",
        accessorKey: "remarks",
        cell: ({ row }) => <span className="text-slate-700">{row.original.remarks || "—"}</span>,
      },
      {
        id: "view",
        header: "View",
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/store-management/prepayment-analysis/${row.original.id}`);
            }}
            className="h-8 px-2 text-[11px] font-semibold text-[#145c3f] hover:bg-[#e8f5ee]"
          >
            <Eye className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> View
          </Button>
        ),
      },
    ],
    [navigate],
  );

  if (createOnly) return null;

  return (
    <PageLayout
      title="Stock Prepayment Register"
      actions={
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5 h-8 text-xs rounded-md border-[#d4e8dc]">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
            <Button
              size="sm"
              className="bg-orange-action hover:bg-orange-600 gap-1.5 shadow-md shadow-orange-500/15 h-8 text-xs rounded-md"
              onClick={() => navigate("/store-management/prepayment-analysis/new")}
            >
              <Plus className="w-3.5 h-3.5" /> New entry
            </Button>
          )}
        </div>
      }
      contentClassName="space-y-4 pb-8"
    >
        <div className="w-full px-4 md:px-6 py-5 space-y-4">
          {error && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statCards.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={c.onClick}
                className={`rounded-sm border px-3 py-2.5 text-left transition-shadow ${c.tone} ${
                  bucket === c.key ? "ring-2 ring-[#1a7a52] ring-offset-1" : ""
                }`}
              >
                <p className="text-2xl font-bold tabular-nums">{loading ? "—" : c.value}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{c.label}</p>
              </button>
            ))}
          </div>

          <Card className="rounded-sm border border-[#d4e8dc] py-0 gap-0 shadow-2xs bg-white">
            <CardContent className="py-1.5 px-3 space-y-1.5">
              <div className="grid grid-flow-col auto-cols-fr gap-2.5 items-end">
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bucket</Label>
                  <Select value={bucket} onValueChange={(v) => setBucket(v as Bucket)}>
                    <SelectTrigger size="sm" displayValue={BUCKET_LABELS[bucket]}>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="matched">Matched</SelectItem>
                      <SelectItem value="variance">Variance</SelectItem>
                      <SelectItem value="award">Award letter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {hasActiveFilters && (
                <div className="flex justify-end pt-0.5">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 gap-1 shrink-0" onClick={resetFilters}>
                    <XCircle className="w-3.5 h-3.5" /> Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <ShadcnDataTable
            title="STOCK PREPAYMENT REGISTER"
            columns={columns}
            data={filtered}
            loading={loading}
            searchPlaceholder="Search control no, contractor, item…"
            searchValue={query}
            onSearchChange={setQuery}
            emptyMessage={
              bucket === "all"
                ? "No stock prepayment register records yet — add an entry"
                : `No ${bucket} records match this search`
            }
            onRowClick={(row) => navigate(`/store-management/prepayment-analysis/${row.id}`)}
            pageSize={50}
            showTableOptions={false}
          />
        </div>
      </PageLayout>
    );
  }
