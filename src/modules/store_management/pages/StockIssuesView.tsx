import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { stockApi } from "@/lib/api";
import CustomTable, { CustomTableField } from "@/components/CustomTable";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Send, Plus, Search } from "lucide-react";
import PageLayout from "../components/PageLayout";
import { toast } from "sonner";
import { matchesStore, storeNameFromState } from "../lib/storeOptions";

type Option = { id: number; label: string };

export default function StockIssuesView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const zoneFilter = searchParams.get("zone") || "";
  const stateFilter = searchParams.get("state") || "";
  const q = searchParams.get("q") || "";
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

  useEffect(() => { load(); }, [load]);

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

  const issueFiltered = useMemo(() => {
    let list = rows;
    if (storeLabel) list = list.filter((r) => matchesStore(r.fromLocation, storeLabel));
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((r) =>
        [r.issueNumber, r.department, r.recipientName, r.fromLocation, r.issuedBy]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }
    return list;
  }, [rows, storeLabel, q]);

  const issueFields: CustomTableField[] = [
    {
      title: "Voucher No",
      value: "issueNumber",
      custom: true,
      component: (item) => (
        <span className="font-mono text-sm font-semibold tabular-nums text-[#145c3f]" translate="no">
          {item.issueNumber}
        </span>
      ),
    },
    { title: "Store", value: "fromLocation", className: "text-slate-800" },
    { title: "To / Department", value: "department", className: "text-slate-800" },
    { title: "Recipient", value: "recipientName", className: "text-slate-800" },
    {
      title: "Items",
      value: "lineItems",
      custom: true,
      component: (item) => {
        const lines = Array.isArray(item.lineItems) ? item.lineItems : [];
        const qty = lines.reduce((s: number, l: any) => s + Number(l.quantity || 0), 0);
        return (
          <span className="text-sm text-slate-800 tabular-nums">
            {lines.length} item{lines.length === 1 ? "" : "s"}
            {qty ? <span className="text-slate-500 font-mono ml-1">({qty})</span> : null}
          </span>
        );
      },
    },
    { title: "Date", value: "issueDate", className: "text-slate-700 tabular-nums" },
    { title: "Issued By", value: "issuedBy", className: "text-slate-700" },
    {
      title: "Status",
      value: "status",
      custom: true,
      component: (item) => (
        <span className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold bg-[#e8f5ee] text-[#0f3d2e]">
          {item.status || "APPROVED"}
        </span>
      ),
    },
  ];

  return (
    <PageLayout
      title={
        <span className="flex items-center gap-2">
          <Send className="w-5 h-5 text-[#25a872]" aria-hidden="true" /> Issuance
        </span>
      }
      description="Issue store stock to departments"
      actions={
        <Button
          size="sm"
          className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs h-9 font-semibold"
          onClick={() => navigate("/store-management/transfers/new")}
        >
          <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" /> New Issue
        </Button>
      }
    >
      <div className="rounded-lg border border-[#d4e8dc] bg-white p-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 items-center">
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5a7a6a] pointer-events-none" aria-hidden="true" />
            <input
              id="issue-search"
              type="search"
              value={q}
              onChange={(e) => setParams({ q: e.target.value })}
              placeholder="Search voucher, department, recipient…"
              aria-label="Search issuances"
              className="h-9 w-full rounded-lg border-2 border-[#1a7a52] bg-[#f4f7f5] pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none hover:bg-white focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25"
            />
          </div>
          <Select value={zoneFilter || "ALL"} onValueChange={(val) => setParams({ zone: val === "ALL" ? "" : val, state: "" })}>
            <SelectTrigger id="issue-zone" size="sm" displayValue={zones.find((z) => String(z.id) === zoneFilter)?.label || "All zones"}>
              <SelectValue placeholder="All zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All zones</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z.id} value={String(z.id)}>{z.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={stateFilter || "ALL"}
            disabled={!zoneFilter}
            onValueChange={(val) => setParams({ state: val === "ALL" ? "" : val })}
          >
            <SelectTrigger
              id="issue-state"
              size="sm"
              displayValue={
                !zoneFilter
                  ? "Select zone first"
                  : storeLabel || "All state stores"
              }
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

      <div className="min-w-0 w-full flex-1">
        <CustomTable
          data={issueFiltered}
          fields={issueFields}
          filter={false}
          loading={loading}
          pageSize={15}
          message="No stock issues yet — issue inventory from the catalog"
        />
      </div>
    </PageLayout>
  );
}
