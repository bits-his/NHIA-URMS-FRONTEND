import * as React from "react";
import {
  ArrowLeft, RefreshCw, Loader2, FileSpreadsheet,
  LayoutGrid, Table2, X, Download, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { annualReportApi, stockApi, type OperationalDataRow } from "@/lib/api";
import { AnnualReportDetailView } from "./AnnualReportDetailView";
import { formatMetricValue } from "./annualReportConfig";
import { downloadAnnualReport } from "@/src/utils/annualReportExport";
import {
  REPORT_TYPES,
  buildSections,
  reportTypeLabel,
  isQuarterlySection,
  quarterColumnClasses,
  type ReportTypeId,
  type ColDef,
  type SectionDef,
} from "./annualReportConfig";

interface AnnualReportsListProps {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  reportScope?: "national" | "zonal" | "state" | "none";
}

const YEARS = ["2025", "2024", "2023", "2022"];
const ALL = "__all__";

type ColKind = "text" | "num" | "money";
type ViewMode = "table" | "readable";

function formatCell(val: string | number | null | undefined, kind: ColKind): string {
  return formatMetricValue(val, kind);
}

function buildDisplayTitle(
  year: string,
  reportType: ReportTypeId,
  zoneName: string | null,
  stateName: string | null
): string {
  const parts: string[] = [reportTypeLabel(reportType), year];
  if (stateName) parts.push(stateName);
  else if (zoneName) parts.push(`${zoneName} Zone`);
  return parts.join(" — ");
}

function zoneDisplayLabel(
  zoneId: string,
  zones: { id: number; description: string; zonal_code?: string }[]
): string {
  if (zoneId === ALL) return "All zones";
  const z = zones.find((x) => String(x.id) === zoneId);
  if (!z) return "Select zone";
  return z.zonal_code ? `${z.zonal_code} — ${z.description}` : z.description;
}

function stateDisplayLabel(
  stateId: string,
  states: { id: number; description: string }[],
  zoneId: string
): string {
  if (stateId === ALL) return zoneId !== ALL ? "All states in zone" : "All states";
  const s = states.find((x) => String(x.id) === stateId);
  return s?.description ?? "Select state";
}

// ─── Table with fixed state column ────────────────────────────────────────────

function FixedStateTable({
  rows,
  identityCols,
  dataSections,
  identitySection,
}: {
  rows: OperationalDataRow[];
  identityCols: ColDef[];
  dataSections: SectionDef[];
  identitySection: SectionDef;
}) {
  const stateCol = identityCols.find((c) => c.key === "state");
  const snCol = identityCols.find((c) => c.key === "sn");
  const zoneCol = identityCols.find((c) => c.key === "zone");
  const fixedCols = [snCol, stateCol, zoneCol].filter(Boolean) as ColDef[];

  return (
    <div className="flex rounded-xl border border-[#d4e8dc] bg-white shadow-sm overflow-hidden">
      {/* Fixed left: S/N + State (+ Zone if shown) */}
      <div className="shrink-0 border-r-2 border-[#1a5c3a]/20 bg-white z-20 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]">
        <table className="border-collapse text-[11px]">
          <thead>
            {dataSections.length > 0 && (
              <tr className="bg-[#1a5c3a] text-white h-[37px]">
                <th
                  colSpan={fixedCols.length}
                  className="border border-[#2d7a52] px-2 py-2 text-center font-bold uppercase tracking-wide whitespace-nowrap"
                >
                  {identitySection.title}
                </th>
              </tr>
            )}
            <tr className="bg-[#f0fdf7]">
              {fixedCols.map((col) => (
                <th
                  key={col.key}
                  className="border border-[#d4e8dc] px-2 py-1.5 text-center font-semibold text-slate-700 whitespace-nowrap bg-[#f0fdf7]"
                  style={{ minWidth: col.width ?? 72 }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const rowBg = ri % 2 === 0 ? "bg-white" : "bg-[#fafdfb]";
              return (
                <tr key={row.state_id} className={rowBg}>
                  {fixedCols.map((col) => (
                    <td
                      key={col.key}
                      className={`border border-slate-100 px-2 py-1 text-slate-800 ${rowBg} ${
                        col.key === "sn" ? "text-center font-medium text-slate-500" : "text-left font-semibold"
                      }`}
                    >
                      {formatCell(col.get(row), col.kind)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Scrollable data columns */}
      <div className="overflow-x-auto flex-1 min-w-0">
        <table className="border-collapse text-[11px] w-max min-w-full">
          <thead>
            {dataSections.length > 0 && (
              <tr className="bg-[#1a5c3a] text-white h-[37px]">
                {dataSections.map((section) => (
                  <th
                    key={section.id}
                    colSpan={section.columns.length}
                    className="border border-[#2d7a52] px-2 py-2 text-center font-bold uppercase tracking-wide whitespace-nowrap"
                  >
                    {section.title}
                  </th>
                ))}
              </tr>
            )}
            <tr className="bg-[#f0fdf7]">
              {dataSections.flatMap((section, si) =>
                section.columns.map((col, ci) => {
                  const isQuarterly = isQuarterlySection(section);
                  const qClass = isQuarterly ? quarterColumnClasses(col.label, "head") : "";
                  const sectionStart = ci === 0 && si > 0 ? "border-l-2 border-[#1a5c3a]/25" : "";
                  return (
                    <th
                      key={`${section.id}-${col.key}`}
                      className={`border border-[#d4e8dc] px-2 py-1.5 text-center font-semibold whitespace-nowrap ${qClass} ${sectionStart}`}
                      style={{ minWidth: isQuarterly ? 64 : 72 }}
                      title={isQuarterly ? `${section.title} — ${col.label}` : section.title}
                    >
                      {isQuarterly ? col.label : col.label}
                    </th>
                  );
                })
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const rowBg = ri % 2 === 0 ? "bg-white" : "bg-[#fafdfb]";
              return (
                <tr key={row.state_id} className={rowBg}>
                  {dataSections.flatMap((section, si) =>
                    section.columns.map((col, ci) => {
                      const isQuarterly = isQuarterlySection(section);
                      const qClass = isQuarterly ? quarterColumnClasses(col.label, "cell") : "";
                      const sectionStart = ci === 0 && si > 0 ? "border-l-2 border-[#1a5c3a]/15" : "";
                      return (
                        <td
                          key={`${section.id}-${col.key}`}
                          className={`border border-slate-100 px-2 py-1 text-right tabular-nums text-slate-800 ${rowBg} ${qClass} ${sectionStart}`}
                        >
                          {formatCell(col.get(row), col.kind)}
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnnualReportsList({
  onBack,
  defaultZoneId,
  defaultStateId,
  reportScope = "national",
}: AnnualReportsListProps) {
  const lockZone = reportScope === "zonal" || reportScope === "state";
  const lockState = reportScope === "state";

  const initialZone = defaultZoneId ?? ALL;
  const initialState = defaultStateId ?? ALL;

  const [zones, setZones] = React.useState<{ id: number; description: string; zonal_code?: string }[]>([]);
  const [states, setStates] = React.useState<{ id: number; description: string }[]>([]);

  const [year, setYear] = React.useState("2025");
  const [zoneId, setZoneId] = React.useState(initialZone);
  const [stateId, setStateId] = React.useState(initialState);
  const [reportType, setReportType] = React.useState<ReportTypeId>("all");
  const isStateSelected = stateId !== ALL;
  const [viewMode, setViewMode] = React.useState<ViewMode>(
    (defaultStateId ?? ALL) !== ALL ? "readable" : "table"
  );

  const [loading, setLoading] = React.useState(false);
  const [exporting, setExporting] = React.useState<"pdf" | "excel" | null>(null);
  const [displayTitle, setDisplayTitle] = React.useState("");
  const [rows, setRows] = React.useState<OperationalDataRow[]>([]);

  React.useEffect(() => {
    stockApi.getZones().then((r) => setZones(r.data)).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (zoneId === ALL) {
      stockApi.getStates().then((r) => setStates(r.data)).catch(() => setStates([]));
      return;
    }
    stockApi.getStates(zoneId).then((r) => setStates(r.data)).catch(() => setStates([]));
  }, [zoneId]);

  React.useEffect(() => {
    if (defaultZoneId) setZoneId(defaultZoneId);
  }, [defaultZoneId]);

  React.useEffect(() => {
    if (defaultStateId) setStateId(defaultStateId);
  }, [defaultStateId]);

  // State selected → detail view; all states → table view
  React.useEffect(() => {
    setViewMode(stateId !== ALL ? "readable" : "table");
  }, [stateId]);

  const handleZoneChange = (value: string) => {
    setZoneId(value);
    if (value === ALL) {
      if (!lockState) setStateId(ALL);
      return;
    }
    if (!lockState && stateId !== ALL) {
      stockApi.getStates(value).then((r) => {
        if (!r.data.some((s: { id: number }) => String(s.id) === stateId)) {
          setStateId(ALL);
        }
      });
    }
  };

  const showZoneColumn = zoneId !== ALL && stateId === ALL;
  const sections = React.useMemo(
    () => buildSections(parseInt(year, 10), reportType, showZoneColumn),
    [year, reportType, showZoneColumn]
  );
  const identitySection = sections[0];
  const dataSections = sections.slice(1);
  const identityCols = identitySection.columns;

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const apiFilters: { zone_id?: number; state_id?: number } = {};
      if (zoneId !== ALL) apiFilters.zone_id = parseInt(zoneId, 10);
      if (stateId !== ALL) apiFilters.state_id = parseInt(stateId, 10);

      const res = await annualReportApi.getOperationalData(parseInt(year, 10), apiFilters);
      setRows(res.data.rows);
      setDisplayTitle(
        buildDisplayTitle(
          year,
          reportType,
          res.data.state_name ? null : res.data.zone_name,
          res.data.state_name
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to load annual report", { description: msg });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [year, zoneId, stateId]);

  // Auto-fetch when filters change
  React.useEffect(() => {
    const timer = setTimeout(() => fetchData(), 250);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleClearFilters = () => {
    setYear("2025");
    setZoneId(initialZone);
    setStateId(initialState);
    setReportType("all");
  };

  const hasActiveFilters =
    year !== "2025" ||
    zoneId !== initialZone ||
    stateId !== initialState ||
    reportType !== "all";

  const handleExport = async (format: "pdf" | "excel") => {
    if (!rows.length) {
      toast.error("No data to download", { description: "Adjust filters and try again." });
      return;
    }
    setExporting(format);
    try {
      const stateName =
        stateId !== ALL ? states.find((s) => String(s.id) === stateId)?.description ?? null : null;
      const zoneName =
        zoneId !== ALL ? zones.find((z) => String(z.id) === zoneId)?.description ?? null : null;

      await downloadAnnualReport(format, rows, sections, {
        year: parseInt(year, 10),
        reportType,
        title: displayTitle || `Annual Report ${year}`,
        stateSelected: isStateSelected,
        zoneName,
        stateName,
      });

      toast.success(`Downloaded ${format.toUpperCase()}`, {
        description:
          format === "pdf"
            ? "PDF includes all report sections for the selected state"
            : "Excel exported as table layout",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed";
      toast.error("Download failed", { description: msg });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <Button
              variant={viewMode === "readable" ? "default" : "ghost"}
              size="sm"
              className={`h-8 gap-1.5 text-xs ${viewMode === "readable" ? "bg-primary text-white" : ""}`}
              onClick={() => setViewMode("readable")}
              disabled={!isStateSelected}
              title={!isStateSelected ? "Select a state to use detail view" : undefined}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Detail
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className={`h-8 gap-1.5 text-xs ${viewMode === "table" ? "bg-primary text-white" : ""}`}
              onClick={() => setViewMode("table")}
              disabled={isStateSelected}
              title={isStateSelected ? "Clear state filter to use table view" : undefined}
            >
              <Table2 className="w-3.5 h-3.5" /> Table
            </Button>
          </div>
          {isStateSelected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("pdf")}
              disabled={loading || !rows.length || exporting !== null}
              className="gap-1.5 h-8 text-xs"
              title="Download PDF (full state report)"
            >
              {exporting === "pdf" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              Download PDF
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("excel")}
              disabled={loading || !rows.length || exporting !== null}
              className="gap-1.5 h-8 text-xs"
              title="Download Excel (table layout)"
            >
              {exporting === "excel" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Download Excel
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="px-6 py-4 border-b bg-white shrink-0 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-9" displayValue={year}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Zone (optional)</Label>
            <Select value={zoneId} onValueChange={handleZoneChange} disabled={lockZone}>
              <SelectTrigger className="h-9" displayValue={zoneDisplayLabel(zoneId, zones)}>
                <SelectValue placeholder="All zones" />
              </SelectTrigger>
              <SelectContent>
                {!lockZone && <SelectItem value={ALL}>All zones</SelectItem>}
                {zones.map((z) => (
                  <SelectItem key={z.id} value={String(z.id)}>
                    {z.zonal_code ? `${z.zonal_code} — ` : ""}{z.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">State (optional)</Label>
            <Select value={stateId} onValueChange={setStateId} disabled={lockState}>
              <SelectTrigger className="h-9" displayValue={stateDisplayLabel(stateId, states, zoneId)}>
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                {!lockState && (
                  <SelectItem value={ALL}>
                    {zoneId !== ALL ? "All states in zone" : "All states"}
                  </SelectItem>
                )}
                {states.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Report type</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportTypeId)}>
              <SelectTrigger className="h-9" displayValue={reportTypeLabel(reportType)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>{rt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            className="h-9 gap-2"
            onClick={handleClearFilters}
            disabled={!hasActiveFilters && !loading}
          >
            <X className="w-4 h-4" />
            Clear filters
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600 min-h-[24px]">
          {loading ? (
            <span className="flex items-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
            </span>
          ) : (
            <>
              <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium">{displayTitle || `Annual Report ${year}`}</span>
              <span className="text-xs text-slate-400">
                ({rows.length} state{rows.length !== 1 ? "s" : ""})
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading report data…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2 text-slate-400">
            <FileSpreadsheet className="w-10 h-10 opacity-30" />
            <p className="text-sm font-medium">No data for selected filters</p>
            <p className="text-xs">Try a different year, zone, or report type</p>
          </div>
        ) : viewMode === "readable" ? (
          <AnnualReportDetailView
            rows={rows}
            sections={sections}
            year={parseInt(year, 10)}
            reportType={reportType}
          />
        ) : (
          <>
            <p className="text-[11px] text-slate-500 mb-3 px-1">
              Computed from approved monthly departmental reports — not the manual annual submission form.
              Quarterly metrics show separate Q1–Q4 totals (Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec) plus Sub-Total.
            </p>
            <FixedStateTable
              rows={rows}
              identityCols={identityCols}
              dataSections={dataSections}
              identitySection={identitySection}
            />
          </>
        )}
      </div>
    </div>
  );
}
