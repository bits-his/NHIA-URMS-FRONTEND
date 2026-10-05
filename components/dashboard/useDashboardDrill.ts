import * as React from "react";
import { toast } from "sonner";
import type { DrillContext, DrillRow } from "./DashboardDrillPanel";
import type { DrillStatChip } from "./drillStats";

export type DrillParams = Record<string, string | undefined>;

type StackFrame = { context: DrillContext; params: DrillParams };

const GEO_SEGMENTS = new Set(["zone_breakdown", "state_breakdown"]);

const pickDrillFilters = (params: DrillParams): DrillParams => {
  const next = { ...params };
  delete next.segment;
  delete next.record_segment;
  return Object.fromEntries(
    Object.entries(next).filter(([, v]) => v != null && v !== ""),
  ) as DrillParams;
};

const resolveRecordSegment = (params: DrillParams) => {
  const rs = params.record_segment || params.segment || "complaints";
  return GEO_SEGMENTS.has(rs) ? (params.record_segment || "complaints") : rs;
};

export function useDashboardDrill(
  fetchDrill: (params: DrillParams) => Promise<{ success: boolean; data: DrillRow[] }>,
  scope: { state_id?: string; zone_id?: string; year?: string; month?: string },
  options?: { onReportRecord?: (row: DrillRow) => void },
) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<DrillRow[]>([]);
  const [context, setContext] = React.useState<DrillContext | null>(null);
  const stackRef = React.useRef<StackFrame[]>([]);
  const paramsRef = React.useRef<DrillParams>({});
  const [stackDepth, setStackDepth] = React.useState(0);

  const exec = React.useCallback(async (params: DrillParams, ctx: DrillContext) => {
    setLoading(true);
    setContext(ctx);
    paramsRef.current = params;
    try {
      const res = await fetchDrill(params);
      setRows(res.data ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      toast.error("Failed to load drill-down", { description: msg });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fetchDrill]);

  const openDrill = React.useCallback((
    partial: DrillParams,
    ctx: DrillContext,
    options?: { push?: boolean; resetStack?: boolean },
  ) => {
    const params = Object.fromEntries(
      Object.entries({ ...pickDrillFilters(scope), ...partial }).filter(([, v]) => v != null && v !== ""),
    ) as DrillParams;
    if (options?.resetStack) {
      stackRef.current = [];
      setStackDepth(0);
    } else if (options?.push && context) {
      stackRef.current = [...stackRef.current, { context, params: paramsRef.current }];
      setStackDepth(stackRef.current.length);
    }
    setOpen(true);
    void exec(params, ctx);
  }, [scope, context, exec]);

  /** Zone → State → records when at national/zonal scope; direct records at state scope */
  const openRecordDrill = React.useCallback((
    recordSegment: string,
    title: string,
    ctx: { subtitle?: string; breadcrumbs: string[] },
    extra?: DrillParams,
  ) => {
    const filters = { record_segment: recordSegment, ...extra };
    if (scope.state_id) {
      openDrill(
        { segment: recordSegment, ...filters },
        { title, subtitle: ctx.subtitle, breadcrumbs: ctx.breadcrumbs },
        { resetStack: true },
      );
    } else if (scope.zone_id) {
      openDrill(
        { segment: "state_breakdown", zone_id: scope.zone_id, ...filters },
        { title: `${title} — by State`, subtitle: ctx.subtitle, breadcrumbs: [...ctx.breadcrumbs, "By State"] },
        { resetStack: true },
      );
    } else {
      openDrill(
        { segment: "zone_breakdown", ...filters },
        { title: `${title} — by Zone`, subtitle: ctx.subtitle, breadcrumbs: [...ctx.breadcrumbs, "By Zone"] },
        { resetStack: true },
      );
    }
  }, [scope, openDrill]);

  const close = React.useCallback(() => {
    setOpen(false);
    stackRef.current = [];
    setStackDepth(0);
    paramsRef.current = {};
    setContext(null);
    setRows([]);
  }, []);

  const back = React.useCallback(() => {
    const prev = stackRef.current.pop();
    setStackDepth(stackRef.current.length);
    if (!prev) {
      close();
      return;
    }
    setOpen(true);
    void exec(prev.params, prev.context);
  }, [close, exec]);

  const openLocalDrill = React.useCallback((
    localRows: DrillRow[],
    ctx: DrillContext,
    localOptions?: { push?: boolean; resetStack?: boolean; params?: DrillParams },
  ) => {
    if (localOptions?.resetStack) {
      stackRef.current = [];
      setStackDepth(0);
    } else if (localOptions?.push && context) {
      stackRef.current = [...stackRef.current, { context, params: paramsRef.current }];
      setStackDepth(stackRef.current.length);
    }
    paramsRef.current = Object.fromEntries(
      Object.entries({
        ...pickDrillFilters(scope),
        record_segment: "all_reports",
        ...localOptions?.params,
      }).filter(([, v]) => v != null && v !== ""),
    ) as DrillParams;
    setOpen(true);
    setLoading(false);
    setContext(ctx);
    setRows(localRows);
  }, [context, scope]);

  const handleNestedRow = React.useCallback((row: DrillRow) => {
    const meta = row.meta || "";
    if (meta.startsWith("record:")) {
      options?.onReportRecord?.(row);
      return;
    }
    const breadcrumbs = [...(context?.breadcrumbs || []), context?.title || ""].filter(Boolean);
    const filters = pickDrillFilters(paramsRef.current);
    const recordSegment = resolveRecordSegment(paramsRef.current);
    const stateId = paramsRef.current.state_id;

    if (meta.startsWith("zone:")) {
      const zone_id = meta.replace("zone:", "") || String(row.id);
      openDrill(
        { segment: "state_breakdown", record_segment: recordSegment, ...filters, zone_id },
        {
          title: `${row.title} — States`,
          subtitle: "Select a state to view records",
          breadcrumbs: [...breadcrumbs, row.title],
        },
        { push: true },
      );
      return;
    }

    if (meta.startsWith("state:")) {
      const sid = meta.replace("state:", "") || String(row.id);
      openDrill(
        { segment: recordSegment, ...filters, state_id: sid },
        {
          title: `${row.title} — Records`,
          subtitle: row.zone_name ? `${row.zone_name} · ${row.title}` : row.title,
          breadcrumbs: [...breadcrumbs, row.title],
        },
        { push: true },
      );
      return;
    }

    if (meta.startsWith("segment:")) {
      const segment = meta.replace("segment:", "");
      openDrill(
        { segment, ...filters, ...(stateId ? { state_id: stateId } : {}) },
        { title: row.title, subtitle: row.subtitle ?? undefined, breadcrumbs: [...breadcrumbs, row.title] },
        { push: true },
      );
      return;
    }

    if (meta.startsWith("report_type:")) {
      const report_type = meta.replace("report_type:", "");
      openDrill(
        { ...filters, segment: "reports", report_type, ...(stateId ? { state_id: stateId } : {}) },
        { title: row.title, subtitle: "Monthly report records", breadcrumbs: [...breadcrumbs, row.title] },
        { push: true },
      );
    }
  }, [context, openDrill, options]);

  const handleStatClick = React.useCallback((stat: DrillStatChip) => {
    if (stat.row) {
      handleNestedRow(stat.row);
      return;
    }
    if (!stat.filter || !Object.keys(stat.filter).length) return;

    const breadcrumbs = [...(context?.breadcrumbs || []), context?.title || ""].filter(Boolean);
    const filters = pickDrillFilters(paramsRef.current);
    const recordSegment = resolveRecordSegment(paramsRef.current);
    const label = stat.label;

    openDrill(
      { segment: recordSegment, ...filters, ...stat.filter },
      {
        title: `${context?.title ?? "Records"} — ${label}`,
        subtitle: "Filtered drill-down",
        breadcrumbs: [...breadcrumbs, label],
      },
      { push: true },
    );
  }, [context, openDrill, handleNestedRow]);

  return {
    open,
    loading,
    rows,
    context,
    openDrill,
    openRecordDrill,
    openLocalDrill,
    close,
    back,
    handleNestedRow,
    handleStatClick,
    canGoBack: open && stackDepth > 0,
  };
}
