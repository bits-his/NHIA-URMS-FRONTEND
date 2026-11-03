import * as React from "react";
import { Send, CheckCircle2, Loader2, CheckSquare, Square, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { adhocAssignmentApi } from "@/lib/api";

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
        "w-full min-h-[4.5rem] rounded-xl px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25",
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
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  master: any;
  allStates: StateItem[];
}

export default function SdoStateDistributionModal({
  open,
  onClose,
  onSuccess,
  master,
  allStates,
}: Props) {
  const [submitting, setSubmitting] = React.useState(false);
  const [distributionDate, setDistributionDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [defaultDueDate, setDefaultDueDate] = React.useState(
    master?.assignment_due_date ? String(master.assignment_due_date).slice(0, 10) : ""
  );
  const [dispatchMessage, setDispatchMessage] = React.useState("");
  const [copyZonal, setCopyZonal] = React.useState(true);

  // Selected state codes map to their specific due dates
  const [selectedStates, setSelectedStates] = React.useState<Record<string, { selected: boolean; dueDate: string }>>({});

  React.useEffect(() => {
    if (master && open) {
      const due = master.assignment_due_date ? String(master.assignment_due_date).slice(0, 10) : "";
      setDefaultDueDate(due);
      setDistributionDate(new Date().toISOString().slice(0, 10));
      setDispatchMessage("");

      // Pre-select states that are already dispatched
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
  }, [master, open, allStates]);

  // Group states by zone
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

  const selectedCount = Object.values(selectedStates).filter((v) => v.selected).length;

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
      toast.success(`Dispatched assignment to ${selectedCount} State Office(s)`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Dispatch failed", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!master) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-7xl max-h-[94vh] overflow-y-auto p-0 rounded-2xl border-[#d4e8dc]">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-emerald-50/70 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-bold text-[#0f3d2e]">
                State Assignment Distribution
              </DialogTitle>
              <Badge className="bg-[#145c3f] text-white font-mono text-xs">
                {master.master_assignment_id}
              </Badge>
            </div>
            <span className="text-xs text-slate-500">
              Select recipient State Offices to fan out the directive
            </span>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Section 1: Distribution Settings */}
          <FieldSection title="Distribution Parameters" gridClassName="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3 p-3.5 rounded-2xl bg-[#f4f7f5] border border-[#d4e8dc]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Master Assignment Title</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">{master.assignment_title}</p>
            </div>

            <Field label="Distribution Date" required>
              <Input
                type="date"
                value={distributionDate}
                onChange={(e) => setDistributionDate(e.target.value)}
                className="h-10 text-xs bg-white"
              />
            </Field>

            <Field label="Default Assignment Due Date" required>
              <Input
                type="date"
                value={defaultDueDate}
                onChange={(e) => setDefaultDueDate(e.target.value)}
                className="h-10 text-xs bg-white"
              />
            </Field>

            <div className="flex flex-col justify-end">
              <Badge variant="outline" className="border-emerald-300 text-[#145c3f] bg-emerald-50 text-xs h-10 flex items-center justify-center font-bold">
                {selectedCount} State(s) Selected
              </Badge>
            </div>
          </FieldSection>

          {/* Section 2: State Recipient Register */}
          <FieldSection title="State Recipient Register" gridClassName="grid gap-4 sm:grid-cols-1">
            <div className="space-y-4">
              {Object.entries(zonesMap).map(([zCode, { name, states }]) => {
                const zoneAllSelected = states.every((s) => selectedStates[s.code]?.selected);
                return (
                  <div key={zCode} className="border border-[#d4e8dc] rounded-2xl p-4 bg-white shadow-xs">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#d4e8dc]/60">
                      <span className="text-xs font-bold text-[#145c3f] flex items-center gap-1.5">
                        {name} ({zCode})
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-[#e8f6ee] text-[#145c3f]">
                          {states.filter((s) => selectedStates[s.code]?.selected).length} / {states.length}
                        </Badge>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleZone(zCode)}
                        className="h-6 text-xs text-slate-600 hover:text-[#145c3f] hover:bg-emerald-50"
                      >
                        {zoneAllSelected ? "Deselect Zone" : "Select all in Zone"}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
                      {states.map((s) => {
                        const isChecked = !!selectedStates[s.code]?.selected;
                        const childId = `${master.master_assignment_id}-${s.code}`;
                        return (
                          <div
                            key={s.code}
                            onClick={() => toggleState(s.code)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                              isChecked
                                ? "bg-emerald-50/80 border-[#1a7a52] text-emerald-950 font-medium shadow-xs"
                                : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-[#145c3f] shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="truncate font-bold">{s.description}</p>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  {childId}
                                </span>
                              </div>
                            </div>
                            {isChecked && (
                              <input
                                type="date"
                                value={selectedStates[s.code]?.dueDate || defaultDueDate}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleStateDueDateChange(s.code, e.target.value)}
                                className="h-6 text-[11px] px-1 bg-white border border-emerald-300 rounded text-slate-700 w-28 shrink-0 ml-1"
                                title="Custom State Due Date"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </FieldSection>

          {/* Section 3: Dispatch & Notification */}
          <FieldSection title="Dispatch Instructions & Routing" gridClassName="grid gap-4 sm:grid-cols-1">
            <Field label="Dispatch Instructions / Broadcast Message">
              <Textarea
                rows={2}
                placeholder="Enter specific instructions or guidance for all selected States..."
                value={dispatchMessage}
                onChange={(e) => setDispatchMessage(e.target.value)}
              />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#f4f7f5] border border-[#d4e8dc]">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-slate-800">Copy Zonal Coordinator</Label>
                <p className="text-[11px] text-slate-500">
                  Send simultaneous task notification to the relevant Zonal Coordinator(s).
                </p>
              </div>
              <Switch checked={copyZonal} onCheckedChange={setCopyZonal} />
            </div>
          </FieldSection>
        </div>

        <DialogFooter className="p-4 px-6 border-t bg-slate-50/70 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Selected: <strong className="text-slate-700">{selectedCount} State Office(s)</strong>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleDispatch}
              disabled={submitting || selectedCount === 0}
              className="bg-[#145c3f] hover:bg-[#0f3d2e] gap-2 text-white shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Dispatching…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Dispatch to {selectedCount} States
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
