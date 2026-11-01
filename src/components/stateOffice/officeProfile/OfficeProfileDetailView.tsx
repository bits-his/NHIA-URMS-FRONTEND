import * as React from "react";
import {
  ArrowLeft,
  Pencil,
  Building2,
  Home,
  Wrench,
  Users,
  Download,
  Calendar,
  DollarSign,
  Target,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFileUrl } from "@/lib/api";

interface Props {
  tab: "general" | "accommodation" | "utilities" | "focal_persons";
  data: any;
  onBack: () => void;
  onEdit: () => void;
  canEdit?: boolean;
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="space-y-1 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="text-sm font-medium text-slate-800 break-words">{value}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#d4e8dc] bg-white overflow-hidden shadow-xs">
      <div className="bg-[#e8f5ee] px-4 py-2.5 border-b border-[#d4e8dc]">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function OfficeProfileDetailView({
  tab,
  data,
  onBack,
  onEdit,
  canEdit = true,
}: Props) {
  if (!data) return null;

  const formatCurrency = (val: number | string | null | undefined) => {
    if (val == null || val === "") return "—";
    const n = Number(val);
    return isNaN(n) ? "—" : `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-5">
      {/* Detail View Top Header */}
      <div className="bg-white rounded-lg border border-[#d4e8dc] p-4 shadow-xs flex items-center justify-between gap-3">
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
              <h2 className="text-lg font-bold text-[#0f3d2e] truncate">
                {tab === "general" && `State Office Profile (${data.state?.description || data.state_code || "State"})`}
                {tab === "accommodation" && `Office Accommodation (${data.state?.description || data.state_code || "Premises"})`}
                {tab === "utilities" && `Utility Claim ${data.reference_id || ""}`}
                {tab === "focal_persons" && `Focal Person (${data.officer_name || "Officer"})`}
              </h2>
              {data.status && (
                <Badge className="text-[10px] uppercase font-bold bg-[#e8f5ee] text-[#145c3f] border-[#d4e8dc]">
                  {data.status}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate">
              Reporting Year: {data.reporting_year} • Zone: {data.zone?.description || data.zonal_code || "—"}
            </p>
          </div>
        </div>

        {canEdit && (
          <Button
            onClick={onEdit}
            className="bg-[#0f3d2e] hover:bg-[#145c3f] text-white text-xs h-8 gap-1.5 shadow-sm"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit Information
          </Button>
        )}
      </div>

      {/* Tab 1: General Info View */}
      {tab === "general" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-[#d4e8dc] bg-white p-4 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff Strength</p>
              <p className="text-2xl font-bold text-[#0f3d2e] mt-1">
                {data.staff_members?.length || data.staff_strength || 0}
              </p>
            </div>
            <div className="rounded-lg border border-[#d4e8dc] bg-white p-4 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolment Target</p>
              <p className="text-2xl font-bold text-[#0f3d2e] mt-1">
                {data.enrolment_target ? Number(data.enrolment_target).toLocaleString() : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-[#d4e8dc] bg-white p-4 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Annual Budget</p>
              <p className="text-2xl font-bold text-[#0f3d2e] mt-1">
                {formatCurrency(data.annual_budget)}
              </p>
            </div>
          </div>

          <SectionCard title="State Coordinator & Contact Details">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoItem label="State Coordinator" value={data.coordinator_name} />
              <InfoItem label="Coordinator Phone" value={data.coordinator_phone} />
              <InfoItem label="Coordinator Email" value={data.coordinator_email} />
              <InfoItem label="Office Address" value={data.office_address} />
              <InfoItem label="Official Email" value={data.office_email} />
              <InfoItem
                label="Annual Operational Plan (AOP)"
                value={
                  data.aop_file_path ? (
                    <a
                      href={apiFileUrl(data.aop_file_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#145c3f] hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" /> Download AOP ({data.aop_original_name || "Document"})
                    </a>
                  ) : (
                    "Not Uploaded"
                  )
                }
              />
            </div>
          </SectionCard>

          {data.staff_members && data.staff_members.length > 0 && (
            <SectionCard title={`Staff Nominal Roll (${data.staff_members.length} members)`}>
              <Table>
                <TableHeader className="bg-[#f4f7f5]">
                  <TableRow className="border-b border-[#d4e8dc]">
                    <TableHead className="text-[11px] font-bold uppercase text-slate-600">#</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-slate-600">Officer Name</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-slate-600">File Number</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-slate-600">Email</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-slate-600">Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.staff_members.map((m: any, idx: number) => (
                    <TableRow key={idx} className="border-b border-slate-100">
                      <TableCell className="text-xs font-semibold text-slate-400">{idx + 1}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-800">{m.name}</TableCell>
                      <TableCell className="text-xs text-slate-600">{m.file_number || "—"}</TableCell>
                      <TableCell className="text-xs text-slate-600">{m.email || "—"}</TableCell>
                      <TableCell className="text-xs text-slate-600">{m.unit || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>
          )}
        </div>
      )}

      {/* Tab 2: Accommodation View */}
      {tab === "accommodation" && (
        <div className="space-y-4">
          <SectionCard title="Premises & Lease Information">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <InfoItem label="Ownership Status" value={data.ownership_status} />
              <InfoItem label="Current Condition" value={data.current_condition} />
              <InfoItem label="Annual Rent Amount" value={formatCurrency(data.rent_amount)} />
              <InfoItem label="Rent Expiry Date" value={data.rent_expiry_date || "N/A"} />
            </div>
          </SectionCard>

          <SectionCard title="Defects, Structural Needs & Remarks">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem label="Defect / Repair Description" value={data.issue_description || "No structural defects recorded."} />
              <InfoItem label="General Remarks" value={data.remarks || "No additional remarks."} />
            </div>
          </SectionCard>
        </div>
      )}

      {/* Tab 3: Utility View */}
      {tab === "utilities" && (
        <div className="space-y-4">
          <SectionCard title="Utility Service Details">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <InfoItem label="Reference ID" value={data.reference_id} />
              <InfoItem label="Service Category" value={data.service_category?.toUpperCase()} />
              <InfoItem
                label="Period / Cycle"
                value={
                  data.service_category === "generator"
                    ? `Biannual Cycle ${data.cycle || 1}`
                    : `Month ${data.reporting_month}`
                }
              />
              <InfoItem label="Amount Claimed" value={formatCurrency(data.amount_claimed)} />
              <InfoItem label="Contractor Name" value={data.contractor_name} />
              <InfoItem label="Contractor Phone" value={data.contractor_phone} />
              <InfoItem label="Invoice Number" value={data.invoice_number} />
              <InfoItem label="Consolidation Batch ID" value={data.consolidated_batch_id || "Unconsolidated"} />
            </div>
          </SectionCard>

          <SectionCard title="3 Mandatory Verification Documents (Slide 4)">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-[#d4e8dc] bg-[#f4f7f5] space-y-1">
                <p className="text-[11px] font-bold text-slate-700">1. Job Completion Certificate</p>
                {data.job_completion_cert_path ? (
                  <a
                    href={apiFileUrl(data.job_completion_cert_path)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#145c3f] hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Certificate
                  </a>
                ) : (
                  <p className="text-xs text-slate-400">Not Uploaded</p>
                )}
              </div>

              <div className="p-3 rounded-lg border border-[#d4e8dc] bg-[#f4f7f5] space-y-1">
                <p className="text-[11px] font-bold text-slate-700">2. Signed Invoice / Bill</p>
                {data.invoice_path ? (
                  <a
                    href={apiFileUrl(data.invoice_path)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#145c3f] hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Invoice
                  </a>
                ) : (
                  <p className="text-xs text-slate-400">Not Uploaded</p>
                )}
              </div>

              <div className="p-3 rounded-lg border border-[#d4e8dc] bg-[#f4f7f5] space-y-1">
                <p className="text-[11px] font-bold text-slate-700">3. Contractor Request Letter</p>
                {data.contractor_letter_path ? (
                  <a
                    href={apiFileUrl(data.contractor_letter_path)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#145c3f] hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Letter
                  </a>
                ) : (
                  <p className="text-xs text-slate-400">Not Uploaded</p>
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Tab 4: Focal Person View */}
      {tab === "focal_persons" && (
        <div className="space-y-4">
          <SectionCard title="Designated Officer Details">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoItem label="Officer Name" value={data.officer_name} />
              <InfoItem label="Functional Domain" value={data.domain} />
              <InfoItem label="Official Designation" value={data.designation} />
              <InfoItem label="Email" value={data.email} />
              <InfoItem label="Phone" value={data.phone} />
              <InfoItem label="Reporting Year" value={data.reporting_year} />
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

