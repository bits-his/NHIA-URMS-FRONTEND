import * as React from "react";
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckSquare,
  Square,
  Calendar,
  FileText,
  Search,
  X,
  Clock,
  Download,
  Layers,
  Sparkles,
  Building,
  Check,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { adhocAssignmentApi, apiFileUrl } from "@/lib/api";

function FieldSection({
  title,
  children,
  gridClassName = "grid gap-4 sm:grid-cols-2",
}: {
  title: string;
  children: React.ReactNode;
  gridClassName?: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#145c3f]">
          {title}
        </h3>
        <div className="h-px flex-1 bg-[#d4e8dc]" />
      </div>
      <div className={gridClassName}>{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-slate-600">
        {label.replace(/\s*\*$/, "")}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-[11px] font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full min-h-[4.5rem] rounded-sm px-3.5 py-2 text-xs bg-[#f4f7f5] border border-[#d4e8dc] text-slate-800 shadow-2xs outline-none hover:border-[#145c3f] hover:bg-white focus-visible:border-[#145c3f] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#145c3f]/20",
        props.className
      )}
    />
  );
}

interface StateItem {
  code: string;
  description: string;
  zonal_code: string;
  zone?: { zonal_code: string; description: string };
}

interface Props {
  onBack: () => void;
  onSuccess: () => void;
  master: any;
  allStates: StateItem[];
}

