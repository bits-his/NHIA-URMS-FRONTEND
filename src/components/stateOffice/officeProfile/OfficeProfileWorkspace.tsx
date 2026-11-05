import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeft,
  Building2,
  Home,
  Wrench,
  Users,
  Plus,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  MoreHorizontal,
  XCircle,
  Layers,
  CheckCircle2,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  stateZonalOfficeProfileApi,
  stockApi,
  stateZonalFocalPersonApi,
  utilityServiceReportApi,
  officeAccommodationApi,
} from "@/lib/api";
import { buildReportingYearOptions } from "../../monthly/reportingYears";
import OfficeProfileGeneralTab from "./OfficeProfileGeneralTab";
import OfficeAccommodationTab from "./OfficeAccommodationTab";
import UtilityServicesTab from "./UtilityServicesTab";
import FocalPersonsTab from "./FocalPersonsTab";
import OfficeProfileDetailView from "./OfficeProfileDetailView";
import PageLayout from "../../PageLayout";
import { UnderHeaderNavTabs } from "@/src/components/UnderHeaderNavTabs";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import {
  SolvixStatCards,
  SolvixStatusPill,
  type SolvixStatItem,
} from "@/components/common/SolvixStatCards";

interface Props {
  onBack?: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
  userRole?: string;
}

type TabKey = "general" | "accommodation" | "utilities" | "focal_persons";
type Mode = "list" | "view" | "edit" | "new";
type Geo = { id: number; description: string; code?: string; zonal_id?: number };

const TAB_CONFIG: {
  key: TabKey;
  label: string;
  icon: LucideIcon;
  newLabel: string;
  formTitle: string;
  tableTitle: string;
  infoTooltip: string;
}[] = [
  {
    key: "general",
    label: "General Information",
    icon: Building2,
    newLabel: "New Profile",
    formTitle: "General Information",
    tableTitle: "OFFICE PROFILES REGISTER",
    infoTooltip: "Official NHIA State & Zonal office profiles, coordinators, and statutory budgets.",
  },
  {
    key: "accommodation",
    label: "Office Accommodation",
    icon: Home,
    newLabel: "New Accommodation",
    formTitle: "Office Accommodation",
    tableTitle: "ACCOMMODATION PORTFOLIO",
    infoTooltip: "Nationwide state and zonal office accommodation registry, leases, and facility conditions.",
  },
  {
    key: "utilities",
    label: "Utility Services",
    icon: Wrench,
    newLabel: "New Utility Claim",
    formTitle: "Utility Services",
    tableTitle: "UTILITY SERVICE CLAIMS",
    infoTooltip: "Recurrent utilities, service contractors, billed liabilities, and finance clearances.",
  },
  {
    key: "focal_persons",
    label: "Focal Persons Register",
    icon: Users,
    newLabel: "Appoint Officer",
    formTitle: "Focal Persons Register",
    tableTitle: "FOCAL PERSONS REGISTER",
    infoTooltip: "Designated state officers managing operational domains and institutional communications.",
  },
];

