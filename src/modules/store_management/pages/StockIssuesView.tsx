import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate, useSearchParams } from "react-router-dom";
import { stockApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, RefreshCw, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { matchesStore, storeNameFromState } from "../lib/storeOptions";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import PageLayout from "@/src/components/PageLayout";

type Option = { id: number; label: string };

interface Props {
  embedded?: boolean;
  refreshSignal?: number;
}

export default function StockIssuesView({ embedded = false, refreshSignal = 0 }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const zoneFilter = searchParams.get("zone") || "";
  const stateFilter = searchParams.get("state") || "";
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const issuesRes = await stockApi.getStockIssues();
      setRows(Array.isArray(issuesRes.data) ? issuesRes.data : []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load records");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  useEffect(() => {
    stockApi.getZones().then((r) => setZones((r.data || []).map((z: any) => ({ id: z.id, label: z.description })))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!zoneFilter) { setStates([]); return; }
    stockApi.getStates(zoneFilter).then((r) => setStates((r.data || []).map((s: any) => ({ id: s.id, label: s.description })))).catch(() => setStates([]));
  }, [zoneFilter]);

  const storeLabel = useMemo(() => {
    const state = states.find((s) => String(s.id) === String(stateFilter));
    return state ? storeNameFromState(state.label) : "";
  }, [states, stateFilter]);

  const setParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, val] of Object.entries(patch)) {
      if (val) next.set(key, val);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const locationFiltered = useMemo(() => {
    let list = rows;
    if (storeLabel) list = list.filter((r) => matchesStore(r.fromLocation, storeLabel));
    return list;
  }, [rows, storeLabel]);

  const issueFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locationFiltered;
    return locationFiltered.filter((r) =>
      [r.issueNumber, r.department, r.recipientName, r.fromLocation, r.issuedBy]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [locationFiltered, query]);

  const resetFilters = () => {
    setQuery("");
    setParams({ zone: "", state: "", q: "" });
  };

  const hasActiveFilters = Boolean(zoneFilter || stateFilter || query);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "voucher",
        header: "Voucher No",
        accessorKey: "issueNumber",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold tabular-nums text-[#145c3f]" translate="no">
            {row.original.issueNumber}
          </span>
        ),
      },
      {
        id: "store",
        header: "Store",
        accessorKey: "fromLocation",
        cell: ({ row }) => <span className="text-slate-800">{row.original.fromLocation || "—"}</span>,
      },
      {
        id: "department",
        header: "To / Department",
        accessorKey: "department",
        cell: ({ row }) => <span className="text-slate-800">{row.original.department || "—"}</span>,
      },
      {
        id: "recipient",
        header: "Recipient",
        accessorKey: "recipientName",
        cell: ({ row }) => <span className="text-slate-800">{row.original.recipientName || "—"}</span>,
      },
      {
        id: "items",
        header: "Items",
        cell: ({ row }) => {
          const lines = Array.isArray(row.original.lineItems) ? row.original.lineItems : [];
          const qty = lines.reduce((s: number, l: any) => s + Number(l.quantity || 0), 0);
          return (
            <span className="text-sm text-slate-800 tabular-nums">
              {lines.length} item{lines.length === 1 ? "" : "s"}
              {qty ? <span className="text-slate-500 font-mono ml-1">({qty})</span> : null}
            </span>
          );
        },
      },
      {
        id: "date",
        header: "Date",
        accessorKey: "issueDate",
        cell: ({ row }) => <span className="text-slate-700 tabular-nums">{row.original.issueDate || "—"}</span>,
      },
      {
        id: "issuedBy",
        header: "Issued By",
        accessorKey: "issuedBy",
        cell: ({ row }) => <span className="text-slate-700">{row.original.issuedBy || "—"}</span>,
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <span className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold bg-[#e8f5ee] text-[#0f3d2e]">
            {row.original.status || "APPROVED"}
          </span>
        ),
      },
    ],
    [],
  );

  const listBody = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border px-4 py-3 text-[#0f3d2e] bg-white border-[#d4e8dc] shadow-2xs">
          <p className="text-2xl font-bold tabular-nums">{loading ? "—" : locationFiltered.length}</p>
          <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Total issues</p>
        </div>
      </div>

      <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="grid grid-flow-col auto-cols-fr gap-3">
            <div className="space-y-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Zone</Label>
              <Select value={zoneFilter || "ALL"} onValueChange={(val) => setParams({ zone: val === "ALL" ? "" : val, state: "" })}>
                <SelectTrigger displayValue={zones.find((z) => String(z.id) === zoneFilter)?.label || "All zones"}>
                  <SelectValue placeholder="All zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All zones</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={String(z.id)}>{z.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-0">
              <Label className="text-xs text-muted-foreground">State store</Label>
              <Select
                value={stateFilter || "ALL"}
                disabled={!zoneFilter}
                onValueChange={(val) => setParams({ state: val === "ALL" ? "" : val })}
              >
                <SelectTrigger
                  displayValue={!zoneFilter ? "Select zone first" : storeLabel || "All state stores"}
                >
                  <SelectValue placeholder="All state stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All state stores</SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{storeNameFromState(s.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" className="text-slate-500 gap-1 shrink-0" onClick={resetFilters}>
                <XCircle className="w-3.5 h-3.5" /> Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ShadcnDataTable
        title="STOCK ISSUANCE REGISTER"
        columns={columns}
        data={issueFiltered}
        loading={loading}
        searchPlaceholder="Search voucher, department, recipient…"
        searchValue={query}
        onSearchChange={setQuery}
        emptyMessage="No stock issues yet — issue inventory from the catalog"
        pageSize={50}
        showTableOptions={false}
      />
    </div>
  );

  if (embedded) {
    return listBody;
  }

  return (
    <PageLayout
      title="Issuance"
      actions={
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5 h-8 text-xs rounded-md border-[#d4e8dc]">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            size="sm"
            className="bg-orange-action hover:bg-orange-600 gap-1.5 shadow-md shadow-orange-500/15 h-8 text-xs rounded-md"
            onClick={() => navigate("/store-management/transfers/new")}
          >
            <Plus className="w-3.5 h-3.5" /> New Issue
          </Button>
        </div>
      }
      contentClassName="space-y-4 pb-8"
    >
      <div className="w-full space-y-4">{listBody}</div>
    </PageLayout>
  );
}
