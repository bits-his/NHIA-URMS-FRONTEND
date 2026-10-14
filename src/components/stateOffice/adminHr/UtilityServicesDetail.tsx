import * as React from "react";
import { ArrowLeft, Edit2, Printer, Loader2, CheckCircle2, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import { monthLabel } from "../constants";
import { FormPageTitle } from "./ui";
import { normalizePayload } from "./normalizePayload";

interface Props {
  reportId: number;
  onBack: () => void;
  onEdit?: () => void;
}

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    cls: "bg-slate-100 text-slate-700 border-slate-300",
    icon: <FileText className="w-3.5 h-3.5 text-slate-500" />,
  },
  submitted: {
    label: "Submitted",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Clock className="w-3.5 h-3.5 text-blue-600" />,
  },
  approved: {
    label: "Approved",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  },
};

export default function UtilityServicesDetail({ reportId, onBack, onEdit }: Props) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await stateOfficeApi["utility-services"].get(reportId);
        if (!cancelled) {
          const report = res.data;
          setData({ ...report, payload: normalizePayload(report?.payload) });
        }
      } catch (err: any) {
        if (!cancelled) toast.error("Failed to load report", { description: err.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 className="w-7 h-7 animate-spin text-[#145c3f]" />
        <span className="text-sm font-medium">Loading Utility Services Report…</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-24 text-slate-500">
        <p className="text-sm">Report not found.</p>
        <Button variant="outline" size="sm" onClick={onBack} className="mt-3">
          Back
        </Button>
      </div>
    );
  }

  const payload = data.payload || {};
  const rawRows: any[] = payload.rows ?? [];
  const rows = rawRows.map((r, i) => ({
    sn: i + 1,
    serviceLocation: r.serviceLocation || r.location || "State Office",
    serviceCategory: r.serviceCategory || r.utilityCategory || "—",
    contractor: r.contractor || "—",
    amountDue: r.amountDue != null ? Number(r.amountDue) : null,
    paymentRequestRef: r.paymentRequestRef || r.paymentRef || "—",
    remarks: r.remarks || "—",
  }));

  const totalAmount =
    payload.totalAmountDue != null
      ? Number(payload.totalAmountDue)
      : rows.reduce((sum, r) => sum + (r.amountDue || 0), 0);

  const attachments: any[] =
    Array.isArray(payload.attachments) && payload.attachments.length
      ? payload.attachments
      : [
          { id: 1, name: "Duly signed Job Completion Certificate", attached: "No" },
          { id: 2, name: "Firm's Request for Payment", attached: "No" },
          { id: 3, name: "Invoice for Services Rendered", attached: "No" },
        ];

  const preparedBy = payload.preparedBy || data.submitted_by || "—";
  const designation = payload.designation || "—";
  const signatureDate = payload.signatureDate || data.submission_date || data.createdAt || "—";
  const sc = STATUS_CONFIG[data.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;

  return (
    <div className="flex flex-col h-full bg-slate-50/40">
      <div className="print:hidden bg-white border-b border-border/60 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 truncate">
                Utility Services Report
              </h2>
              <Badge
                variant="outline"
                className={`gap-1 text-[11px] font-semibold py-0.5 px-2 border ${sc.cls}`}
              >
                {sc.icon} {sc.label}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Ref:{" "}
              <span className="font-bold text-[#145c3f]">{data.reference_id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 font-semibold text-slate-700 hover:bg-[#e8f5ee]"
          >
            <Printer className="w-4 h-4" /> Print / PDF
          </Button>
          {onEdit && data.status !== "approved" && (
            <Button
              size="sm"
              onClick={onEdit}
              className="gap-1.5 bg-[#145c3f] hover:bg-[#0f3d2e] text-white font-semibold"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 pb-16 space-y-4">
          <FormPageTitle title="Utility Services" />

          <div className="bg-white rounded-2xl border border-[#d4e8dc] shadow-sm p-4 sm:p-6 space-y-6 print:border-none print:shadow-none">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-[#f4f7f5] p-4 rounded-xl border border-[#d4e8dc]">
              {[
                { label: "Zonal Office", value: data.zone?.description || "—" },
                { label: "State Office", value: data.state?.description || "—" },
                { label: "Year", value: data.reporting_year || "—" },
                { label: "Month", value: monthLabel(data.reporting_month) || "—" },
                { label: "Period From", value: payload.periodFrom || "—" },
                { label: "Period To", value: payload.periodTo || "—" },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                    {item.label}
                  </span>
                  <p className="text-xs font-semibold text-slate-800 bg-white p-2 rounded-md border border-[#d4e8dc] truncate">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-[#d4e8dc] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                  <thead>
                    <tr className="bg-[#145c3f] text-white">
                      {[
                        "S/N",
                        "Service Location",
                        "Service Category",
                        "Contractor (State / Zonal Office)",
                        "Amount Due (NGN)",
                        "Payment Request Reference (attach)",
                        "Remarks",
                      ].map((h) => (
                        <th
                          key={h}
                          className="py-3 px-3 font-semibold whitespace-nowrap border-r border-[#1a6b4a] last:border-r-0"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8f5ee] bg-white">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                          No utility service rows entered.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, i) => (
                        <tr key={i} className={i % 2 === 1 ? "bg-[#f4f7f5]/70" : ""}>
                          <td className="py-3 px-3 text-center font-bold text-[#145c3f] border-r border-[#e8f5ee]">
                            {row.sn}
                          </td>
                          <td className="py-3 px-3 font-medium border-r border-[#e8f5ee]">
                            {row.serviceLocation}
                          </td>
                          <td className="py-3 px-3 font-semibold border-r border-[#e8f5ee]">
                            {row.serviceCategory}
                          </td>
                          <td className="py-3 px-3 border-r border-[#e8f5ee]">{row.contractor}</td>
                          <td className="py-3 px-3 text-right font-mono font-semibold border-r border-[#e8f5ee] whitespace-nowrap">
                            {row.amountDue != null
                              ? `₦ ${row.amountDue.toLocaleString("en-NG", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : "—"}
                          </td>
                          <td className="py-3 px-3 border-r border-[#e8f5ee]">
                            {row.paymentRequestRef}
                          </td>
                          <td className="py-3 px-3 text-slate-700">{row.remarks}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#e8f5ee] border-t border-[#d4e8dc] font-bold text-[#0f3d2e]">
                      <td
                        colSpan={4}
                        className="py-2.5 px-4 text-right text-[11px] uppercase tracking-wider"
                      >
                        Total Amount Due (NGN)
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm text-[#145c3f] whitespace-nowrap">
                        ₦{" "}
                        {totalAmount.toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-[11px] font-medium text-slate-500">
                        {rows.length} {rows.length === 1 ? "entry" : "entries"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-[#d4e8dc] overflow-hidden bg-white">
              <div className="px-4 py-2.5 bg-[#e8f5ee] border-b border-[#d4e8dc]">
                <h3 className="text-sm font-bold text-[#145c3f]">
                  Required attachments{" "}
                  <span className="font-normal text-slate-600">
                    (all three documents must accompany the payment request)
                  </span>
                </h3>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#145c3f] text-white">
                    <th className="py-2.5 px-3 font-semibold w-12 text-center">S/N</th>
                    <th className="py-2.5 px-4 font-semibold">Required Attachment</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-28">Attached?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8f5ee]">
                  {attachments.map((att: any, i: number) => {
                    const isAttached = att.attached === "Yes" || att.attached === true;
                    return (
                      <tr key={i} className={i % 2 === 1 ? "bg-[#f4f7f5]/60" : ""}>
                        <td className="py-2.5 px-3 text-center font-bold text-[#145c3f]">
                          {i + 1}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{att.name}</td>
                        <td className="p-2 text-center">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded text-xs font-bold ${
                              isAttached
                                ? "bg-[#e8f5ee] text-[#145c3f]"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {isAttached ? "Yes" : "No"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-[#d4e8dc]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Prepared by", value: preparedBy },
                  { label: "Designation", value: designation },
                  {
                    label: "Date",
                    value: signatureDate ? String(signatureDate).slice(0, 10) : "—",
                  },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                      {item.label}
                    </span>
                    <div className="border-b-2 border-[#d4e8dc] py-1.5 text-sm font-semibold text-slate-900 min-h-[28px]">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
