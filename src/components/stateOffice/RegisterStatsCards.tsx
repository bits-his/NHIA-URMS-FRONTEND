import * as React from "react";

export type RegisterStat = {
  label: string;
  value: React.ReactNode;
  tone: string;
};

/** Stakeholder-style summary cards used above register tables. */
export function RegisterStatsCards({
  stats,
  loading = false,
  className = "grid grid-cols-2 md:grid-cols-5 gap-3",
}: {
  stats: RegisterStat[];
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {stats.map((c) => (
        <div key={c.label} className={`rounded-xl border px-4 py-3 ${c.tone}`}>
          <p className="text-2xl font-bold tabular-nums">{loading ? "—" : c.value}</p>
          <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

const WORKFLOW_TONES = {
  total: "text-[#0f3d2e] bg-white border-[#d4e8dc]",
  draft: "text-slate-600 bg-white border-slate-200",
  awaiting: "text-amber-800 bg-amber-50/80 border-amber-100",
  endorsed: "text-teal-800 bg-teal-50/80 border-teal-100",
  submitted: "text-emerald-700 bg-emerald-50/80 border-emerald-100",
} as const;

/** Draft/Returned · Awaiting · Endorsed · Submitted workflow counts. */
export function workflowRegisterStats(rows: Array<{ status?: string | null }>): RegisterStat[] {
  const statusOf = (row: { status?: string | null }) =>
    row.status === "approved" ? "submitted" : (row.status || "draft");

  return [
    { label: "Total", value: rows.length, tone: WORKFLOW_TONES.total },
    {
      label: "Draft / Returned",
      value: rows.filter((r) => ["draft", "returned"].includes(statusOf(r))).length,
      tone: WORKFLOW_TONES.draft,
    },
    {
      label: "Awaiting review",
      value: rows.filter((r) => statusOf(r) === "awaiting_review").length,
      tone: WORKFLOW_TONES.awaiting,
    },
    {
      label: "Endorsed",
      value: rows.filter((r) => statusOf(r) === "endorsed").length,
      tone: WORKFLOW_TONES.endorsed,
    },
    {
      label: "Submitted",
      value: rows.filter((r) => statusOf(r) === "submitted").length,
      tone: WORKFLOW_TONES.submitted,
    },
  ];
}
