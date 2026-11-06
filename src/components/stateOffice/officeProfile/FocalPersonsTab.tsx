import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Users,
  Plus,
  Save,
  Trash2,
  Pencil,
  ArrowLeft,
  CheckCircle2,
  Mail,
  Phone,
  Building2,
  Briefcase,
  MoreHorizontal,
  Eye,
  Loader2,
  MapPin,
  Calendar,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const inputClass = "h-10 text-sm font-medium bg-[#f4f7f5] border-2 border-[#1a7a52] rounded-sm px-3.5 shadow-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#1a7a52]/20";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { stateZonalFocalPersonApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../../monthly/reportingYears";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import {
  SolvixStatusPill,
} from "@/components/common/SolvixStatCards";

export const FOCAL_DOMAINS = [
  "ICT",
  "SERVICOM",
  "Quality Assurance",
  "Enrolment",
  "Claims & Payments",
  "Enforcement & Compliance",
  "Legal Services",
  "Media & Public Relations",
  "Internal Audit",
  "Procurement",
  "Gender & Vulnerable Groups",
  "Human Resources",
  "Store & Logistics",
  "Planning Cell / M&E",
  "Complaints Desk",
  "Finance & Accounts",
] as const;

interface Props {
  stateId: string;
  zoneId: string;
  year: number;
  readOnly?: boolean;
  initialEditingId?: number | null;
  onBack?: () => void;
  onSaved?: () => void;
  isStandaloneForm?: boolean;
  onModeChange?: (mode: "list" | "view" | "edit" | "new", id?: number | null) => void;
}

export type FocalPersonRow = {
  id?: number;
  state_id?: string | number;
  zone_id?: string | number;
  reporting_year: number;
  domain: string;
  officer_name: string;
  designation: string;
  email: string | null;
  phone: string | null;
  state?: { id: number; description: string; code?: string };
  zone?: { id: number; description: string; zonal_code?: string };
  created_at?: string;
  updated_at?: string;
};

