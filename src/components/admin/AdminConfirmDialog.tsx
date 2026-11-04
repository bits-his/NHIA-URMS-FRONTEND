import * as React from "react";
import { AlertTriangle, Trash2, UserX, UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface AdminConfirmDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "success";
  loading?: boolean;
}

export default function AdminConfirmDialog({
  open,
  onOpenChange,
  onClose,
  onConfirm,
  title = "Confirm Action",
  description,
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}: AdminConfirmDialogProps) {
  const handleOpenChange = (isOpen: boolean) => {
    if (onOpenChange) onOpenChange(isOpen);
    if (!isOpen) onClose();
  };

  const isDanger = variant === "danger";
  const isWarning = variant === "warning";
  const isSuccess = variant === "success";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-md border border-[#d4e8dc] p-5 bg-white shadow-xl">
        <div className="flex items-start gap-3.5">
          <div
            className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
              isDanger
                ? "bg-rose-50 text-rose-600 border border-rose-200"
                : isWarning
                ? "bg-amber-50 text-amber-600 border border-amber-200"
                : "bg-emerald-50 text-emerald-600 border border-emerald-200"
            }`}
          >
            {isDanger && <Trash2 className="size-5" />}
            {isWarning && <AlertTriangle className="size-5" />}
            {isSuccess && <UserCheck className="size-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <DialogHeader className="p-0 text-left">
              <DialogTitle className="text-sm font-bold text-slate-900">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 mt-1 leading-relaxed">
                {description}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <DialogFooter className="p-0 pt-4 mt-2 flex items-center justify-end gap-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
            className="h-8 text-xs rounded-sm border-[#d4e8dc] text-slate-600 px-3 cursor-pointer"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className={`h-8 text-xs font-semibold rounded-sm px-3.5 cursor-pointer shadow-2xs ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : isWarning
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-[#145c3f] hover:bg-[#0f442e] text-white"
            }`}
          >
            {loading ? "Processing..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