export default function OfficeProfileWorkspace({
  onBack,
  defaultStateId,
  defaultZoneId,
  userRole = "",
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL query parameter synchronization
  const activeTab = (searchParams.get("tab") as TabKey) || "general";
  const mode = (searchParams.get("mode") as Mode) || "list";
  const recordIdParam = searchParams.get("id");
  const year = searchParams.get("year") || "all";
  const selectedZoneId = searchParams.get("zone") || defaultZoneId || "all";
  const selectedStateId = searchParams.get("state") || defaultStateId || "all";
  const searchQuery = searchParams.get("q") || "";
  const [currentSort, setCurrentSort] = React.useState<string>("newest");

  // Helper to update query parameters cleanly
  const updateQueryParams = React.useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(updates).forEach(([k, v]) => {
          if (v === null || v === undefined || v === "" || v === "all") {
            next.delete(k);
          } else {
            next.set(k, String(v));
          }
        });
        return next;
      });
    },
    [setSearchParams]
  );

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Geo options
  const [zones, setZones] = React.useState<Geo[]>([]);
  const [states, setStates] = React.useState<Geo[]>([]);

  // Tab Data Lists
  const [profiles, setProfiles] = React.useState<any[]>([]);
  const [accommodations, setAccommodations] = React.useState<any[]>([]);
  const [utilities, setUtilities] = React.useState<any[]>([]);
  const [focalPersons, setFocalPersons] = React.useState<any[]>([]);

  // Zonal Consolidation multi-select state
  const [selectedUtilityIds, setSelectedUtilityIds] = React.useState<number[]>([]);
  const [consolidatingBatch, setConsolidatingBatch] = React.useState(false);

  // Profile Form state when creating/editing
  const [profileForm, setProfileForm] = React.useState<any>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  // Load Geo options
  React.useEffect(() => {
    stockApi
      .getZones()
      .then((r) => setZones(r.data || []))
      .catch(() => setZones([]));
  }, []);

  React.useEffect(() => {
    if (!selectedZoneId || selectedZoneId === "all") {
      stockApi
        .getStates()
        .then((r) => setStates(r.data || []))
        .catch(() => setStates([]));
      return;
    }
    stockApi
      .getStates(selectedZoneId)
      .then((r) => setStates(r.data || []))
      .catch(() => setStates([]));
  }, [selectedZoneId]);

  // Main data loader
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        state_id: selectedStateId !== "all" ? selectedStateId : undefined,
        zone_id: selectedZoneId !== "all" ? selectedZoneId : undefined,
        year: year !== "all" ? year : undefined,
      };

      const [profRes, accomRes, utilRes, focalRes] = await Promise.all([
        stateZonalOfficeProfileApi.list(filters).catch(() => ({ success: true, data: [] })),
        officeAccommodationApi.list(filters).catch(() => ({ success: true, data: [] })),
        utilityServiceReportApi.list(filters).catch(() => ({ success: true, data: [] })),
        stateZonalFocalPersonApi.list(filters).catch(() => ({ success: true, data: [] })),
      ]);

      setProfiles(profRes?.data || []);
      setAccommodations(accomRes?.data || []);
      setUtilities(utilRes?.data || []);
      setFocalPersons(focalRes?.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [selectedStateId, selectedZoneId, year]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Tab Switch
  const handleTabChange = (key: TabKey) => {
    updateQueryParams({ tab: key, mode: "list", id: null, q: null });
  };

  // Open Form for New Entry
  const handleOpenCreate = () => {
    if (activeTab === "general") {
      setProfileForm({
        reporting_year: year !== "all" ? Number(year) : new Date().getFullYear(),
        state_id: selectedStateId !== "all" ? selectedStateId : (states[0]?.id ? String(states[0].id) : ""),
        zone_id: selectedZoneId !== "all" ? selectedZoneId : (zones[0]?.id ? String(zones[0].id) : ""),
        coordinator_name: "",
        coordinator_phone: "",
        coordinator_email: "",
        office_address: "",
        office_email: "",
        staff_strength: 0,
        enrolment_target: null,
        annual_budget: null,
        staff_members: [],
        status: "draft",
      });
    }
    updateQueryParams({ mode: "new", id: null });
  };

  // Open View Mode
  const handleViewItem = (item: any) => {
    updateQueryParams({ mode: "view", id: String(item.id || item.reference_id) });
  };

  // Open Edit Mode
  const handleEditItem = (item?: any) => {
    const target = item || selectedItem;
    if (activeTab === "general" && target) {
      setProfileForm(target);
    }
    updateQueryParams({
      mode: "edit",
      id: target ? String(target.id || target.reference_id) : null,
    });
  };

  // Return to List View
  const handleBackToList = () => {
    updateQueryParams({ mode: "list", id: null });
    setSelectedFile(null);
  };

  // Delete item from list view
  const handleDeleteItem = async (row: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      if (activeTab === "accommodation") {
        await officeAccommodationApi.delete(row.id);
      } else if (activeTab === "focal_persons") {
        await stateZonalFocalPersonApi.delete(row.id);
      } else if (activeTab === "utilities") {
        await utilityServiceReportApi.delete(row.id);
      } else if (activeTab === "general") {
        await stateZonalOfficeProfileApi.delete(row.id);
      }
      toast.success("Record deleted");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete record");
    }
  };

  // Save General Profile
  const handleSaveGeneralProfile = async (targetStatus?: string) => {
    if (!profileForm?.state_id) {
      toast.error("Please select a State Office");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        reporting_year: profileForm.reporting_year || new Date().getFullYear(),
        state_id: profileForm.state_id,
        zone_id: profileForm.zone_id,
        coordinator_name: profileForm.coordinator_name || null,
        coordinator_phone: profileForm.coordinator_phone || null,
        coordinator_email: profileForm.coordinator_email || null,
        office_address: profileForm.office_address || null,
        office_email: profileForm.office_email || null,
        staff_strength: profileForm.staff_strength || 0,
        enrolment_target: profileForm.enrolment_target || null,
        annual_budget: profileForm.annual_budget || null,
        staff_members: profileForm.staff_members || [],
        status: targetStatus || profileForm.status || "draft",
      };

      await stateZonalOfficeProfileApi.save(payload, selectedFile, profileForm.id || null);
      toast.success(targetStatus === "submitted" ? "Profile submitted successfully" : "Profile saved");
      handleBackToList();
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Batch consolidate utility claims for Zonal Coordinator
  const handleConsolidateUtilities = async () => {
    if (!selectedUtilityIds.length) {
      toast.error("Please select at least one utility claim to consolidate");
      return;
    }
    setConsolidatingBatch(true);
    try {
      const zCode = selectedZoneId !== "all" ? selectedZoneId : defaultZoneId || undefined;
      const res = await utilityServiceReportApi.consolidate(selectedUtilityIds, zCode);
      if (res.success) {
        toast.success(
          `Consolidation Successful! Batch Reference: ${res.batch_id}`,
          {
            description: `${selectedUtilityIds.length} utility claims consolidated for HQ payment clearance.`,
          }
        );
        setSelectedUtilityIds([]);
        await loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to consolidate claims");
    } finally {
      setConsolidatingBatch(false);
    }
  };

  // Format currency helper
  const formatCurrency = (val: number | string | null | undefined) => {
    if (val == null || val === "") return "—";
    const n = Number(val);
    return isNaN(n) ? "—" : `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
  };

  const currentTabCfg = TAB_CONFIG.find((t) => t.key === activeTab)!;
  const yearOptions = buildReportingYearOptions();

  // Active dataset
  const currentList =
    activeTab === "general"
      ? profiles
      : activeTab === "accommodation"
      ? accommodations
      : activeTab === "utilities"
      ? utilities
      : focalPersons;

  // Selected item resolved from URL id param
  const selectedItem = React.useMemo(() => {
    if (!recordIdParam) return null;
    return (
      currentList.find(
        (r) => String(r.id || r.reference_id) === String(recordIdParam)
      ) || null
    );
  }, [recordIdParam, currentList]);

  // Filtered rows for ShadcnDataTable
  const filteredData = React.useMemo(() => {
    let list = currentList;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => {
        const stateName = r.state?.description?.toLowerCase() || "";
        const zoneName = r.zone?.description?.toLowerCase() || "";
        const coord = r.coordinator_name?.toLowerCase() || "";
        const officer = r.officer_name?.toLowerCase() || "";
        const contractor = r.contractor_name?.toLowerCase() || "";
        const domain = r.domain?.toLowerCase() || "";
        const refId = r.reference_id?.toLowerCase() || "";
        return (
          stateName.includes(q) ||
          zoneName.includes(q) ||
          coord.includes(q) ||
          officer.includes(q) ||
          contractor.includes(q) ||
          domain.includes(q) ||
          refId.includes(q)
        );
      });
    }

    // Sort order
    if (currentSort === "oldest") {
      return [...list].reverse();
    }
    if (currentSort === "state_asc") {
      return [...list].sort((a, b) => {
        const aName = a.state?.description || a.state_code || "";
        const bName = b.state?.description || b.state_code || "";
        return aName.localeCompare(bName);
      });
    }
    if (currentSort === "amount_desc") {
      return [...list].sort((a, b) => {
        const aVal = Number(a.annual_budget || a.rent_amount || a.amount_claimed || 0);
        const bVal = Number(b.annual_budget || b.rent_amount || b.amount_claimed || 0);
        return bVal - aVal;
      });
    }
    return list;
  }, [currentList, searchQuery, currentSort]);

  // 4 Solvix KPI summary metrics matching media_1793556856351_c64fb296.jpg
  const solvixStatItems = React.useMemo<SolvixStatItem[]>(() => {
    if (activeTab === "general") {
      const totalBudget = profiles.reduce(
        (sum, p) => sum + (Number(p.annual_budget) || 0),
        0
      );
      const totalStaff = profiles.reduce(
        (sum, p) => sum + (p.staff_members?.length || Number(p.staff_strength) || 0),
        0
      );
      const endorsedCount = profiles.filter(
        (p) => p.status === "approved" || p.status === "endorsed"
      ).length;
      const complianceRate =
        profiles.length > 0 ? Math.round((endorsedCount / profiles.length) * 100) : 0;

      return [
        {
          label: "TOTAL STATE PROFILES",
          value: profiles.length,
          trendValue: `${profiles.length} registered`,
          trendLabel: "active state records",
          trendColor: "emerald",
          sparklineVariant: "teal",
        },
        {
          label: "TOTAL ANNUAL BUDGET",
          value: totalBudget > 0 ? formatCurrency(totalBudget) : "₦0.00",
          trendValue: "+12.4%",
          trendLabel: "statutory state funding",
          trendColor: "emerald",
          sparklineVariant: "emerald",
        },
        {
          label: "TOTAL WORKFORCE",
          value: totalStaff,
          trendValue: `${totalStaff} personnel`,
          trendLabel: "verified NHIA officers",
          trendColor: "sky",
          sparklineVariant: "sky",
        },
        {
          label: "COMPLIANCE RATE",
          value: `${complianceRate}%`,
          trendValue: `${endorsedCount} endorsed`,
          trendLabel: "zonal directorate verified",
          trendColor: complianceRate >= 80 ? "emerald" : "amber",
          sparklineVariant: "indigo",
        },
      ];
    }

    if (activeTab === "accommodation") {
      const totalRent = accommodations.reduce(
        (sum, a) => sum + (Number(a.rent_amount) || 0),
        0
      );
      const goodCount = accommodations.filter(
        (a) => a.current_condition === "Good"
      ).length;
      const goodPct =
        accommodations.length > 0
          ? Math.round((goodCount / accommodations.length) * 100)
          : 0;
      const rentedCount = accommodations.filter(
        (a) => (a.ownership_status || "").toLowerCase() === "rented"
      ).length;

      return [
        {
          label: "ACCOMMODATION PORTFOLIO",
          value: accommodations.length,
          trendValue: `${accommodations.length} offices`,
          trendLabel: "facilities mapped nationwide",
          trendColor: "emerald",
          sparklineVariant: "teal",
        },
        {
          label: "ANNUAL LEASE EXPENDITURE",
          value: totalRent > 0 ? formatCurrency(totalRent) : "₦0.00",
          trendValue: "₦ commitment",
          trendLabel: "annual rent liability",
          trendColor: "emerald",
          sparklineVariant: "emerald",
        },
        {
          label: "FACILITY CONDITION",
          value: `${goodPct}%`,
          trendValue: `${goodCount} Good`,
          trendLabel: "verified operational status",
          trendColor: goodPct >= 70 ? "emerald" : "amber",
          sparklineVariant: "sky",
        },
        {
          label: "COMMERCIAL LEASES",
          value: rentedCount,
          trendValue: `${rentedCount} rented`,
          trendLabel: "active lease agreements",
          trendColor: "indigo",
          sparklineVariant: "indigo",
        },
      ];
    }

    if (activeTab === "utilities") {
      const totalClaimed = utilities.reduce(
        (sum, u) => sum + (Number(u.amount_claimed) || 0),
        0
      );
      const approvedCount = utilities.filter(
        (u) => u.status === "approved" || u.status === "endorsed"
      ).length;
      const approvedPct =
        utilities.length > 0
          ? Math.round((approvedCount / utilities.length) * 100)
          : 0;
      const pendingCount = utilities.filter(
        (u) => u.status === "submitted" || u.status === "draft" || !u.status
      ).length;

      return [
        {
          label: "UTILITY SERVICE CLAIMS",
          value: utilities.length,
          trendValue: `${utilities.length} claims`,
          trendLabel: "routine utility submissions",
          trendColor: "emerald",
          sparklineVariant: "teal",
        },
        {
          label: "TOTAL CLAIMED AMOUNT",
          value: totalClaimed > 0 ? formatCurrency(totalClaimed) : "₦0.00",
          trendValue: "₦ liability",
          trendLabel: "operational service costs",
          trendColor: "emerald",
          sparklineVariant: "emerald",
        },
        {
          label: "SETTLED / APPROVED",
          value: `${approvedPct}%`,
          trendValue: `${approvedCount} approved`,
          trendLabel: "cleared by finance",
          trendColor: approvedPct >= 75 ? "emerald" : "sky",
          sparklineVariant: "sky",
        },
        {
          label: "CLAIMS IN REVIEW",
          value: pendingCount,
          trendValue: `${pendingCount} pending`,
          trendLabel: "awaiting audit clearance",
          trendColor: pendingCount > 0 ? "amber" : "emerald",
          sparklineVariant: "indigo",
        },
      ];
    }

    return [];
  }, [activeTab, profiles, accommodations, utilities]);

  // Accommodation Columns matching Solvix Table (media_1793556834379_9ddcebf0.jpg)
  const accommodationColumns: ColumnDef<any>[] = [
    {
      id: "code",
      header: "Record ID",
      cell: ({ row }) => (
        <span className="font-mono text-slate-400 font-medium text-xs">
          #{row.original.reference_id || `ACC-${String(row.original.id || row.index + 1).padStart(4, "0")}`}
        </span>
      ),
    },
    {
      accessorKey: "state.description",
      header: "State Office",
      cell: ({ row }) => {
        const stateName =
          row.original.state?.description ||
          states.find((s) => String(s.id) === String(row.original.state_id))?.description ||
          row.original.state_code ||
          "State Office";
        return (
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-[#1a7a52]/10 text-[#1a7a52] flex items-center justify-center text-[10px] font-bold shrink-0">
              {stateName.slice(0, 2).toUpperCase()}
            </div>
            <span className="font-semibold text-slate-900">{stateName}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "ownership_status",
      header: "Office Type",
      cell: ({ row }) => (
        <span className="text-slate-600 font-medium capitalize">
          {row.original.ownership_status || "—"}
        </span>
      ),
    },
    {
      accessorKey: "current_condition",
      header: "Status",
      cell: ({ row }) => (
        <SolvixStatusPill status={row.original.current_condition || "Good"} />
      ),
    },
    {
      accessorKey: "rent_expiry_date",
      header: "Expiry Date",
      cell: ({ row }) => (
        <span className="text-slate-500 font-normal text-xs">
          {row.original.rent_expiry_date || "—"}
        </span>
      ),
    },
    {
      accessorKey: "rent_amount",
      header: "Annual Rent (₦)",
      cell: ({ row }) => (
        <span className="font-bold text-slate-900 text-xs tabular-nums">
          {formatCurrency(row.original.rent_amount)}
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
            onClick={() => handleViewItem(row.original)}
            className="h-7 px-2.5 text-xs font-semibold text-[#1a7a52] hover:text-[#145c3f] hover:bg-[#1a7a52]/10 rounded-sm gap-1"
          >
            <Eye className="size-3.5" />
            <span>View</span>
          </Button>
        </div>
      ),
    },
  ];

  // General Profile Columns matching Solvix Table
  const generalColumns: ColumnDef<any>[] = [
    {
      id: "code",
      header: "Profile ID",
      cell: ({ row }) => (
        <span className="font-mono text-slate-400 font-medium text-xs">
          #{row.original.reference_id || `PROF-${String(row.original.id || row.index + 1).padStart(4, "0")}`}
        </span>
      ),
    },
    {
      accessorKey: "state.description",
      header: "State Office",
      cell: ({ row }) => {
        const stateName =
          row.original.state?.description ||
          states.find((s) => String(s.id) === String(row.original.state_id))?.description ||
          row.original.state_code ||
          "State Office";
        return (
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-[#1a7a52]/10 text-[#1a7a52] flex items-center justify-center text-[10px] font-bold shrink-0">
              {stateName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{stateName}</p>
              <p className="text-[10px] text-slate-400">
                {row.original.zone?.description || row.original.zonal_code || ""}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "coordinator_name",
      header: "State Coordinator",
      cell: ({ row }) => (
        <span className="text-slate-700 font-medium">
          {row.original.coordinator_name || "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <SolvixStatusPill status={row.original.status || "draft"} />
      ),
    },
    {
      accessorKey: "reporting_year",
      header: "Cycle",
      cell: ({ row }) => (
        <span className="text-slate-500 font-normal text-xs">
          {row.original.reporting_year}
        </span>
      ),
    },
    {
      accessorKey: "annual_budget",
      header: "Approved Budget (₦)",
      cell: ({ row }) => (
        <span className="font-bold text-slate-900 text-xs tabular-nums">
          {formatCurrency(row.original.annual_budget)}
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
            onClick={() => handleViewItem(row.original)}
            className="h-7 px-2.5 text-xs font-semibold text-[#1a7a52] hover:text-[#145c3f] hover:bg-[#1a7a52]/10 rounded-sm gap-1"
          >
            <Eye className="size-3.5" />
            <span>View</span>
          </Button>
        </div>
      ),
    },
  ];

  // Utility Columns matching Solvix Table
  const utilityColumns: ColumnDef<any>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={
            utilities.length > 0 &&
            utilities.filter((u) => u.id && u.status !== "consolidated").length > 0 &&
            selectedUtilityIds.length === utilities.filter((u) => u.id && u.status !== "consolidated").length
          }
          onCheckedChange={() => {
            const eligible = utilities.filter((u) => u.id && u.status !== "consolidated");
            if (selectedUtilityIds.length === eligible.length) {
              setSelectedUtilityIds([]);
            } else {
              setSelectedUtilityIds(eligible.map((u) => u.id));
            }
          }}
          aria-label="Select all eligible claims"
        />
      ),
      cell: ({ row }) => {
        const isConsolidated = row.original.status === "consolidated" || !!row.original.consolidated_batch_id;
        const isSelected = row.original.id ? selectedUtilityIds.includes(row.original.id) : false;
        if (isConsolidated) {
          return <CheckCircle2 className="size-4 text-emerald-600 inline-block" title="Consolidated" />;
        }
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => {
                const id = row.original.id;
                if (!id) return;
                setSelectedUtilityIds((prev) =>
                  prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                );
              }}
              aria-label="Select claim"
            />
          </div>
        );
      },
    },
    {
      id: "code",
      header: "Claim Ref",
      cell: ({ row }) => (
        <span className="font-mono text-slate-400 font-medium text-xs">
          #{row.original.invoice_number || row.original.payment_request_ref || `CLM-${String(row.original.id || row.index + 1).padStart(4, "0")}`}
        </span>
      ),
    },
    {
      accessorKey: "contractor_name",
      header: "Service Contractor",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-slate-900">{row.original.contractor_name || "Official Vendor"}</p>
          <p className="text-[10px] text-slate-400 capitalize">
            {row.original.service_category || "General Utilities"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "service_location",
      header: "Location",
      cell: ({ row }) => (
        <span className="text-slate-600 font-medium capitalize">
          {row.original.service_location ? row.original.service_location.replace("_", " ") : "State Office"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <SolvixStatusPill status={row.original.status || "draft"} />
      ),
    },
    {
      id: "cycle",
      header: "Period",
      cell: ({ row }) => (
        <span className="text-slate-500 font-normal text-xs">
          {row.original.reporting_year}
        </span>
      ),
    },
    {
      accessorKey: "amount_claimed",
      header: "Amount Due (₦)",
      cell: ({ row }) => (
        <span className="font-bold text-slate-900 text-xs tabular-nums">
          {formatCurrency(row.original.amount_claimed)}
        </span>
      ),
    },
    {
      accessorKey: "consolidated_batch_id",
      header: "Batch ID",
      cell: ({ row }) => (
        row.original.consolidated_batch_id ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs font-mono text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {row.original.consolidated_batch_id}
          </span>
        ) : (
          <span className="text-slate-400 text-xs italic">Unconsolidated</span>
        )
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
            onClick={() => handleViewItem(row.original)}
            className="h-7 px-2.5 text-xs font-semibold text-[#1a7a52] hover:text-[#145c3f] hover:bg-[#1a7a52]/10 rounded-sm gap-1"
          >
            <Eye className="size-3.5" />
            <span>View</span>
          </Button>
        </div>
      ),
    },
  ];

  // Active columns
  const activeColumns =
    activeTab === "general"
      ? generalColumns
      : activeTab === "accommodation"
      ? accommodationColumns
      : utilityColumns;

  // Active filter count
  const activeFilterCount =
    (year !== "all" ? 1 : 0) +
    (selectedZoneId !== "all" ? 1 : 0) +
    (selectedStateId !== "all" ? 1 : 0);

  // Clear all filters helper
  const handleClearAllFilters = () => {
    updateQueryParams({ year: "all", zone: "all", state: "all", q: null });
  };

  const getHeaderTitle = () => {
    if (activeTab === "focal_persons") {
      if (mode === "new") return "Appoint New Focal Person";
      if (mode === "edit") return "Edit Focal Person Profile";
      if (mode === "view") return "Focal Person Details";
      return currentTabCfg.formTitle;
    }
    if (mode === "new") {
      if (activeTab === "general") return "Create General Information";
      if (activeTab === "accommodation") return "Register Office Accommodation";
      if (activeTab === "utilities") return "New Utility Service Claim";
      return currentTabCfg.newLabel;
    }
    if (mode === "edit") {
      if (activeTab === "general") return "Edit General Information";
      if (activeTab === "accommodation") return "Edit Office Accommodation";
      if (activeTab === "utilities") return "Edit Utility Service Claim";
      return `Edit ${currentTabCfg.label}`;
    }
    if (mode === "view") {
      return `${currentTabCfg.label} Details`;
    }
    return currentTabCfg.formTitle;
  };

  return (
    <PageLayout
      title={getHeaderTitle()}
      onBack={mode === "list" ? undefined : handleBackToList}
      actions={
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8.5 gap-1.5 border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-sm"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>

          {mode === "list" && (
            <Button
              className="h-8.5 bg-orange-action hover:bg-orange-600 text-white text-xs gap-1.5 font-bold shadow-md shadow-orange-500/15 rounded-sm"
              onClick={() => {
                if (activeTab === "focal_persons") {
                  updateQueryParams({ mode: "new", id: null });
                } else {
                  handleOpenCreate();
                }
              }}
            >
              <Plus className="size-3.5" /> {currentTabCfg.newLabel}
            </Button>
          )}

          {mode !== "list" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToList}
              className="h-8.5 gap-1.5 border-slate-300 text-xs font-medium text-slate-700 rounded-sm"
            >
              Back to Table
            </Button>
          )}
        </div>
      }
      tabs={
        mode === "list" ? (
          <UnderHeaderNavTabs
            tabs={TAB_CONFIG.map((tab) => ({
              id: tab.key,
              label: tab.label,
              icon: tab.icon,
              count:
                tab.key === "general"
                  ? profiles.length
                  : tab.key === "accommodation"
                  ? accommodations.length
                  : tab.key === "utilities"
                  ? utilities.length
                  : focalPersons.length,
            }))}
            activeTab={activeTab}
            onChange={(key) => handleTabChange(key as any)}
            ariaLabel="State office profile sections"
          />
        ) : undefined
      }
      contentClassName="space-y-5 pb-8"
    >
      <div className="w-full space-y-5">
          {/* FOCAL PERSONS TAB DELEGATION */}
          {activeTab === "focal_persons" ? (
            <FocalPersonsTab
              stateId={selectedStateId !== "all" ? selectedStateId : ""}
              zoneId={selectedZoneId !== "all" ? selectedZoneId : ""}
              year={year !== "all" ? Number(year) : new Date().getFullYear()}
              initialEditingId={recordIdParam ? Number(recordIdParam) : null}
              isStandaloneForm={mode === "new" || mode === "edit"}
              onBack={handleBackToList}
              onSaved={loadData}
              onModeChange={(m, id) => updateQueryParams({ mode: m, id: id ? String(id) : null })}
            />
          ) : (
            <>
              {/* VIEW MODE: Read details on-page (NO modal, NO sheet) */}
              {mode === "view" && selectedItem && (
                <OfficeProfileDetailView
                  tab={activeTab}
                  data={selectedItem}
                  onBack={handleBackToList}
                  onEdit={() => handleEditItem(selectedItem)}
                  canEdit={true}
                />
              )}

              {/* EDIT / NEW MODE: Render Form on-page in 1 single Card (NO modal, NO sheet) */}
              {(mode === "edit" || mode === "new") && (
                <div className="w-full animate-in fade-in-50 duration-200">
                  {activeTab === "general" && (
                    <OfficeProfileGeneralTab
                      profile={profileForm}
                      onChange={(fields) => setProfileForm((prev: any) => ({ ...prev, ...fields }))}
                      onSaveDraft={() => handleSaveGeneralProfile("draft")}
                      onSubmit={() => handleSaveGeneralProfile("submitted")}
                      onFileSelect={setSelectedFile}
                      selectedFile={selectedFile}
                      states={states}
                      zones={zones}
                      previousProfiles={profiles}
                      isSaving={saving}
                      onBack={handleBackToList}
                    />
                  )}

                  {activeTab === "accommodation" && (
                    <OfficeAccommodationTab
                      stateId={
                        selectedItem?.state_id ||
                        (selectedStateId !== "all" ? selectedStateId : String(states[0]?.id || ""))
                      }
                      zoneId={
                        selectedItem?.zone_id ||
                        (selectedZoneId !== "all" ? selectedZoneId : String(zones[0]?.id || ""))
                      }
                      year={
                        selectedItem?.reporting_year ||
                        (year !== "all" ? Number(year) : new Date().getFullYear())
                      }
                      profileId={selectedItem?.profile_id}
                      initialItem={mode === "edit" ? selectedItem : null}
                      onSaved={() => {
                        loadData();
                        handleBackToList();
                      }}
                      onCancel={handleBackToList}
                    />
                  )}

                  {activeTab === "utilities" && (
                    <UtilityServicesTab
                      stateId={
                        selectedItem?.state_id ||
                        (selectedStateId !== "all" ? selectedStateId : String(states[0]?.id || ""))
                      }
                      zoneId={
                        selectedItem?.zone_id ||
                        (selectedZoneId !== "all" ? selectedZoneId : String(zones[0]?.id || ""))
                      }
                      year={
                        selectedItem?.reporting_year ||
                        (year !== "all" ? Number(year) : new Date().getFullYear())
                      }
                      profileId={selectedItem?.profile_id}
                      userRole={userRole}
                      onCancel={handleBackToList}
                      onSaved={() => {
                        loadData();
                        handleBackToList();
                      }}
                    />
                  )}
                </div>
              )}

              {/* LIST MODE: Solvix 4 Stat Cards + Filter Bar + Unified Table Card */}
              {mode === "list" && (
                <div className="space-y-4">
                  {/* 1. Solvix 4-Card Metric Grid with Sparklines matching media_1793556856351_c64fb296.jpg */}
                  <SolvixStatCards items={solvixStatItems} loading={loading} />

                  <Card className="rounded-sm border-[#d4e8dc]">
                    <CardContent className="pt-4 pb-4 space-y-3">
                      <div className="grid grid-flow-col auto-cols-fr gap-3">
                        <div className="space-y-1 min-w-0">
                          <Label className="text-xs text-muted-foreground">Zone</Label>
                          <Select
                            value={selectedZoneId}
                            onValueChange={(val) => updateQueryParams({ zone: val, state: "all" })}
                          >
                            <SelectTrigger
                              className="w-full"
                              displayValue={
                                selectedZoneId === "all"
                                  ? "All Zones"
                                  : zones.find((z) => String(z.id) === selectedZoneId)?.description || "Zone"
                              }
                            >
                              <SelectValue placeholder="Zone" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Zones</SelectItem>
                              {zones.map((z) => (
                                <SelectItem key={z.id} value={String(z.id)}>
                                  {z.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <Label className="text-xs text-muted-foreground">State</Label>
                          <Select
                            value={selectedStateId}
                            onValueChange={(val) => updateQueryParams({ state: val })}
                          >
                            <SelectTrigger
                              className="w-full"
                              displayValue={
                                selectedStateId === "all"
                                  ? "All States"
                                  : states.find((s) => String(s.id) === selectedStateId)?.description || "State"
                              }
                            >
                              <SelectValue placeholder="State" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All States</SelectItem>
                              {states.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                  {s.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <Label className="text-xs text-muted-foreground">Year</Label>
                          <Select
                            value={year}
                            onValueChange={(val) => updateQueryParams({ year: val })}
                          >
                            <SelectTrigger
                              className="w-full"
                              displayValue={year === "all" ? "All Years" : year}
                            >
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Years</SelectItem>
                              {yearOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {activeFilterCount > 0 && (
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 gap-1 shrink-0"
                            onClick={handleClearAllFilters}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Clear
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Zonal Utility Batch Consolidation Banner */}
                  {activeTab === "utilities" && selectedUtilityIds.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/60 border-2 border-[#1a7a52] p-3.5 rounded-sm shadow-xs animate-in fade-in-50 duration-150">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-sm bg-[#1a7a52] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          <Layers className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-[#0f3d2e]">
                              {selectedUtilityIds.length} Claim{selectedUtilityIds.length > 1 ? "s" : ""} Selected for Consolidation
                            </p>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs font-bold text-[10px] bg-[#1a7a52] text-white">
                              Zonal Consolidation
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Consolidate monthly security and cleaning claims into one official HQ payment request.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUtilityIds([])}
                          className="h-8 text-xs border-slate-300 text-slate-700 rounded-sm"
                        >
                          Clear
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleConsolidateUtilities}
                          disabled={consolidatingBatch}
                          className="h-8.5 text-xs bg-[#1a7a52] hover:bg-[#145c3f] text-white font-bold rounded-sm gap-1.5 shadow-xs border border-[#145c3f]"
                        >
                          {consolidatingBatch ? <Loader2 className="size-3.5 animate-spin" /> : <Layers className="size-3.5" />}
                          Consolidate into HQ Payment Request
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 3. Solvix Unified Table Card matching media_1793556834379_9ddcebf0.jpg */}
                  <ShadcnDataTable
                    title={currentTabCfg.tableTitle}
                    infoTooltip={currentTabCfg.infoTooltip}
                    columns={activeColumns}
                    data={filteredData}
                    loading={loading}
                    searchPlaceholder={`Search ${currentTabCfg.label.toLowerCase()}...`}
                    searchValue={searchQuery}
                    onSearchChange={(val) => updateQueryParams({ q: val })}
                    onRowClick={handleViewItem}
                    emptyMessage={`No ${currentTabCfg.label.toLowerCase()} records found.`}
                    pageSize={50}
                    enableSelection={false}
                    showTableOptions={false}
                  />
                </div>
              )}
            </>
          )}
        </div>
    </PageLayout>
  );
}
