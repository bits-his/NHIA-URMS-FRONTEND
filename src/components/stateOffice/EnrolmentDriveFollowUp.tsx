import * as React from "react";
import {
  Download,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { enrolmentDrivesApi as api } from "@/lib/api";
import { monthLabel } from "./constants";

/** Design slide 12 — standard dashboard triggers and suggested responses. */
export const FOLLOW_UP_TRIGGERS = [
  {
    issue: "Enrolment declining for 2+ periods",
    suggested_action: "Request explanation and recovery plan",
    owner_hint: "State / Zone",
  },
  {
    issue: "Activities planned but not conducted",
    suggested_action: "Confirm reason; reschedule or revise plan",
    owner_hint: "State Coordinator",
  },
  {
    issue: "High leads, low enrolment",
    suggested_action: "Review conversion barriers and follow-up process",
    owner_hint: "State / Programme",
  },
  {
    issue: "Missing / late report",
    suggested_action: "Issue reminder and escalation",
    owner_hint: "State / Zone",
  },
  {
    issue: "Renewal backlog (where applicable)",
    suggested_action: "Plan targeted renewal communication",
    owner_hint: "State / Zone",
  },
] as const;

export type FollowUpSeed = {
  state_code?: string;
  issue?: string;
  agreed_action?: string;
  reporting_year?: string;
  reporting_month?: string;
};

type FollowUpRow = {
  reference_id?: string;
  state_code: string;
  zonal_code?: string;
  reporting_year: string | number;
  reporting_month: string | number;
  issue: string;
  agreed_action: string;
  source_dashboard: string;
  accountable_owner: string;
  owner_user_id?: string | number | null;
  deadline: string;
  status: string;
  outcome: string;
  evidence?: { reference_id: string; original_name: string }[];
  can_update?: boolean;
  closure_date?: string | null;
};

type Catalogue = {
  states: { code: string; description: string; zonal_code?: string }[];
  owners?: { id: number; name: string; state_code?: string | null; zonal_code?: string | null }[];
  evidence_types?: string[];
  permissions?: { create?: boolean; review?: boolean; manage?: boolean };
};

const STATUS_TONES: Record<string, string> = {
  Open: "bg-amber-50 text-amber-800 border-amber-100",
  "In progress": "bg-sky-50 text-sky-700 border-sky-100",
  Closed: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

function blank(seed?: FollowUpSeed, fallbackState?: string | null): FollowUpRow {
  const preset = FOLLOW_UP_TRIGGERS.find((row) => row.issue === seed?.issue);
  const now = new Date();
  return {
    state_code: seed?.state_code || fallbackState || "",
    reporting_year: seed?.reporting_year || String(now.getFullYear()),
    reporting_month: seed?.reporting_month || String(now.getMonth() + 1),
    issue: seed?.issue || "",
    agreed_action: seed?.agreed_action || preset?.suggested_action || "",
    source_dashboard: "Enrolment Drives Dashboard",
    accountable_owner: "",
    owner_user_id: "",
    deadline: "",
    status: "Open",
    outcome: "",
  };
}

export default function EnrolmentDriveFollowUp({
  seed,
  defaultStateId,
  defaultYear,
  defaultMonth,
  onSeedConsumed,
}: {
  seed?: FollowUpSeed | null;
  defaultStateId?: string | null;
  defaultYear?: string;
  defaultMonth?: string;
  onSeedConsumed?: () => void;
}) {
  const [catalogue, setCatalogue] = React.useState<Catalogue | null>(null);
  const [rows, setRows] = React.useState<FollowUpRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [draft, setDraft] = React.useState<FollowUpRow | null>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [evidenceType, setEvidenceType] = React.useState("Field Report");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const permissions = catalogue?.permissions || { manage: false };
  const stateName = (code: string) =>
    catalogue?.states.find((s) => s.code === code)?.description || code;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [config, list] = await Promise.all([api.catalogue(), api.actions()]);
      setCatalogue(config.data);
      setRows(list.data || []);
      if (!evidenceType && config.data?.evidence_types?.[0]) {
        setEvidenceType(config.data.evidence_types[0]);
      }
    } catch (error: any) {
      toast.error(error?.message || "Could not load management follow-up");
    } finally {
      setLoading(false);
    }
  }, [evidenceType]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!seed || !catalogue) return;
    if (!permissions.manage && !seed.issue) return;
    setDraft(
      blank(
        {
          ...seed,
          reporting_year: seed.reporting_year || defaultYear,
          reporting_month: seed.reporting_month || (defaultMonth !== "all" ? defaultMonth : undefined),
        },
        defaultStateId,
      ),
    );
    setFiles([]);
    onSeedConsumed?.();
  }, [seed, catalogue]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = rows.filter((row) => statusFilter === "all" || row.status === statusFilter);

  const ownersForState = (stateCode: string) =>
    (catalogue?.owners || []).filter(
      (owner) => !owner.state_code || owner.state_code === stateCode,
    );

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      let id = draft.reference_id;
      if (files.length && draft.status === "Closed" && !id) {
        throw new Error("Save the action as Open first, then upload closure evidence");
      }
      if (!id || draft.status !== "Closed") {
        const response = await api.saveAction(id, draft);
        id = response.data.reference_id;
        setDraft({ ...draft, reference_id: id });
      }
      if (files.length && id) {
        await api.evidence("actions", id, evidenceType, files);
        setFiles([]);
      }
      if (draft.status === "Closed") await api.saveAction(id, draft);
      await load();
      setDraft(null);
      toast.success(draft.status === "Closed" ? "Action closed" : "Management action saved");
    } catch (error: any) {
      toast.error(error?.message || "Could not save action");
    } finally {
      setBusy(false);
    }
  };

  const download = async (fileId: string, name: string) => {
    try {
      const blob = await api.download(fileId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error: any) {
      toast.error(error?.message || "Download failed");
    }
  };

  if (loading && !catalogue) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500 gap-2 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading follow-up tracker…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-[#d4e8dc] bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#0f3d2e]">Issues & management follow-up</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Make dashboard findings actionable and track decisions to closure.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={busy || loading}
              onClick={() => void load()}
              className="gap-1.5 border-[#d4e8dc] text-[#145c3f]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {permissions.manage && (
              <Button
                size="sm"
                className="gap-1.5 bg-[#145c3f] hover:bg-[#0f3d2e] text-white"
                onClick={() => {
                  setDraft(
                    blank(
                      {
                        state_code: defaultStateId || undefined,
                        reporting_year: defaultYear,
                        reporting_month: defaultMonth !== "all" ? defaultMonth : undefined,
                      },
                      defaultStateId,
                    ),
                  );
                  setFiles([]);
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Record action
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FOLLOW_UP_TRIGGERS.map((trigger) => (
            <button
              key={trigger.issue}
              type="button"
              disabled={!permissions.manage}
              onClick={() => {
                setDraft(
                  blank(
                    {
                      issue: trigger.issue,
                      agreed_action: trigger.suggested_action,
                      state_code: defaultStateId || undefined,
                      reporting_year: defaultYear,
                      reporting_month: defaultMonth !== "all" ? defaultMonth : undefined,
                    },
                    defaultStateId,
                  ),
                );
                setFiles([]);
              }}
              className="text-left rounded-sm border border-[#d4e8dc] bg-[#f8fdfb] px-3 py-2.5 hover:border-[#145c3f]/40 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <p className="text-xs font-bold text-[#0f3d2e] leading-snug">{trigger.issue}</p>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{trigger.suggested_action}</p>
              <p className="text-[10px] text-[#145c3f] font-semibold mt-1.5">Owner: {trigger.owner_hint}</p>
            </button>
          ))}
        </div>
      </div>

      <Dialog
        open={Boolean(draft)}
        onOpenChange={(open) => {
          if (!open) {
            setDraft(null);
            setFiles([]);
          }
        }}
      >
        <DialogContent
          showCloseButton
          className="max-w-3xl w-[min(96vw,48rem)] max-h-[92vh] overflow-hidden p-0 flex flex-col gap-0"
        >
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-[#d4e8dc] shrink-0">
            <DialogTitle>{draft?.reference_id || "Record management action"}</DialogTitle>
            <DialogDescription>
              Track the decision to closure — source dashboard, owner, deadline, status and evidence.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 grid gap-3 sm:grid-cols-2">
              <Field label="State" required>
                <Select
                  value={draft.state_code}
                  disabled={!!draft.reference_id || !permissions.manage}
                  onValueChange={(value) => setDraft({ ...draft, state_code: value, owner_user_id: "", accountable_owner: "" })}
                >
                  <SelectTrigger size="sm" displayValue={draft.state_code ? stateName(draft.state_code) : "Select state"}>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {(catalogue?.states || []).map((s) => (
                      <SelectItem key={s.code} value={s.code}>{s.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Reporting month" required>
                <Select
                  value={String(draft.reporting_month)}
                  disabled={!!draft.reference_id || !permissions.manage}
                  onValueChange={(value) => setDraft({ ...draft, reporting_month: value })}
                >
                  <SelectTrigger size="sm" displayValue={monthLabel(Number(draft.reporting_month))}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{monthLabel(i + 1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Reporting year" required>
                <Input
                  type="number"
                  min={2000}
                  max={2100}
                  disabled={!!draft.reference_id || !permissions.manage}
                  value={draft.reporting_year}
                  onChange={(e) => setDraft({ ...draft, reporting_year: e.target.value })}
                  className="h-8"
                />
              </Field>
              <Field label="Source dashboard" required>
                <Input
                  value={draft.source_dashboard}
                  disabled={!permissions.manage}
                  onChange={(e) => setDraft({ ...draft, source_dashboard: e.target.value })}
                  className="h-8"
                />
              </Field>
              <Field label="Trigger / issue" required className="sm:col-span-2">
                <Select
                  value={FOLLOW_UP_TRIGGERS.some((t) => t.issue === draft.issue) ? draft.issue : "__custom__"}
                  disabled={!permissions.manage}
                  onValueChange={(value) => {
                    if (value === "__custom__") {
                      setDraft({
                        ...draft,
                        issue: draft.issue && !FOLLOW_UP_TRIGGERS.some((t) => t.issue === draft.issue) ? draft.issue : "",
                      });
                      return;
                    }
                    const preset = FOLLOW_UP_TRIGGERS.find((t) => t.issue === value);
                    setDraft({
                      ...draft,
                      issue: value,
                      agreed_action: draft.agreed_action || preset?.suggested_action || "",
                    });
                  }}
                >
                  <SelectTrigger size="sm" displayValue={FOLLOW_UP_TRIGGERS.some((t) => t.issue === draft.issue) ? draft.issue : "Custom issue"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOW_UP_TRIGGERS.map((t) => (
                      <SelectItem key={t.issue} value={t.issue}>{t.issue}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">Custom issue…</SelectItem>
                  </SelectContent>
                </Select>
                {!FOLLOW_UP_TRIGGERS.some((t) => t.issue === draft.issue) && (
                  <textarea
                    className="mt-2 w-full min-h-[4rem] rounded-md border border-[#d4e8dc] bg-[#f8fdfb] px-3 py-2 text-sm"
                    value={draft.issue}
                    disabled={!permissions.manage}
                    onChange={(e) => setDraft({ ...draft, issue: e.target.value })}
                    placeholder="Describe the issue"
                  />
                )}
              </Field>
              <Field label="Action agreed" required className="sm:col-span-2">
                <textarea
                  className="w-full min-h-[4.5rem] rounded-md border border-[#d4e8dc] bg-[#f8fdfb] px-3 py-2 text-sm"
                  value={draft.agreed_action}
                  disabled={!permissions.manage}
                  onChange={(e) => setDraft({ ...draft, agreed_action: e.target.value })}
                />
              </Field>
              <Field label="Accountable owner" required>
                {ownersForState(draft.state_code).length ? (
                  <Select
                    value={String(draft.owner_user_id || "")}
                    disabled={!permissions.manage}
                    onValueChange={(value) => {
                      const owner = ownersForState(draft.state_code).find((o) => String(o.id) === value);
                      setDraft({
                        ...draft,
                        owner_user_id: value,
                        accountable_owner: owner?.name || "",
                      });
                    }}
                  >
                    <SelectTrigger size="sm" displayValue={draft.accountable_owner || "Select owner"}>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {ownersForState(draft.state_code).map((owner) => (
                        <SelectItem key={owner.id} value={String(owner.id)}>{owner.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={draft.accountable_owner}
                    disabled={!permissions.manage}
                    onChange={(e) => setDraft({ ...draft, accountable_owner: e.target.value })}
                    className="h-8"
                  />
                )}
              </Field>
              <Field label="Deadline" required>
                <Input
                  type="date"
                  value={draft.deadline}
                  disabled={!permissions.manage}
                  onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
                  className="h-8"
                />
              </Field>
              <Field label="Status" required>
                <Select
                  value={draft.status}
                  onValueChange={(value) => setDraft({ ...draft, status: value })}
                >
                  <SelectTrigger size="sm" displayValue={draft.status}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Open", "In progress", "Closed"].map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Outcome / closure explanation" className="sm:col-span-2">
                <textarea
                  className="w-full min-h-[4rem] rounded-md border border-[#d4e8dc] bg-[#f8fdfb] px-3 py-2 text-sm"
                  value={draft.outcome}
                  onChange={(e) => setDraft({ ...draft, outcome: e.target.value })}
                  placeholder={draft.status === "Closed" ? "Required when closing" : "Optional until closure"}
                />
              </Field>
              <Field label="Evidence" className="sm:col-span-2">
                <div className="flex flex-wrap gap-2 mb-2">
                  {(draft.evidence || []).map((file) => (
                    <Button
                      key={file.reference_id}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-[#d4e8dc]"
                      onClick={() => void download(file.reference_id, file.original_name)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      {file.original_name}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={evidenceType} onValueChange={setEvidenceType}>
                    <SelectTrigger size="sm" className="sm:w-48" displayValue={evidenceType}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalogue?.evidence_types || ["Field Report", "Official Letter", "Other"]).map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="file"
                    multiple
                    className="h-8 text-xs"
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  />
                </div>
                {files.length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1">{files.length} file(s) ready to upload</p>
                )}
              </Field>
            </div>
          )}

          <DialogFooter className="px-5 py-3 border-t border-[#d4e8dc] shrink-0 gap-2">
            <Button
              variant="outline"
              disabled={busy}
              className="border-[#d4e8dc]"
              onClick={() => { setDraft(null); setFiles([]); }}
            >
              Cancel
            </Button>
            <Button
              disabled={busy || !draft}
              onClick={() => void save()}
              className="gap-1.5 bg-[#145c3f] hover:bg-[#0f3d2e] text-white"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-sm border border-[#d4e8dc] bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-[#d4e8dc] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#0f3d2e]">Action tracker</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{filtered.length} action(s)</p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger size="sm" className="w-[160px]" displayValue={statusFilter === "all" ? "All statuses" : statusFilter}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {["Open", "In progress", "Closed"].map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7f5]">
                {["Issue ID", "Issue / agreed action", "State", "Owner", "Deadline", "Status", "Closed", "Action"].map((label) => (
                  <TableHead
                    key={label}
                    className={`text-xs font-bold text-[#0f3d2e] whitespace-nowrap ${label === "Action" ? "text-right" : ""}`}
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-slate-500 py-12">
                    No follow-up actions yet. Record one from a dashboard finding.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.reference_id} className="hover:bg-[#f8fdfb]">
                    <TableCell className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                      {row.reference_id}
                    </TableCell>
                    <TableCell className="min-w-[220px] space-y-1">
                      <p className="text-sm font-semibold text-[#0f3d2e]">{row.issue}</p>
                      <p className="text-xs text-slate-500">{row.agreed_action}</p>
                      <p className="text-[10px] text-slate-400">{row.source_dashboard}</p>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{stateName(row.state_code)}</TableCell>
                    <TableCell className="text-sm">{row.accountable_owner}</TableCell>
                    <TableCell className="text-xs tabular-nums whitespace-nowrap">{row.deadline}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] border ${STATUS_TONES[row.status] || STATUS_TONES.Open}`}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {row.closure_date ? new Date(row.closure_date).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.can_update && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-[#145c3f] hover:bg-[#e8f5ee]"
                          onClick={() => {
                            setDraft({
                              ...row,
                              reporting_year: String(row.reporting_year),
                              reporting_month: String(row.reporting_month),
                              owner_user_id: row.owner_user_id ? String(row.owner_user_id) : "",
                              outcome: row.outcome || "",
                            });
                            setFiles([]);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          Update
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 min-w-0 ${className}`}>
      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}{required ? " *" : ""}
      </Label>
      {children}
    </div>
  );
}
