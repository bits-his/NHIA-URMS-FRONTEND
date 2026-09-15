import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/src/components/PageLayout";

interface SocPlaceholderPageProps {
  title: string;
  onBack?: () => void;
  template?: string;
  frequency?: string;
  linkingDept?: string;
  note?: string;
}

/** Heading-only placeholder for SOC/Zones pages not yet implemented. */
export default function SocPlaceholderPage({
  title, onBack, template, frequency, linkingDept, note,
}: SocPlaceholderPageProps) {
  return (
    <PageLayout
      title={title}
      actions={
        onBack ? (
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        ) : undefined
      }
    >
      <div className="rounded-2xl border border-[#d4e8dc] bg-white p-5 space-y-3 max-w-xl">
        <p className="text-sm text-slate-600">
          {note || "This page is under development. The reporting template will be wired when it is provided."}
        </p>
        {(template || frequency || linkingDept) && (
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            {template && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Template</dt>
                <dd className="font-semibold text-[#145c3f]">{template}</dd>
              </div>
            )}
            {frequency && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Frequency</dt>
                <dd className="font-semibold text-slate-800">{frequency}</dd>
              </div>
            )}
            {linkingDept && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Linking dept / unit</dt>
                <dd className="font-semibold text-slate-800">{linkingDept}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </PageLayout>
  );
}