export default function SdoStateDistributionPage({
  onBack,
  onSuccess,
  master,
  allStates,
}: Props) {
  const [submitting, setSubmitting] = React.useState(false);
  const [distributionDate, setDistributionDate] = React.useState(
    new Date().toISOString().slice(0, 10)
  );
  const [defaultDueDate, setDefaultDueDate] = React.useState(
    master?.assignment_due_date ? String(master.assignment_due_date).slice(0, 10) : ""
  );
  const [dispatchMessage, setDispatchMessage] = React.useState("");
  const [copyZonal, setCopyZonal] = React.useState(true);

  // Search & Filter Tabs
  const [search, setSearch] = React.useState("");
  const [activeZoneTab, setActiveZoneTab] = React.useState<string>("all");

  // Selected state codes map to custom due dates
  const [selectedStates, setSelectedStates] = React.useState<
    Record<string, { selected: boolean; dueDate: string }>
  >({});

  React.useEffect(() => {
    if (master) {
      const due = master.assignment_due_date
        ? String(master.assignment_due_date).slice(0, 10)
        : "";
      setDefaultDueDate(due);
      setDistributionDate(new Date().toISOString().slice(0, 10));
      setDispatchMessage("");

      const map: Record<string, { selected: boolean; dueDate: string }> = {};
      const existing = master.state_assignments || [];
      const existingMap = new Map(existing.map((sa: any) => [sa.state_code, sa]));

      allStates.forEach((s) => {
        const found = existingMap.get(s.code);
        map[s.code] = {
          selected: !!found,
          dueDate: found ? String(found.state_due_date).slice(0, 10) : due,
        };
      });
      setSelectedStates(map);
    }
  }, [master, allStates]);

  // Group all states by zone
  const zonesMap = React.useMemo(() => {
    const groups: Record<string, { name: string; states: StateItem[] }> = {};
    allStates.forEach((s) => {
      const zCode = s.zonal_code || "OTHER";
      const zName = s.zone?.description || zCode;
      if (!groups[zCode]) {
        groups[zCode] = { name: zName, states: [] };
      }
      groups[zCode].states.push(s);
    });
    return groups;
  }, [allStates]);

  const toggleState = (code: string) => {
    setSelectedStates((prev) => {
      const current = prev[code] || { selected: false, dueDate: defaultDueDate };
      return {
        ...prev,
        [code]: { ...current, selected: !current.selected },
      };
    });
  };

  const toggleZone = (zCode: string) => {
    const zoneStates = zonesMap[zCode]?.states || [];
    const allSelected = zoneStates.every((s) => selectedStates[s.code]?.selected);
    setSelectedStates((prev) => {
      const next = { ...prev };
      zoneStates.forEach((s) => {
        next[s.code] = {
          selected: !allSelected,
          dueDate: next[s.code]?.dueDate || defaultDueDate,
        };
      });
      return next;
    });
  };

  const handleStateDueDateChange = (code: string, date: string) => {
    setSelectedStates((prev) => ({
      ...prev,
      [code]: { ...prev[code], dueDate: date },
    }));
  };

  // Bulk actions
  const selectAll = () => {
    setSelectedStates((prev) => {
      const next = { ...prev };
      allStates.forEach((s) => {
        next[s.code] = {
          selected: true,
          dueDate: next[s.code]?.dueDate || defaultDueDate,
        };
      });
      return next;
    });
    toast.success(`Selected all ${allStates.length} State Offices`);
  };

  const deselectAll = () => {
    setSelectedStates((prev) => {
      const next = { ...prev };
      allStates.forEach((s) => {
        next[s.code] = {
          selected: false,
          dueDate: next[s.code]?.dueDate || defaultDueDate,
        };
      });
      return next;
    });
    toast.info("Cleared all state selections");
  };

  const applyDefaultToAllSelected = () => {
    if (!defaultDueDate) {
      toast.error("Please specify a Default Assignment Due Date first");
      return;
    }
    let count = 0;
    setSelectedStates((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((code) => {
        if (next[code]?.selected) {
          next[code] = { ...next[code], dueDate: defaultDueDate };
          count++;
        }
      });
      return next;
    });
    toast.success(`Applied ${defaultDueDate} to ${count} selected state(s)`);
  };

  const applyZoneDueDate = (zCode: string, date: string) => {
    if (!date) return;
    const zoneStates = zonesMap[zCode]?.states || [];
    let updated = 0;
    setSelectedStates((prev) => {
      const next = { ...prev };
      zoneStates.forEach((s) => {
        if (next[s.code]?.selected) {
          next[s.code] = { ...next[s.code], dueDate: date };
          updated++;
        }
      });
      return next;
    });
    toast.success(
      `Applied ${date} to ${updated} selected state(s) in ${zonesMap[zCode]?.name || zCode}`
    );
  };

  const selectedCount = Object.values(selectedStates).filter((v) => v.selected).length;
  const selectedZonesCount = Object.values(zonesMap).filter((z) =>
    z.states.some((s) => selectedStates[s.code]?.selected)
  ).length;

  const handleDispatch = async () => {
    if (selectedCount === 0) {
      toast.error("Please select at least one recipient State Office");
      return;
    }

    setSubmitting(true);
    try {
      const statesPayload = Object.entries(selectedStates)
        .filter(([_, v]) => v.selected)
        .map(([code, v]) => ({
          state_code: code,
          state_due_date: v.dueDate || defaultDueDate,
        }));

      const payload = {
        distribution_date: distributionDate,
        default_due_date: defaultDueDate,
        copy_zonal_coordinator: copyZonal,
        dispatch_message: dispatchMessage.trim() || undefined,
        states: statesPayload,
      };

      await adhocAssignmentApi.dispatchToStates(master.master_assignment_id, payload);
      toast.success(`Dispatched assignment to ${selectedCount} State Office(s) successfully`);
      onSuccess();
    } catch (err: any) {
      toast.error("Dispatch failed", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered states based on search & tab
  const searchNormalized = search.toLowerCase().trim();
  const visibleStates = React.useMemo(() => {
    return allStates.filter((s) => {
      if (activeZoneTab !== "all" && s.zonal_code !== activeZoneTab) {
        return false;
      }
      if (!searchNormalized) return true;
      const zoneName = s.zone?.description || "";
      return (
        s.description?.toLowerCase().includes(searchNormalized) ||
        s.code?.toLowerCase().includes(searchNormalized) ||
        zoneName.toLowerCase().includes(searchNormalized) ||
        s.zonal_code?.toLowerCase().includes(searchNormalized)
      );
    });
  }, [allStates, activeZoneTab, searchNormalized]);

  const allVisibleSelected =
    visibleStates.length > 0 &&
    visibleStates.every((s) => selectedStates[s.code]?.selected);

  const toggleSelectVisible = () => {
    const shouldSelect = !allVisibleSelected;
    setSelectedStates((prev) => {
      const next = { ...prev };
      visibleStates.forEach((s) => {
        next[s.code] = {
          selected: shouldSelect,
          dueDate: next[s.code]?.dueDate || defaultDueDate,
        };
      });
      return next;
    });
  };

  if (!master) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      {/* ── Sticky Top Header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 shrink-0"
            aria-label="Back to assignments"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
                Multi-State Assignment Distribution
              </h1>
              <Badge className="bg-[#145c3f] text-white font-mono text-xs shadow-none">
                {master.master_assignment_id}
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-300 text-[#145c3f] bg-emerald-50 text-xs font-bold"
              >
                {selectedCount} of {allStates.length} State(s) Selected
              </Badge>
              {selectedZonesCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-slate-300 text-slate-600 bg-white text-xs hidden sm:inline-flex"
                >
                  {selectedZonesCount} Zone(s) Covered
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Top Quick Action */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleDispatch}
            disabled={submitting || selectedCount === 0}
            size="sm"
            className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs font-bold gap-1.5 shadow-xs px-4 hidden sm:inline-flex"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Dispatching…
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" /> Dispatch ({selectedCount})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Main Content Body: EXACTLY 2 CARDS ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 w-full">
        <div className="w-full space-y-5">
          {/* ══════════════════════════════════════════════════════════════════════
              CARD 1: Master Assignment Directive Summary
          ══════════════════════════════════════════════════════════════════════ */}
          <Card className="rounded-sm border border-[#d4e8dc] bg-[#f8faf9] shadow-2xs overflow-hidden">
            <CardContent className="p-4 md:p-5">
              <div className="mb-3.5 flex items-center justify-between border-b border-[#e2efe7] pb-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#145c3f]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f3d2e]">
                    Master Assignment Directive Summary
                  </h3>
                  <Badge className="bg-[#145c3f] text-white font-mono text-[11px]">
                    {master.master_assignment_id}
                  </Badge>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-bold capitalize",
                    master.priority === "urgent"
                      ? "border-rose-300 text-rose-700 bg-rose-50"
                      : master.priority === "high"
                        ? "border-amber-300 text-amber-700 bg-amber-50"
                        : "border-slate-300 text-slate-700 bg-white"
                  )}
                >
                  Priority: {master.priority || "Normal"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Assignment Title
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                    {master.assignment_title}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Originating Department
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5 truncate">
                    {master.originating_department_code === "OTHER"
                      ? master.originating_department_other
                      : master.originating_department_code || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Master Assignment Due Date
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {master.assignment_due_date
                      ? String(master.assignment_due_date).slice(0, 10)
                      : "—"}
                  </p>
                </div>

                {master.assignment_description && (
                  <div className="sm:col-span-2 md:col-span-4 pt-2.5 border-t border-[#e2efe7]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Scope & Operational Instructions
                    </span>
                    <p className="text-slate-700 mt-0.5 leading-relaxed text-xs">
                      {master.assignment_description}
                    </p>
                  </div>
                )}

                {master.original_instruction_url && (
                  <div className="sm:col-span-2 md:col-span-4 pt-2.5 border-t border-[#e2efe7] flex items-center justify-between">
                    <span className="text-slate-600 font-medium text-xs flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#145c3f]" />
                      Original Memo: {master.original_instruction_name || "Instruction Memo"}
                    </span>
                    <a
                      href={apiFileUrl(master.original_instruction_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#145c3f] hover:text-[#0f3d2e] underline"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Memo PDF
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ══════════════════════════════════════════════════════════════════════
              CARD 2: Assignment Distribution & Recipient Configuration Form
          ══════════════════════════════════════════════════════════════════════ */}
          <Card className="rounded-sm border-[#d4e8dc] shadow-2xs bg-white overflow-hidden w-full">
            <CardContent className="p-5 md:p-6 space-y-7">
              {/* Part A: Distribution Parameters & Broadcast Directive */}
              <FieldSection
                title="Distribution Parameters & Directive"
                gridClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <Field label="Distribution Date" required>
                  <Input
                    type="date"
                    value={distributionDate}
                    onChange={(e) => setDistributionDate(e.target.value)}
                    className="h-9.5 text-xs bg-white"
                  />
                </Field>

                <Field label="Default Assignment Due Date" required>
                  <Input
                    type="date"
                    value={defaultDueDate}
                    onChange={(e) => setDefaultDueDate(e.target.value)}
                    className="h-9.5 text-xs bg-white"
                  />
                </Field>

                <div className="flex flex-col justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyDefaultToAllSelected}
                    className="h-9.5 text-xs border-emerald-300 text-[#145c3f] hover:bg-emerald-50 gap-1.5 font-semibold"
                    title="Apply this default due date to all currently selected states"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Apply Default Date to All Selected
                  </Button>
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <Field label="Dispatch Instructions / Broadcast Message (Optional)">
                    <Textarea
                      rows={3}
                      placeholder="Enter specific instructions or operational guidance that will be broadcast to all selected State Offices..."
                      value={dispatchMessage}
                      onChange={(e) => setDispatchMessage(e.target.value)}
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-sm bg-[#f4f7f5] border border-[#d4e8dc]">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-slate-800">
                      Copy Zonal Coordinator(s)
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      Send simultaneous task notifications to the Zonal Coordinator(s) overseeing the selected State Offices.
                    </p>
                  </div>
                  <Switch checked={copyZonal} onCheckedChange={setCopyZonal} />
                </div>
              </FieldSection>

              {/* Part B: State Recipient Form (Form Data Table with high UX) */}
              <section className="space-y-4 pt-2">
                <div className="flex items-center gap-3">
                  <h3 className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#145c3f] flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" />
                    State Recipient Selection & Due Dates
                  </h3>
                  <div className="h-px flex-1 bg-[#d4e8dc]" />
                  <Badge
                    variant="outline"
                    className="border-emerald-300 text-[#145c3f] bg-emerald-50 text-xs font-bold shrink-0"
                  >
                    {selectedCount} of {allStates.length} States Selected
                  </Badge>
                </div>

                {/* Form Filter & Bulk Actions Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-sm bg-[#f8faf9] border border-[#d4e8dc]">
                  {/* Search and Zone Filter */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        type="text"
                        placeholder="Search state name or code (e.g. Kano, KN, Lagos)..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-8 h-9 text-xs bg-white border-[#d4e8dc]"
                      />
                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          aria-label="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="w-full sm:w-56 shrink-0">
                      <Select
                        value={activeZoneTab}
                        onValueChange={(val) => setActiveZoneTab(val)}
                      >
                        <SelectTrigger className="h-9 text-xs bg-white border-[#d4e8dc]">
                          <SelectValue placeholder="Filter by Zone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            All Zones ({selectedCount} / {allStates.length} selected)
                          </SelectItem>
                          {Object.entries(zonesMap).map(([zCode, { name, states }]) => {
                            const sel = states.filter(
                              (s) => selectedStates[s.code]?.selected
                            ).length;
                            return (
                              <SelectItem key={zCode} value={zCode}>
                                {name} ({sel} / {states.length})
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Bulk Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeZoneTab !== "all" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleZone(activeZoneTab)}
                        className="h-8.5 text-xs border-emerald-300 text-[#145c3f] hover:bg-emerald-50 font-semibold"
                      >
                        Toggle Zone ({zonesMap[activeZoneTab]?.name || activeZoneTab})
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAll}
                      className="h-8.5 text-xs border-emerald-300 text-[#145c3f] hover:bg-emerald-50 gap-1.5 font-bold"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-[#145c3f]" /> Select All ({allStates.length})
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={deselectAll}
                      className="h-8.5 text-xs border-slate-300 text-slate-600 hover:bg-slate-50 gap-1.5"
                    >
                      <Square className="w-3.5 h-3.5 text-slate-400" /> Deselect All
                    </Button>
                  </div>
                </div>

                {/* Form Data Table (Clean, scannable form selection) */}
                <div className="rounded-sm border border-[#d4e8dc] overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto max-h-[520px]">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-[#f4f7f5] text-slate-700 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-[#d4e8dc]">
                        <tr>
                          <th className="py-2.5 px-3.5 w-12 text-center">
                            <button
                              type="button"
                              onClick={toggleSelectVisible}
                              className="inline-flex items-center justify-center p-0.5 rounded text-[#145c3f] hover:bg-emerald-100"
                              title={allVisibleSelected ? "Deselect Visible" : "Select Visible"}
                            >
                              {allVisibleSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#145c3f]" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </th>
                          <th className="py-2.5 px-3">State Office</th>
                          <th className="py-2.5 px-3">Geopolitical Zone</th>
                          <th className="py-2.5 px-3">State Assignment Code</th>
                          <th className="py-2.5 px-3 w-52">Assignment Due Date</th>
                          <th className="py-2.5 px-3 text-right pr-4 w-28">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e8f3ec]">
                        {visibleStates.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-10 text-slate-500">
                              <p className="font-medium text-xs">
                                No State Offices match your search or filter: &ldquo;{search}&rdquo;
                              </p>
                              <Button
                                type="button"
                                variant="link"
                                size="sm"
                                onClick={() => {
                                  setSearch("");
                                  setActiveZoneTab("all");
                                }}
                                className="text-xs text-[#145c3f] mt-1"
                              >
                                Reset filters
                              </Button>
                            </td>
                          </tr>
                        ) : (
                          visibleStates.map((s, idx) => {
                            const isChecked = !!selectedStates[s.code]?.selected;
                            const childId = `${master.master_assignment_id}-${s.code}`;
                            const stateDueDate =
                              selectedStates[s.code]?.dueDate || defaultDueDate;
                            const isCustomDate =
                              stateDueDate && stateDueDate !== defaultDueDate;
                            const zoneName = s.zone?.description || s.zonal_code;

                            return (
                              <tr
                                key={s.code}
                                onClick={() => toggleState(s.code)}
                                className={cn(
                                  "cursor-pointer transition-colors",
                                  isChecked
                                    ? "bg-emerald-50/50 hover:bg-emerald-50/80 text-emerald-950 font-medium"
                                    : idx % 2 === 0
                                      ? "bg-white hover:bg-slate-50 text-slate-700"
                                      : "bg-[#fafcfa] hover:bg-slate-50 text-slate-700"
                                )}
                              >
                                {/* Checkbox */}
                                <td
                                  className="py-2 px-3.5 text-center"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleState(s.code);
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleState(s.code)}
                                    className="h-4 w-4 rounded border-slate-300 text-[#145c3f] focus:ring-[#145c3f] cursor-pointer accent-[#145c3f]"
                                  />
                                </td>

                                {/* State Name & Code */}
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        "font-semibold text-xs",
                                        isChecked ? "text-[#0f3d2e]" : "text-slate-800"
                                      )}
                                    >
                                      {s.description}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className={cn(
                                        "text-[10px] font-mono px-1.5 py-0 h-4.5",
                                        isChecked
                                          ? "bg-emerald-100 text-[#145c3f] border border-emerald-300 font-bold"
                                          : "bg-slate-100 text-slate-600"
                                      )}
                                    >
                                      {s.code}
                                    </Badge>
                                  </div>
                                </td>

                                {/* Geopolitical Zone */}
                                <td className="py-2 px-3 text-slate-600">
                                  <span className="text-xs">{zoneName}</span>
                                </td>

                                {/* State Assignment Code */}
                                <td className="py-2 px-3">
                                  <span
                                    className={cn(
                                      "font-mono text-xs tracking-tight",
                                      isChecked
                                        ? "text-[#145c3f] font-semibold"
                                        : "text-slate-400"
                                    )}
                                  >
                                    {childId}
                                  </span>
                                </td>

                                {/* Assignment Due Date Form Field */}
                                <td
                                  className="py-2 px-3"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {isChecked ? (
                                    <div className="flex items-center gap-1.5">
                                      <Input
                                        type="date"
                                        value={stateDueDate}
                                        onChange={(e) =>
                                          handleStateDueDateChange(s.code, e.target.value)
                                        }
                                        className="h-8 text-xs px-2 bg-white border-[#1a7a52] rounded-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#145c3f] w-36 font-semibold"
                                        title="Due Date for this State Office"
                                      />
                                      {isCustomDate && (
                                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] px-1 py-0 h-4 font-semibold shrink-0">
                                          Custom
                                        </Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 italic">
                                      Default: {defaultDueDate || "—"}
                                    </span>
                                  )}
                                </td>

                                {/* Selection Status */}
                                <td className="py-2 px-3 text-right pr-4">
                                  {isChecked ? (
                                    <Badge className="bg-[#145c3f] hover:bg-[#145c3f] text-white text-[10px] font-bold py-0.5 px-2">
                                      Selected
                                    </Badge>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 font-medium">
                                      Excluded
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer with quick summary */}
                  <div className="p-2.5 bg-[#f8faf9] border-t border-[#d4e8dc] flex items-center justify-between text-xs text-slate-600 px-4">
                    <span>
                      Showing {visibleStates.length} of {allStates.length} State Offices
                    </span>
                    <span className="font-semibold text-[#0f3d2e]">
                      {selectedCount} selected for dispatch
                    </span>
                  </div>
                </div>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Sticky Action Footer ──────────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-30 bg-white border-t border-[#d4e8dc] px-4 md:px-6 py-3.5 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Distribution Summary:</span>
          <span className="font-bold text-[#0f3d2e] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-sm">
            {selectedCount} of {allStates.length} State(s) Selected
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-600 font-medium">
            {selectedZonesCount} Geopolitical Zone(s) covered
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={submitting}
            className="h-9 px-4 text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDispatch}
            disabled={submitting || selectedCount === 0}
            className="h-9 px-5 bg-[#145c3f] hover:bg-[#0f3d2e] text-white font-bold text-xs gap-2 shadow-xs"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Dispatching…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Dispatch to {selectedCount} State
                {selectedCount === 1 ? "" : "s"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
