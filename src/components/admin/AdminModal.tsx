import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}

export default function AdminModal({
  title,
  description,
  open,
  onClose,
  children,
  width = "max-w-lg",
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className={cn(
          "w-full p-0 rounded-md border border-[#d4e8dc] bg-white shadow-xl overflow-hidden flex flex-col max-h-[90vh]",
          width
        )}
      >
        <DialogHeader className="px-5 py-3.5 border-b border-[#e8f5ee] bg-[#f8fbf9] shrink-0 text-left pr-12">
          <DialogTitle className="text-sm font-bold text-slate-900 tracking-tight">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              {description}
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              {title}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