export default function FocalPersonsTab({
  stateId: initialPropStateId,
  zoneId: initialPropZoneId,
  year: initialPropYear,
  readOnly = false,
  initialEditingId = null,
  onBack,
  onSaved,
  isStandaloneForm = false,
  onModeChange,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [records, setRecords] = React.useState<FocalPersonRow[]>([]);

  // Sub-view mode inside component: "table" | "form" | "view"
  const [viewMode, setViewMode] = React.useState<"table" | "form" | "view">(
    isStandaloneForm ? "form" : "table"
  );
  const [editingId, setEditingId] = React.useState<number | null>(initialEditingId);
  const [viewingRecord, setViewingRecord] = React.useState<FocalPersonRow | null>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [domainFilter, setDomainFilter] = React.useState<string>("all");
  const [currentSort, setCurrentSort] = React.useState<string>("newest");

  // Geo options
  const [states, setStates] = React.useState<any[]>([]);
  const [zones, setZones] = React.useState<any[]>([]);

  // Top control fields
  const [currentYear, setCurrentYear] = React.useState<number>(
    initialPropYear || new Date().getFullYear()
  );
  const [currentStateId, setCurrentStateId] = React.useState<string>(initialPropStateId || "");
  const [currentZoneId, setCurrentZoneId] = React.useState<string>(initialPropZoneId || "");

  // Form input fields
  const [domain, setDomain] = React.useState<string>("ICT");
  const [officerName, setOfficerName] = React.useState<string>("");
  const [designation, setDesignation] = React.useState<string>("");
  const [email, setEmail] = React.useState<string>("");
  const [phoneNumber, setPhoneNumber] = React.useState<string>("");

  const yearOptions = buildReportingYearOptions();

  // Load Geo
  React.useEffect(() => {
    Promise.all([
      stockApi.getStates().catch(() => ({ success: true, data: [] })),
      stockApi.getZones().catch(() => ({ success: true, data: [] })),
    ]).then(([stRes, znRes]) => {
      setStates(stRes.data || []);
      setZones(znRes.data || []);
    });
  }, []);

  // Sync selected state and zone
  const selectedState = React.useMemo(() => {
    return states.find(
      (s) => String(s.id) === String(currentStateId) || s.code === currentStateId
    );
  }, [states, currentStateId]);

  const selectedZone = React.useMemo(() => {
    if (selectedState?.zonal_id) {
      return zones.find(
        (z) => z.id === selectedState.zonal_id || z.zonal_code === selectedState.zonal_id
      );
    }
    if (currentZoneId) {
      return zones.find(
        (z) => String(z.id) === String(currentZoneId) || z.zonal_code === currentZoneId
      );
    }
    return null;
  }, [selectedState, currentZoneId, zones]);

  // Filter states by selected zone
  const availableStates = React.useMemo(() => {
    if (!currentZoneId || currentZoneId === "all") return states;
    return states.filter(
      (s) => String(s.zonal_id) === String(currentZoneId) || s.zonal_code === currentZoneId
    );
  }, [states, currentZoneId]);

  // Handle Zone selection: filter states and auto-align selected state
  const handleZoneChange = (zoneVal: string) => {
    const nextZoneId = zoneVal === "all" ? "" : zoneVal;
    setCurrentZoneId(nextZoneId);

    if (nextZoneId) {
      const statesInZone = states.filter(
        (s) => String(s.zonal_id) === String(nextZoneId) || s.zonal_code === nextZoneId
      );
      const isCurrentStateInZone = statesInZone.some(
        (s) => String(s.id) === String(currentStateId) || s.code === currentStateId
      );
      if (!isCurrentStateInZone) {
        setCurrentStateId(statesInZone[0] ? String(statesInZone[0].id) : "");
      }
    }
  };

  // Handle State selection
  const handleStateChange = (stateVal: string) => {
    const nextState = stateVal === "all" ? "" : stateVal;
    setCurrentStateId(nextState);
    if (nextState) {
      const st = states.find((s) => String(s.id) === String(nextState) || s.code === nextState);
      if (st?.zonal_id) {
        setCurrentZoneId(String(st.zonal_id));
      }
    }
  };

  // Load existing records
  const loadRecords = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await stateZonalFocalPersonApi.list({
        state_id: currentStateId || undefined,
        year: currentYear ? String(currentYear) : undefined,
      });
      if (res.success && res.data) {
        setRecords(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load focal persons", err);
    } finally {
      setLoading(false);
    }
  }, [currentStateId, currentYear]);

  React.useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Sync viewMode and editing data when parent changes isStandaloneForm or initialEditingId
  React.useEffect(() => {
    if (isStandaloneForm) {
      setViewMode("form");
      if (initialEditingId && records.length > 0) {
        const found = records.find((r) => r.id === initialEditingId);
        if (found) {
          setEditingId(found.id || null);
          setDomain(found.domain || "ICT");
          setOfficerName(found.officer_name || "");
          setDesignation(found.designation || "");
          setEmail(found.email || "");
          setPhoneNumber(found.phone || "");
          if (found.state_id) setCurrentStateId(String(found.state_id));
          if (found.reporting_year) setCurrentYear(Number(found.reporting_year));
        }
      } else if (!initialEditingId) {
        setEditingId(null);
        setDomain("ICT");
        setOfficerName("");
        setDesignation("");
        setEmail("");
        setPhoneNumber("");
      }
    } else {
      if (viewMode === "form") {
        setViewMode("table");
      }
    }
  }, [isStandaloneForm, initialEditingId, records]);

  // Keep stateId and year in sync with props
  React.useEffect(() => {
    if (initialPropStateId) setCurrentStateId(initialPropStateId);
  }, [initialPropStateId]);

  React.useEffect(() => {
    if (initialPropZoneId) setCurrentZoneId(initialPropZoneId);
  }, [initialPropZoneId]);

  React.useEffect(() => {
    if (initialPropYear) setCurrentYear(initialPropYear);
  }, [initialPropYear]);

  // Start Create (On-page form, NO modal, NO sheet)
  const handleStartCreate = () => {
    setEditingId(null);
    setDomain("ICT");
    setOfficerName("");
    setDesignation("");
    setEmail("");
    setPhoneNumber("");
    setViewMode("form");
    onModeChange?.("new", null);
  };

  // Start Edit (On-page form, NO modal, NO sheet)
  const handleStartEdit = (row: FocalPersonRow) => {
    setEditingId(row.id || null);
    setDomain(row.domain || "ICT");
    setOfficerName(row.officer_name || "");
    setDesignation(row.designation || "");
    setEmail(row.email || "");
    setPhoneNumber(row.phone || "");
    if (row.state_id) setCurrentStateId(String(row.state_id));
    if (row.reporting_year) setCurrentYear(Number(row.reporting_year));
    setViewMode("form");
    onModeChange?.("edit", row.id || null);
  };

  // Start View (On-page detail view)
  const handleStartView = (row: FocalPersonRow) => {
    setViewingRecord(row);
    setViewMode("view");
    onModeChange?.("view", row.id || null);
  };

  // Cancel back to table
  const handleCancelForm = () => {
    if (isStandaloneForm && onBack) {
      onBack();
      return;
    }
    setEditingId(null);
    setViewMode("table");
    onModeChange?.("list", null);
  };

  // Save / Add Officer to Register
  const handleSaveOfficer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!currentStateId) {
      toast.error("Please select a State Office");
      return;
    }
    if (!officerName.trim()) {
      toast.error("Please enter Name of Officer");
      return;
    }
    if (!designation.trim()) {
      toast.error("Please enter Designation");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        state_id: currentStateId,
        zone_id: currentZoneId || selectedZone?.id || selectedZone?.zonal_code,
        reporting_year: Number(currentYear),
        domain,
        officer_name: officerName.trim(),
        designation: designation.trim(),
        email: email.trim() || null,
        phone: phoneNumber.trim() || null,
      };

      if (editingId) {
        await stateZonalFocalPersonApi.update(editingId, payload);
        toast.success("Officer record updated successfully");
      } else {
        await stateZonalFocalPersonApi.create(payload);
        toast.success("Officer appointed to register successfully");
      }

      await loadRecords();
      if (onSaved) onSaved();

      if (isStandaloneForm && onBack) {
        onBack();
      } else {
        setViewMode("table");
        onModeChange?.("list", null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save officer record");
    } finally {
      setSaving(false);
    }
  };

  // Delete Officer
  const handleDeleteOfficer = async (id?: number) => {
    if (!id) return;
    if (!confirm("Are you sure you want to remove this focal person from the register?")) return;
    try {
      await stateZonalFocalPersonApi.delete(id);
      toast.success("Officer removed from register");
      await loadRecords();
      if (viewMode === "view") {
        setViewMode("table");
        onModeChange?.("list", null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to remove officer");
    }
  };

  // Filtered dataset
  const filteredRecords = React.useMemo(() => {
    return records.filter((r) => {
      // Domain filter
      if (domainFilter !== "all" && r.domain !== domainFilter) return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = r.officer_name?.toLowerCase() || "";
      const dom = r.domain?.toLowerCase() || "";
      const des = r.designation?.toLowerCase() || "";
      const em = r.email?.toLowerCase() || "";
      const ph = r.phone?.toLowerCase() || "";
      const st = r.state?.description?.toLowerCase() || "";

      return (
        name.includes(q) ||
        dom.includes(q) ||
        des.includes(q) ||
        em.includes(q) ||
        ph.includes(q) ||
        st.includes(q)
      );
    });
  }, [records, domainFilter, searchQuery]);

  // TanStack Column Definitions matching Solvix Table
  const columns: ColumnDef<FocalPersonRow>[] = [
    {
      id: "code",
      header: "Officer ID",
      cell: ({ row }) => (
        <span className="font-mono text-slate-400 text-[11px] font-medium">
          #{String(row.original.id || row.index + 1).padStart(4, "0")}
        </span>
      ),
      size: 80,
    },
    {
      accessorKey: "officer_name",
      header: "Officer Name",
      cell: ({ row }) => {
        const name = row.original.officer_name;
        const initials = name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();

        return (
          <div className="flex items-center gap-2.5">
            <div className="size-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
              {initials}
            </div>
            <span className="font-semibold text-slate-900 hover:text-[#1a7a52] transition-colors">
              {name}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "domain",
      header: "Domain",
      cell: ({ row }) => (
        <span className="text-slate-600 font-medium">
          {row.original.domain}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const hasEmail = !!row.original.email;
        const hasPhone = !!row.original.phone;

        if (hasEmail && hasPhone) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Verified
            </span>
          );
        }
        if (hasEmail || hasPhone) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              <span className="size-1.5 rounded-full bg-sky-500" />
              Active
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="size-1.5 rounded-full bg-amber-500" />
            Pending Info
          </span>
        );
      },
    },
    {
      accessorKey: "reporting_year",
      header: "Date / Cycle",
      cell: ({ row }) => (
        <span className="text-slate-500 font-medium text-[11px]">
          {row.original.reporting_year}
        </span>
      ),
    },
    {
      id: "contact",
      header: "Official Contact",
      cell: ({ row }) => (
        <span className="font-bold text-slate-900 text-xs">
          {row.original.email || row.original.phone || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <div
          className="flex items-center justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStartView(row.original)}
            className="h-7 px-2.5 text-xs font-semibold text-[#1a7a52] hover:text-[#145c3f] hover:bg-[#1a7a52]/10 rounded-sm gap-1"
          >
            <Eye className="size-3.5" />
            <span>View</span>
          </Button>
        </div>
      ),
    },
  ];

  /* =========================================================================
     VIEW MODE 1: ON-PAGE FORM (1 CARD, ZONE FIRST AS SELECT, STATE FILTERED)
     ========================================================================= */
  if (viewMode === "form") {
    const previewInitials = officerName
      ? officerName
          .split(" ")
          .map((n) => n[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "?";

    const hasEmail = Boolean(email && email.includes("@"));
    const hasPhone = Boolean(phoneNumber && phoneNumber.trim().length >= 6);

    return (
      <div className="w-full space-y-4 animate-in fade-in-50 duration-200">
        {/* ONE SINGLE CARD FOR FOCAL PERSON FORM */}
        <Card className="rounded-sm border-slate-200/80 shadow-2xs bg-white">
          <CardContent className="space-y-5 pt-6">
            {/* 1. JURISDICTION & SCOPE: ZONE FIRST (SELECT), THEN STATE (SELECT FROM ZONE), YEAR, DOMAIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* ZONE SELECT FIRST */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Zonal Office <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={currentZoneId ? String(currentZoneId) : ""}
                  onValueChange={handleZoneChange}
                  disabled={readOnly}
                >
                  <SelectTrigger
                    displayValue={selectedZone?.description || (currentZoneId ? `Zone ${currentZoneId}` : undefined)}
                  >
                    <SelectValue placeholder="Select Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={String(z.id)}>
                        {z.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* STATE SELECT SECOND (FILTERED BY ZONE) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  State Office <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={currentStateId ? String(currentStateId) : ""}
                  onValueChange={handleStateChange}
                  disabled={readOnly}
                >
                  <SelectTrigger
                    displayValue={selectedState?.description || (currentStateId ? `State Office` : undefined)}
                  >
                    <SelectValue placeholder={currentZoneId ? "Select state in zone" : "Select zone first or state"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStates.map((st) => (
                      <SelectItem key={st.id} value={String(st.id)}>
                        {st.description} {st.code ? `(${st.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* REPORTING YEAR */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Reporting Year <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={currentYear ? String(currentYear) : ""}
                  onValueChange={(val) => setCurrentYear(Number(val))}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reporting year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt} Cycle
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* FUNCTIONAL DOMAIN */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Functional Domain <span className="text-rose-500">*</span>
                </Label>
                <Select value={domain} onValueChange={setDomain} disabled={readOnly}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOCAL_DOMAINS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 2. LIVE OFFICER PROFILE PREVIEW BANNER */}
            <div className="p-3.5 rounded-sm bg-gradient-to-r from-slate-50 to-slate-100/80 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-full bg-[#1a7a52] text-white flex items-center justify-center text-sm font-bold shadow-xs">
                  {previewInitials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 leading-tight">
                      {officerName.trim() || "Officer Full Name"}
                    </p>
                    <span className="px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-white border border-slate-200 text-[#1a7a52]">
                      {domain}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {designation.trim() || "Official Designation / Role"} • {selectedState?.description || "State Office"} {selectedZone ? `(${selectedZone.description})` : ""}
                  </p>
                </div>
              </div>
              <div>
                {hasEmail && hasPhone ? (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="size-3 text-emerald-600" /> Fully Verified
                  </span>
                ) : hasEmail || hasPhone ? (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                    Active Reach
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    Pending Contact
                  </span>
                )}
              </div>
            </div>

            {/* 3. OFFICER DETAILS & OFFICIAL CONTACT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Full Name of Officer <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder="e.g. Dr. Aminu Bello"
                  disabled={readOnly}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Official Designation / Title <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Senior ICT Officer / Focal Officer"
                  disabled={readOnly}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Official Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#1a7a52]" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@nhia.gov.ng"
                    disabled={readOnly}
                    className={cn(inputClass, "pl-10")}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Official Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#1a7a52]" />
                  <Input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0803 000 0000"
                    disabled={readOnly}
                    className={cn(inputClass, "pl-10")}
                  />
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-5 rounded-b-sm">
            <span className="text-[11px] text-slate-400 text-center sm:text-left">
              Fields marked with (<span className="text-rose-500">*</span>) are mandatory for directory registration.
            </span>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelForm}
                className="h-8 text-xs border-slate-200 text-slate-700 rounded-sm"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveOfficer()}
                disabled={saving || readOnly}
                className="h-8.5 text-xs bg-[#1a7a52] hover:bg-[#145c3f] text-white font-bold rounded-sm gap-1.5 shadow-xs border border-[#145c3f]"
              >
                {saving ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : editingId ? (
                  <Save className="size-3.5" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                {editingId ? "Update Officer" : "Appoint Officer"}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  /* =========================================================================
     VIEW MODE 2: ON-PAGE DETAIL VIEW (NO MODALS, NO SHEETS)
     ========================================================================= */
  if (viewMode === "view" && viewingRecord) {
    const name = viewingRecord.officer_name;
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return (
      <div className="w-full space-y-4 animate-in fade-in-50 duration-200">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-sm border border-slate-200/80 shadow-2xs">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (isStandaloneForm && onBack) onBack();
              else setViewMode("table");
            }}
            className="gap-1.5 h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 rounded-sm font-medium"
          >
            <ArrowLeft className="size-3.5" /> Back to Register
          </Button>

          {!readOnly && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleStartEdit(viewingRecord)}
                className="gap-1.5 h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 rounded-sm font-medium"
              >
                <Pencil className="size-3.5 text-slate-500" /> Edit Officer
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteOfficer(viewingRecord.id)}
                className="gap-1.5 h-8 text-xs text-rose-600 hover:bg-rose-50 rounded-sm"
              >
                <Trash2 className="size-3.5" /> Remove
              </Button>
            </div>
          )}
        </div>

        {/* Executive Profile Card */}
        <Card className="rounded-sm border-slate-200/80 shadow-2xs overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-[#145c3f] to-[#1a7a52] p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-lg font-bold">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg font-bold">{name}</h1>
                  <Badge
                    variant="outline"
                    className="text-xs border-white/30 text-white bg-white/10 rounded-sm font-semibold"
                  >
                    {viewingRecord.domain}
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {viewingRecord.designation} • {viewingRecord.state?.description || "State Office"}
                </p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Reporting Cycle</p>
              <p className="text-base font-bold tabular-nums">{viewingRecord.reporting_year}</p>
            </div>
          </div>

          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Official Email
              </p>
              <p className="text-sm font-medium text-slate-800">
                {viewingRecord.email || "Not specified"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Official Phone
              </p>
              <p className="text-sm font-medium text-slate-800">
                {viewingRecord.phone || "Not specified"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                State / Zonal Allocation
              </p>
              <p className="text-sm font-medium text-slate-800">
                {viewingRecord.state?.description || "—"} ({viewingRecord.zone?.description || "Zone"})
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* =========================================================================
     VIEW MODE 3: SOLVIX DASHBOARD VIEW (STAT CARDS + INLINE FILTERS + TABLE)
     ========================================================================= */

  const activeFilterCount =
    (currentStateId ? 1 : 0) + (domainFilter !== "all" ? 1 : 0);

  return (
    <div className="w-full space-y-3.5 animate-in fade-in-50 duration-200">
      <Card className="rounded-sm border border-[#d4e8dc] py-0 gap-0 shadow-2xs bg-white">
        <CardContent className="py-1.5 px-3 space-y-1.5">
          <div className="grid grid-flow-col auto-cols-fr gap-2.5 items-end">
            <div className="space-y-0.5 min-w-0">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">State</Label>
              <Select
                value={currentStateId ? String(currentStateId) : "all"}
                onValueChange={handleStateChange}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full"
                  displayValue={
                    !currentStateId
                      ? "All States"
                      : states.find((st) => String(st.id) === String(currentStateId))?.description || "State"
                  }
                >
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {states.map((st) => (
                    <SelectItem key={st.id} value={String(st.id)}>
                      {st.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5 min-w-0">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Domain</Label>
              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger
                  size="sm"
                  className="w-full"
                  displayValue={
                    domainFilter === "all"
                      ? `All Domains (${records.length})`
                      : domainFilter
                  }
                >
                  <SelectValue placeholder="Domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains ({records.length})</SelectItem>
                  {FOCAL_DOMAINS.map((d) => {
                    const count = records.filter((r) => r.domain === d).length;
                    return (
                      <SelectItem key={d} value={d}>
                        {d}{count > 0 ? ` (${count})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5 min-w-0">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Year</Label>
              <Select
                value={currentYear ? String(currentYear) : ""}
                onValueChange={(v) => setCurrentYear(Number(v))}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full"
                  displayValue={currentYear ? String(currentYear) : "Year"}
                >
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="flex justify-end pt-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-slate-500 gap-1 shrink-0"
                onClick={() => {
                  setCurrentStateId("");
                  setDomainFilter("all");
                }}
              >
                <XCircle className="w-3.5 h-3.5" /> Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Solvix Unified Table Card (Less rounded, no duplicate button) */}
      <ShadcnDataTable
        title="FOCAL PERSONS REGISTER"
        infoTooltip="State-level designated officers aligned to official NHIA reporting domains."
        columns={columns}
        data={filteredRecords}
        loading={loading}
        searchPlaceholder="Search officers, domains..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onRowClick={handleStartView}
        emptyMessage="No focal persons appointed matching your filters."
        pageSize={50}
        enableSelection={false}
        showTableOptions={false}
      />
    </div>
  );
}
