import * as React from "react";
import { ArrowLeft, Loader2, FileText, Clock, CheckCircle2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import { monthLabel } from "../constants";
import { ADMIN_HR_CONFIG, type AdminHrReportType } from "./constants";
import { normalizePayload } from "./normalizePayload";

interface Props {
  reportType: AdminHrReportType;
  reportId: number;
  onBack: () => void;
  onEdit?: () => void;
}

const STATUS_CONFIG = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600 border-slate-200", icon: <FileText className="w-3.5 h-3.5" /> },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200", icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function formatValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      return value.join(", ");
    }
    return `${value.length} item(s)`;
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function PayloadFields({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => v != null && v !== "");
  if (!entries.length) return <p className="text-sm text-slate-400 italic">No data</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {entries.map(([key, value]) => (
        <div key={key} className="space-y-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{humanizeKey(key)}</p>
          <p className="text-sm font-medium text-slate-800 break-words whitespace-pre-wrap">{formatValue(value)}</p>
        </div>
      ))}
    </div>
  );
}

const VEHICLE_ROW_HEADERS = [
  "vehicleModel",
  "chassisNumber",
  "maintenanceType",
  "problemReported",
  "maintenanceDate",
  "nextServiceDate",
  "vehicleStatus",
  "remarks",
] as const;

function PayloadTable({ rows, preferredHeaders }: { rows: Record<string, unknown>[]; preferredHeaders?: readonly string[] }) {
  if (!rows.length) return <p className="text-sm text-slate-400 italic">No rows</p>;
  const discovered = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const headers = preferredHeaders?.length
    ? [
        ...preferredHeaders.filter((h) => discovered.includes(h)),
        ...discovered.filter((h) => !preferredHeaders.includes(h)),
      ]
    : discovered;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#e8f5ee] hover:bg-[#e8f5ee]">
            <TableHead className="text-xs font-bold w-10">#</TableHead>
            {headers.map((h) => (
              <TableHead key={h} className="text-xs font-bold whitespace-nowrap">{humanizeKey(h)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i} className={i % 2 ? "bg-[#f4f7f5]" : undefined}>
              <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
              {headers.map((h) => (
                <TableCell key={h} className="text-sm max-w-[240px]">{formatValue(row[h])}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">{title}</h3>
      {children}
    </section>
  );
}

function PayloadRenderer({ payload }: { payload: Record<string, unknown> }) {
  const scalarEntries: [string, unknown][] = [];
  const arraySections: [string, Record<string, unknown>[]][] = [];
  const objectSections: [string, Record<string, unknown>][] = [];

  for (const [key, value] of Object.entries(payload)) {
    if (value == null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length && isPlainObject(value[0])) {
        arraySections.push([key, value as Record<string, unknown>[]]);
      } else if (value.length) {
        scalarEntries.push([key, value]);
      }
    } else if (isPlainObject(value)) {
      objectSections.push([key, value]);
    } else {
      scalarEntries.push([key, value]);
    }
  }

  return (
    <>
      {scalarEntries.length > 0 && (
        <DetailSection title="General Information">
          <PayloadFields data={Object.fromEntries(scalarEntries)} />
        </DetailSection>
      )}
      {objectSections.map(([key, obj]) => (
        <DetailSection key={key} title={humanizeKey(key)}>
          <PayloadFields data={obj} />
        </DetailSection>
      ))}
      {arraySections.map(([key, rows]) => (
        <DetailSection key={key} title={key === "rows" ? "Maintenance Events" : humanizeKey(key)}>
          <PayloadTable
            rows={rows}
            preferredHeaders={key === "rows" ? VEHICLE_ROW_HEADERS : undefined}
          />
        </DetailSection>
      ))}
    </>
  );
}

export default function AdminHrDetail({ reportType, reportId, onBack, onEdit }: Props) {
  const cfg = ADMIN_HR_CONFIG[reportType];
  const api = stateOfficeApi[reportType];
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(reportId);
        if (!cancelled) setReport(res.data);
      } catch (err: any) {
        if (!cancelled) toast.error("Failed to load report", { description: err.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, reportId]);

  const statusCfg = report ? STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG] : null;
  const payload = normalizePayload(report?.payload);

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight truncate">{cfg.formTitle}</h2>
          <p className="text-xs text-slate-500 truncate">
            {report?.reference_id ? (
              <span className="font-mono font-semibold text-[#145c3f]">{report.reference_id}</span>
            ) : (
              cfg.subtitle
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onEdit && (
            <Button
              size="sm"
              onClick={onEdit}
              className="gap-2 shrink-0 bg-[#145c3f] hover:bg-[#0f3d2e] text-white"
            >
              <Pencil className="w-4 h-4" /> Edit
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5 font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Loading report…</span>
            </div>
          ) : !report ? (
            <div className="text-center py-24 text-slate-400 text-sm">Report not found.</div>
          ) : (
            <Card className="rounded-sm border-[#d4e8dc] shadow-sm overflow-hidden">
              <CardContent className="p-4 md:p-5 space-y-6">
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">Report Information</h3>
                    {statusCfg && (
                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 flex items-center gap-1 border ${statusCfg.cls}`}>
                        {statusCfg.icon} {statusCfg.label}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      ["Reference", report.reference_id],
                      ["Zone", report.zone?.description],
                      ["State", report.state?.description],
                      ["Year", report.reporting_year],
                      ["Month", monthLabel(report.reporting_month)],
                      ["Summary", report.title],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="space-y-1 min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                        <p className="text-sm font-semibold text-slate-800 break-words">{formatValue(value)}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <PayloadRenderer payload={payload} />
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
