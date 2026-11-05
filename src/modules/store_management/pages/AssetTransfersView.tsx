import React, { useCallback, useEffect, useMemo, useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useNavigate } from "react-router-dom";
import { stockApi } from "@/lib/api";
import {
  ArrowRight,
  ArrowRightLeft,
  Plus,
  CheckCircle2,
  ShieldCheck,
  Send,
  Loader2,
  FileStack,
  Search,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STAGES = [
  { key: "SUBMITTED", label: "Submitted", hint: "Awaiting approval" },
  { key: "APPROVED", label: "Approved", hint: "Ready to dispatch" },
  { key: "TRANSFERRED", label: "In transit", hint: "Awaiting receipt" },
  { key: "COMPLETED", label: "Completed", hint: "Received & closed" },
] as const;

type StageKey = (typeof STAGES)[number]["key"] | "ALL";

function statusTone(status: string) {
  switch (status) {
    case "COMPLETED":
      return {
        chip: "bg-emerald-50 text-emerald-800 ring-emerald-200",
        dot: "bg-emerald-500",
        bar: "bg-emerald-500",
      };
    case "TRANSFERRED":
      return {
        chip: "bg-[#e8f5ee] text-[#0f3d2e] ring-[#145c3f]/25",
        dot: "bg-[#25a872]",
        bar: "bg-[#25a872]",
      };
    case "APPROVED":
      return {
        chip: "bg-[#145c3f]/10 text-[#145c3f] ring-[#145c3f]/20",
        dot: "bg-[#145c3f]",
        bar: "bg-[#145c3f]",
      };
    default:
      return {
        chip: "bg-amber-50 text-amber-900 ring-amber-200",
        dot: "bg-amber-500",
        bar: "bg-amber-400",
      };
  }
}

function stageIndex(status: string) {
  const i = STAGES.findIndex((s) => s.key === status);
  return i < 0 ? 0 : i;
}

export function AssetTransfersView() {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StageKey>("ALL");
  const [query, setQuery] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stockApi.getTransfers();
      setTransfers(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load transfers");
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { ALL: transfers.length };
    for (const s of STAGES) base[s.key] = 0;
    for (const t of transfers) {
      if (base[t.status] !== undefined) base[t.status] += 1;
    }
    return base;
  }, [transfers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transfers.filter((t) => {
      if (filter !== "ALL" && t.status !== filter) return false;
      if (!q) return true;
      const hay = [
        t.transferNumber,
        t.assetName,
        t.assetNumber,
        t.fromOffice,
        t.toOffice,
        t.fromCustodian,
        t.toCustodian,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [transfers, filter, query]);

  const updateTransferStatus = async (id: number, status: string) => {
    try {
      setActingId(id);
      await stockApi.updateTransfer(id, { status });
      toast.success(
        status === "APPROVED"
          ? "Transfer approved"
          : status === "TRANSFERRED"
            ? "Asset dispatched"
            : "Receipt confirmed — transfer completed"
      );
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update transfer");
    } finally {
      setActingId(null);
    }
  };

  return (
    <PageLayout
      title="Transfers & Movements"
      description="Move fixed assets between offices and custodians — approve, dispatch, confirm"
      actions={
        <Button
          onClick={() => navigate("/store-management/transfers/new")}
          className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white font-semibold text-xs h-9"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Transfer
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Workflow strip */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Workflow</p>
              <p className="text-sm font-semibold text-slate-900">Four-step custody handoff</p>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {counts.ALL} transfer{counts.ALL === 1 ? "" : "s"} on record
            </p>
          </div>
          <ol className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100">
            {STAGES.map((stage, i) => (
              <li key={stage.key}>
                <button
                  type="button"
                  onClick={() => setFilter(filter === stage.key ? "ALL" : stage.key)}
                  className={`w-full text-left px-4 py-3.5 transition-colors duration-200 ease-out ${
                    filter === stage.key ? "bg-[#e8f5ee]" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                        filter === stage.key
                          ? "bg-[#145c3f] text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{stage.label}</span>
                    <span className="ml-auto text-xs font-mono font-semibold text-slate-500">
                      {counts[stage.key] || 0}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 pl-8">{stage.hint}</p>
                </button>
              </li>
            ))}
          </ol>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ref, asset, office, custodian…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25a872]/35 focus:border-[#25a872]"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={filter === "ALL"} onClick={() => setFilter("ALL")} label="All" count={counts.ALL} />
            {STAGES.map((s) => (
              <FilterChip
                key={s.key}
                active={filter === s.key}
                onClick={() => setFilter(s.key)}
                label={s.label}
                count={counts[s.key] || 0}
              />
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading && (
            <div className="space-y-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl border border-slate-200 bg-slate-50 animate-pulse"
                />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-[#f7faf8] px-6 py-14 text-center">
              <FileStack className="h-8 w-8 text-[#145c3f]/40 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-900 mb-1">
                {transfers.length === 0 ? "No transfers yet" : "No matches for this filter"}
              </p>
              <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                {transfers.length === 0
                  ? "Start an inter-office asset transfer to open the custody workflow."
                  : "Try another status or clear the search."}
              </p>
              {transfers.length === 0 && (
                <Button
                  size="sm"
                  className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs"
                  onClick={() => navigate("/store-management/transfers/new")}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> New Transfer
                </Button>
              )}
            </div>
          )}

          {!loading &&
            filtered.map((trf) => {
              const tone = statusTone(trf.status);
              const idx = stageIndex(trf.status);
              const busy = actingId === trf.id;
              return (
                <article
                  key={trf.id}
                  className="group rounded-xl border border-slate-200 bg-white hover:border-[#145c3f]/30 transition-[border-color,box-shadow] duration-200 ease-out hover:shadow-[0_8px_24px_-12px_rgba(20,92,63,0.25)]"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-black text-[#145c3f]">
                            {trf.transferNumber}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${tone.chip}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                            {trf.status === "TRANSFERRED" ? "IN TRANSIT" : trf.status}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {trf.assetName || "Untitled asset"}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {trf.assetNumber || `AST-${trf.assetId}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {trf.status === "SUBMITTED" && (
                          <Button
                            size="sm"
                            disabled={busy}
                            className="h-8 text-[11px] font-bold bg-[#145c3f] hover:bg-[#0f3d2e] text-white"
                            onClick={() => updateTransferStatus(trf.id, "APPROVED")}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                            )}
                            Approve
                          </Button>
                        )}
                        {trf.status === "APPROVED" && (
                          <Button
                            size="sm"
                            disabled={busy}
                            className="h-8 text-[11px] font-bold bg-[#145c3f] hover:bg-[#0f3d2e] text-white"
                            onClick={() => updateTransferStatus(trf.id, "TRANSFERRED")}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5 mr-1" />
                            )}
                            Dispatch
                          </Button>
                        )}
                        {trf.status === "TRANSFERRED" && (
                          <Button
                            size="sm"
                            disabled={busy}
                            className="h-8 text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
                            onClick={() => updateTransferStatus(trf.id, "COMPLETED")}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            )}
                            Confirm receipt
                          </Button>
                        )}
                        {trf.status === "COMPLETED" && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Closed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* From → To */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 sm:gap-4 items-stretch mb-4">
                      <OfficeBlock
                        label="From"
                        office={trf.fromOffice}
                        custodian={trf.fromCustodian}
                        muted
                      />
                      <div className="hidden sm:flex items-center justify-center text-[#145c3f]/50">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                      <OfficeBlock
                        label="To"
                        office={trf.toOffice}
                        custodian={trf.toCustodian}
                      />
                    </div>

                    {/* Mini progress */}
                    <div className="flex items-center gap-1.5" aria-label={`Stage ${idx + 1} of 4`}>
                      {STAGES.map((s, i) => (
                        <div
                          key={s.key}
                          className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                            i <= idx ? tone.bar : "bg-slate-100"
                          }`}
                          title={s.label}
                        />
                      ))}
                      <span className="ml-2 text-[10px] font-semibold text-slate-500 inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        Step {idx + 1}/4
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
      </div>
    </PageLayout>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 px-2.5 rounded-lg text-[11px] font-bold transition-colors duration-150 ease-out ${
        active
          ? "bg-[#145c3f] text-white"
          : "bg-white text-slate-600 border border-slate-200 hover:border-[#145c3f]/40 hover:text-[#145c3f]"
      }`}
    >
      {label}
      <span className={`ml-1.5 font-mono ${active ? "text-white/80" : "text-slate-400"}`}>{count}</span>
    </button>
  );
}

function OfficeBlock({
  label,
  office,
  custodian,
  muted,
}: {
  label: string;
  office?: string;
  custodian?: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-3 py-2.5 border ${
        muted ? "bg-slate-50 border-slate-200" : "bg-[#e8f5ee]/60 border-[#145c3f]/15"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-900 truncate">{office || "—"}</p>
      <p className="text-[11px] text-slate-500 truncate">{custodian || "No custodian"}</p>
    </div>
  );
}

export default AssetTransfersView;
