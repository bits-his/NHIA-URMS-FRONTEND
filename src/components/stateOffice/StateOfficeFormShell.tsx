import * as React from "react";
import { Save, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import { useStateOfficeHeader } from "./shared/useStateOfficeHeader";
import ReportBasicInfo from "./shared/ReportBasicInfo";

interface Props {
  reportId?: number | null;
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  children: (ctx: {
    saving: boolean;
    submitting: boolean;
    savedId: number | null;
  }) => React.ReactNode;
  buildPayload: (base: Record<string, unknown>) => Record<string, unknown>;
  validate?: () => string | null;
  reportType: keyof typeof stateOfficeApi;
  onLoaded?: (data: any) => void;
  /** Optional reporting week for weekly-actionable forms */
  reportWeek?: string;
  setReportWeek?: (v: string) => void;
  /** Show Zone ID / State ID next to the geo dropdowns (enrollee register) */
  showGeoIds?: boolean;
  afterPersist?: (saved: { id: number }) => Promise<void>;
}

export default function StateOfficeFormShell({
  reportId, onBack, defaultZoneId, defaultStateId, children,
  buildPayload, validate, reportType, onLoaded,
  reportWeek, setReportWeek,
  showGeoIds,
  afterPersist,
}: Props) {
  const api = stateOfficeApi[reportType];
  const header = useStateOfficeHeader(defaultZoneId, defaultStateId);

  const [loadingRecord, setLoadingRecord] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [savedId, setSavedId] = React.useState<number | null>(null);
  const [refId, setRefId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!reportId) {
      setSavedId(null); setRefId(null);
      header.resetHeader();
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingRecord(true);
      try {
        const res = await api.get(reportId);
        if (cancelled) return;
        const v = res.data;
        setSavedId(v.id);
        setRefId(v.reference_id);
        header.applyHeader(v);
        onLoaded?.(v);
      } catch (err: any) {
        if (!cancelled) toast.error("Failed to load report", { description: err.message });
      } finally {
        if (!cancelled) setLoadingRecord(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, api, reportType]);

  const persist = async (status: "draft" | "submitted") => {
    const headerErr = header.validateHeader();
    if (headerErr) { toast.error(headerErr); return; }
    if (setReportWeek && !reportWeek) { toast.error("Please select a Reporting Week"); return; }
    const extraErr = validate?.();
    if (extraErr) { toast.error(extraErr); return; }

    const setter = status === "draft" ? setSaving : setSubmitting;
    setter(true);
    try {
      const payload = buildPayload(header.headerPayload(status) as Record<string, unknown>);
      let res;
      if (savedId) {
        res = await api.update(savedId, { ...payload, status });
      } else {
        res = await api.create(payload);
        setSavedId(res.data.id);
      }
      setRefId(res.data.reference_id);
      if (afterPersist) {
        await afterPersist({ id: res.data.id });
      }
      toast.success(status === "draft" ? "Draft saved" : "Report submitted", {
        description: `Ref: ${res.data.reference_id}`,
      });
      if (status === "submitted") onBack();
    } catch (err: any) {
      toast.error(status === "draft" ? "Save failed" : "Submission failed", { description: err.message });
    } finally { setter(false); }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-28">
          {loadingRecord ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Loading report...</span>
            </div>
          ) : (
            <>
              <ReportBasicInfo
                {...header}
                lockZone={header.lockZone}
                lockState={header.lockState}
                reportWeek={reportWeek}
                setReportWeek={setReportWeek}
                showGeoIds={showGeoIds}
              />
              {children({ saving, submitting, savedId })}
            </>
          )}
        </div>
      </ScrollArea>

      {!loadingRecord && (
        <div className="sticky bottom-0 z-30 bg-white border-t border-border/50 px-4 md:px-6 py-3 flex flex-wrap items-center justify-end gap-3">
          <Button variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button variant="ghost" size="sm" onClick={() => persist("draft")} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </Button>
          <Button
            className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
            onClick={() => persist("submitted")}
            disabled={submitting}
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              : <><Send className="w-4 h-4" /> Submit</>}
          </Button>
        </div>
      )}
    </div>
  );
}
