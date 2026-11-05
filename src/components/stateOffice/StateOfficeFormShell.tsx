import * as React from "react";
import { Save, Send, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import { useStateOfficeHeader } from "./shared/useStateOfficeHeader";
import ReportBasicInfo from "./shared/ReportBasicInfo";
import {
  SubmitConfirmModal,
  useReportingOfficerSubmitConfirm,
  type SubmitConfirmOptions,
} from "@/src/components/SubmitConfirmModal";
import PageLayout from "@/src/components/PageLayout";

interface Props {
  reportId?: number | string | null;
  onBack: () => void;
  /** Leave the form without saving (create-only → home). Defaults to onBack. */
  onCancel?: () => void;
  /** After successful submit. Defaults to onBack. */
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  /** Sticky page header title (left); Back sits on the left like SERVICOM pages */
  pageTitle?: string;
  pageSubtitle?: string;
  /** Hide sticky Save Draft / Submit bar (forms that provide their own actions) */
  hideFooterActions?: boolean;
  /** Hide default ReportBasicInfo when the form renders its own zone/state/period header */
  hideBasicInfo?: boolean;
  children: (ctx: {
    saving: boolean;
    submitting: boolean;
    savedId: number | string | null;
    stateId: string;
    persist: (status: string) => Promise<void>;
    requestSubmit: (action: () => void | Promise<void>, options?: SubmitConfirmOptions) => void;
    header: ReturnType<typeof useStateOfficeHeader>;
  }) => React.ReactNode;
  buildPayload: (base: Record<string, unknown>) => Record<string, unknown>;
  validate?: (status?: string) => string | null;
  reportType: keyof typeof stateOfficeApi;
  onLoaded?: (data: any) => void;
  /** Optional reporting week for weekly-actionable forms */
  reportWeek?: string;
  setReportWeek?: (v: string) => void;
  /** Show Zone ID / State ID next to the geo dropdowns (enrollee register) */
  showGeoIds?: boolean;
  /** Zone · State · Year · Month · Quarter header (ICT register) */
  showQuarter?: boolean;
  /** With showQuarter: Zone · State · Year only (Expenditure year matrix). */
  yearOnly?: boolean;
  afterPersist?: (saved: { id: number | string }) => Promise<void>;
  /** Fired after every successful create/update (e.g. draft resume for create-only officers). */
  onPersisted?: (saved: { id: number | string; status: string; reference_id?: string }) => void;
  /** Keep zone, state, and period when the report type changes before the first save. */
  preserveHeader?: boolean;
  /** Match the compact register chrome (smaller header, tighter page). */
  compact?: boolean;
  /** Zone + period always; State only required when sending for review / final submit. */
  deferStateUntilReview?: boolean;
  /** Label for the header submission-date field (ReportBasicInfo). */
  submitDateLabel?: string;
  /** After Save Draft, leave the form (same as submit success). */
  returnOnDraft?: boolean;
  /** Parent workspace owns Back + title — skip FormShell sticky header. */
  hidePageHeader?: boolean;
}

export default function StateOfficeFormShell({
  reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId, children,
  buildPayload, validate, reportType, onLoaded,
  reportWeek, setReportWeek,
  showGeoIds,
  showQuarter,
  yearOnly = false,
  pageTitle,
  pageSubtitle,
  hideFooterActions = false,
  hideBasicInfo = false,
  afterPersist,
  onPersisted,
  preserveHeader = false,
  compact = false,
  deferStateUntilReview = false,
  submitDateLabel,
  returnOnDraft = false,
  hidePageHeader = false,
}: Props) {
  const preserveHeaderRef = React.useRef(preserveHeader);
  preserveHeaderRef.current = preserveHeader;
  const handleCancel = onCancel ?? onBack;
  const handleSubmitted = onSubmitted ?? onBack;
  const api = stateOfficeApi[reportType];
  const header = useStateOfficeHeader(defaultZoneId, defaultStateId);
  const submitConfirm = useReportingOfficerSubmitConfirm();

  const [loadingRecord, setLoadingRecord] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [savedId, setSavedId] = React.useState<number | string | null>(null);
  const [refId, setRefId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!reportId) {
      setSavedId(null); setRefId(null);
      if (!preserveHeaderRef.current) header.resetHeader();
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
        let loaded = v;
        if (typeof v?.payload === "string") {
          const trimmed = v.payload.trim();
          if (!trimmed) {
            loaded = { ...v, payload: {} };
          } else {
            try {
              loaded = { ...v, payload: JSON.parse(trimmed) };
            } catch {
              loaded = { ...v, payload: {} };
            }
          }
        }
        onLoaded?.(loaded);
      } catch (err: any) {
        if (!cancelled) toast.error("Failed to load report", { description: err.message });
      } finally {
        if (!cancelled) setLoadingRecord(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, api, reportType]);

  const persist = async (status: string) => {
    const isDraftSave = status === "draft" || status === "returned";
    const requireState = !deferStateUntilReview || !isDraftSave;
    // When State is deferred, Zone is also not required on draft (it is set from State later).
    const headerErr = header.validateHeader({
      requireState,
      requireZone: deferStateUntilReview ? requireState : true,
      requireMonth: !yearOnly,
    });
    if (headerErr) { toast.error(headerErr); return; }
    if (setReportWeek && !reportWeek) { toast.error("Please select a Reporting Week"); return; }
    const extraErr = validate?.(status);
    if (extraErr) { toast.error(extraErr); return; }

    const setter = isDraftSave ? setSaving : setSubmitting;
    setter(true);
    try {
      const payload = buildPayload(header.headerPayload(
        isDraftSave ? "draft" : status === "approved" ? "approved" : "submitted",
      ) as Record<string, unknown>);
      let res;
      if (savedId) {
        res = await api.update(savedId, { ...payload, status });
      } else {
        res = await api.create({ ...payload, status });
        setSavedId(res.data.id);
      }
      setRefId(res.data.reference_id);
      if (afterPersist) {
        await afterPersist({ id: res.data.id });
      }
      onPersisted?.({
        id: res.data.id,
        status: res.data.status || status,
        reference_id: res.data.reference_id,
      });
      const submittedLabel = pageTitle === "Beneficiary Management" ? "Sent for review" : "Report submitted";
      const messages: Record<string, string> = {
        draft: "Draft saved",
        returned: "Draft saved",
        awaiting_review: "Sent for State Coordinator review",
        endorsed: "Endorsement recorded",
        submitted: submittedLabel,
        approved: "Report approved",
      };
      toast.success(messages[status] || "Saved", {
        description: `Ref: ${res.data.reference_id}`,
      });
      if (
        status === "submitted"
        || status === "awaiting_review"
        || status === "approved"
        || (returnOnDraft && isDraftSave)
      ) {
        handleSubmitted();
      }
    } catch (err: any) {
      toast.error(isDraftSave ? "Save failed" : "Action failed", { description: err.message });
    } finally { setter(false); }
  };

  const contentPad = hidePageHeader
    ? "px-4 md:px-5 py-3 space-y-3"
    : compact
      ? "px-4 md:px-5 py-3 space-y-3"
      : "px-4 md:px-6 py-4 space-y-4";

  return (
    <PageLayout
      showHeader={!hidePageHeader}
      title={pageTitle || refId}
      onBack={handleCancel}
      backLabel={compact ? "Back" : undefined}
      maxWidth="5xl"
      loading={loadingRecord}
    >
      <div className={`w-full ${contentPad} ${hideFooterActions ? "pb-8" : "pb-28"}`}>
          {loadingRecord ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Loading report...</span>
            </div>
          ) : (
            <>
              {!hideBasicInfo && (
                <ReportBasicInfo
                  {...header}
                  lockZone={header.lockZone}
                  lockState={header.lockState}
                  reportWeek={reportWeek}
                  setReportWeek={setReportWeek}
                  showGeoIds={showGeoIds}
                  showQuarter={showQuarter}
                  yearOnly={yearOnly}
                  submitDateLabel={submitDateLabel}
                />
              )}
              {children({
                saving,
                submitting,
                savedId,
                stateId: header.stateId,
                persist,
                requestSubmit: submitConfirm.requestSubmit,
                header,
              })}
            </>
          )}
        </div>

      {!loadingRecord && !hideFooterActions && (
        <div className="sticky bottom-0 z-30 bg-white border-t border-border/50 px-4 md:px-6 py-3 flex flex-wrap items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => persist("draft")} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </Button>
          <Button
            className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white gap-2 shadow-sm"
            onClick={() => submitConfirm.requestSubmit(() => persist("submitted"))}
            disabled={submitting}
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              : <><Send className="w-4 h-4" /> Submit</>}
          </Button>
        </div>
      )}
      <SubmitConfirmModal
        open={submitConfirm.open}
        busy={submitConfirm.busy || submitting}
        title={submitConfirm.title}
        description={submitConfirm.description}
        confirmLabel={submitConfirm.confirmLabel}
        onConfirm={submitConfirm.confirm}
        onCancel={submitConfirm.cancel}
      />
    </PageLayout>
  );
}
