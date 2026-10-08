import * as React from "react";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  title: string;
  note?: string;
  onBack: () => void;
}

/** Placeholder for state-office pillar items without an Activity Reporting template yet. */
export default function TemplateComingSoonPage({ title, note, onBack }: Props) {
  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center gap-3 sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold tracking-tight truncate">{title}</h2>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full rounded-2xl border-[#d4e8dc]">
          <CardContent className="pt-8 pb-8 px-6 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#e8f5ee] flex items-center justify-center">
              <Clock className="w-6 h-6 text-[#145c3f]" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Coming soon</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {note || "Template not provided for this activity yet."}
            </p>
            <Button variant="outline" onClick={onBack} className="mt-2">
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
