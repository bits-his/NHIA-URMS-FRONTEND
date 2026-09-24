import * as React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const CONFIRM_ROLES = new Set(["reporting-officer"]);

export function useReportingOfficerSubmitConfirm() {
  const role = useSelector((s: RootState) => s.auth.user?.role ?? "");
  const needsConfirm = CONFIRM_ROLES.has(role);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const pendingRef = React.useRef<(() => void | Promise<void>) | null>(null);

  const requestSubmit = React.useCallback((action: () => void | Promise<void>) => {
    if (!needsConfirm) {
      void action();
      return;
    }
    pendingRef.current = action;
    setOpen(true);
  }, [needsConfirm]);

  const cancel = React.useCallback(() => {
    if (busy) return;
    setOpen(false);
    pendingRef.current = null;
  }, [busy]);

  const confirm = React.useCallback(async () => {
    const action = pendingRef.current;
    pendingRef.current = null;
    setBusy(true);
    try {
      await action?.();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }, []);

  return { open, busy, needsConfirm, requestSubmit, confirm, cancel };
}

type ModalProps = {
  open: boolean;
  busy?: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirmation dialog shown before Reporting Officer submits a form. */
export function SubmitConfirmModal({
  open,
  busy = false,
  title = "Confirm submission",
  description = "Please confirm you want to submit this record. You will not be able to edit it after submission in most workflows.",
  confirmLabel = "Yes, submit",
  onConfirm,
  onCancel,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={busy ? undefined : onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-confirm-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-[#d4e8dc] bg-white p-5 shadow-xl"
      >
        <h3 id="submit-confirm-title" className="text-base font-bold text-slate-900">
          {title}
        </h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-orange-action hover:bg-orange-600 gap-2"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {busy ? "Submitting…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
