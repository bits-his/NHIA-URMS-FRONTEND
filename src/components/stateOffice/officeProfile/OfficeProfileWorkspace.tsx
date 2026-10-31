import * as React from "react";
import {
  ArrowLeft,
  Building2,
  Home,
  Wrench,
  Users,
  Save,
  Send,
  Plus,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

interface Props {
  onBack?: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
  userRole?: string;
}

type TabKey = "general" | "accommodation" | "utilities" | "focal_persons";
type Mode = "list" | "view" | "edit" | "new";
type Geo = { id: number; description: string; code?: string; zonal_id?: number };

const TAB_CONFIG: { key: TabKey; label: string; icon: LucideIcon; newLabel: string }[] = [
  { key: "general", label: "General Information", icon: Building2, newLabel: "New Profile" },
  { key: "accommodation", label: "Office Accommodation", icon: Home, newLabel: "New Accommodation" },
  { key: "utilities", label: "Utility Services", icon: Wrench, newLabel: "New Utility Claim" },
  { key: "focal_persons", label: "Focal Persons Register", icon: Users, newLabel: "Appoint Officer" },
];

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-700 border-slate-200", icon: <FileText className="w-3.5 h-3.5" /> },
  submitted: { label: "In Review", cls: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="w-3.5 h-3.5" /> },
  endorsed: { label: "Endorsed", cls: "bg-teal-100 text-teal-800 border-teal-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  returned: { label: "Returned", cls: "bg-rose-100 text-rose-800 border-rose-200", icon: <FileText className="w-3.5 h-3.5" /> },
};

export default function OfficeProfileWorkspace({
  onBack,
  defaultStateId,
  defaultZoneId,
  userRole = "",
}: Props) {
  const [activeTab, setActiveTab] = React.useState<TabKey>("general");
  const [mode, setMode] = React.useState<Mode>("list");
  const [selectedItem, setSelectedItem] = React.useState<any | null>(null);

  const [year, setYear] = React.useState<string>("all");
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Geo options
  const [zones, setZones] = React.useState<Geo[]>([]);
  const [states, setStates] = React.useState<Geo[]>([]);
  const [selectedZoneId, setSelectedZoneId] = React.useState<string>(defaultZoneId || "all");
  const [selectedStateId, setSelectedStateId] = React.useState<string>(defaultStateId || "all");

  // Tab Data Lists
  const [profiles, setProfiles] = React.useState<any[]>([]);
  const [accommodations, setAccommodations] = React.useState<any[]>([]);
  const [utilities, setUtilities] = React.useState<any[]>([]);
  const [focalPersons, setFocalPersons] = React.useState<any[]>([]);

  // Profile Form state when creating/editing
  const [profileForm, setProfileForm] = React.useState<any>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const isZonalCoordinator =
    userRole.includes("zonal") || userRole.includes("zc") || userRole === "admin";

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
    setActiveTab(key);
    setMode("list");
    setSelectedItem(null);
  };

  // Open Form for New Entry
  const handleOpenCreate = () => {
    setSelectedItem(null);
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
    setMode("new");
  };

  // Open View Mode
  const handleViewItem = (item: any) => {
    setSelectedItem(item);
    setMode("view");
  };

  // Open Edit Mode
  const handleEditItem = (item?: any) => {
    const target = item || selectedItem;
    setSelectedItem(target);
    if (activeTab === "general") {
      setProfileForm(target);
    }
    setMode("edit");
  };

  // Return to List View
  const handleBackToList = () => {
    setMode("list");
    setSelectedItem(null);
    setSelectedFile(null);
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

  // Format currency helper
  const formatCurrency = (val: number | string | null | undefined) => {
    if (val == null || val === "") return "—";
    const n = Number(val);
    return isNaN(n) ? "—" : `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
  };

  // Filtered rows per active tab
  const getFilteredData = () => {
    let rows: any[] = [];
    if (activeTab === "general") rows = profiles;
    else if (activeTab === "accommodation") rows = accommodations;
    else if (activeTab === "utilities") rows = utilities;
    else if (activeTab === "focal_persons") rows = focalPersons;

    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((r) => {
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
  };

  const filteredData = getFilteredData();
  const currentTabCfg = TAB_CONFIG.find((t) => t.key === activeTab)!;
  const yearOptions = buildReportingYearOptions();

  // Exactly 3 clean, compact stat cards matching Beneficiary Management
  const currentList =
    activeTab === "general"
      ? profiles
      : activeTab === "accommodation"
      ? accommodations
      : activeTab === "utilities"
      ? utilities
      : focalPersons;

  const totalCount = currentList.length;
  const pendingCount = currentList.filter(
    (r) => r.status === "draft" || r.status === "submitted" || !r.status
  ).length;
  const approvedCount = currentList.filter(
    (r) => r.status === "approved" || r.status === "endorsed"
  ).length;

  const statCards = [
    { label: "Total Registered", value: totalCount, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
    { label: "Draft / In Review", value: pendingCount, tone: "text-amber-800 bg-amber-50/80 border-amber-200" },
    { label: "Approved / Active", value: approvedCount, tone: "text-emerald-700 bg-emerald-50/80 border-emerald-200" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      {/* 1. Sticky Header Bar (Identical to Beneficiary Management) */}
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={mode === "list" ? (onBack || (() => window.history.back())) : handleBackToList}
            className="rounded-full shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
              Office Profile Hub
            </h2>
            <p className="text-xs text-slate-500 truncate">
              {mode === "list"
                ? `Manage ${currentTabCfg.label}: view records, inspect details, and update office profile`
                : mode === "view"
                ? `Viewing ${currentTabCfg.label} details`
                : `Edit and update ${currentTabCfg.label}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {mode === "list" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="gap-2 border-[#d4e8dc]"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button
                className="bg-orange-action hover:bg-orange-600 gap-2 shadow-md shadow-orange-500/15"
                onClick={handleOpenCreate}
              >
                <Plus className="w-4 h-4" /> {currentTabCfg.newLabel}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToList}
              className="gap-2 border-[#d4e8dc]"
            >
              Back to Table
            </Button>
          )}
        </div>
      </div>

      {/* 2. Sticky Tab Bar (Identical to Beneficiary Management) */}
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 sticky top-[57px] z-20">
        <div className="flex gap-0 overflow-x-auto -mb-px" role="tablist">
          {TAB_CONFIG.map((tab) => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;
            const count =
              tab.key === "general"
                ? profiles.length
                : tab.key === "accommodation"
                ? accommodations.length
                : tab.key === "utilities"
                ? utilities.length
                : focalPersons.length;

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleTabChange(tab.key)}
                className={`group relative shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors outline-none focus-visible:bg-[#f4f7f5] ${
                  active
                    ? "border-[#145c3f] text-[#145c3f]"
                    : "border-transparent text-slate-500 hover:text-[#0f3d2e] hover:border-[#c5ddd0]"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? "text-[#145c3f]" : "text-slate-400 group-hover:text-[#145c3f]"}`}
                  strokeWidth={2}
                />
                <span>{tab.label}</span>
                <span
                  className={`inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                    active
                      ? "bg-[#e8f6ee] text-[#145c3f]"
                      : "bg-slate-100 text-slate-500 group-hover:bg-[#e8f6ee] group-hover:text-[#145c3f]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Content Area */}
      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-5 space-y-4">
          {/* VIEW MODE: Read details with Edit button */}
          {mode === "view" && selectedItem && (
            <OfficeProfileDetailView
              tab={activeTab}
              data={selectedItem}
              onBack={handleBackToList}
              onEdit={() => handleEditItem(selectedItem)}
              canEdit={true}
            />
          )}

          {/* EDIT / NEW MODE: Render Form */}
          {(mode === "edit" || mode === "new") && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-[#d4e8dc] px-4 py-3 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToList}
                    className="gap-1.5 text-xs border-[#d4e8dc] text-[#0f3d2e] hover:bg-[#e8f5ee]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Table
                  </Button>
                  <span className="text-xs text-slate-300">|</span>
                  <span className="text-xs font-semibold text-[#0f3d2e]">
                    {mode === "new" ? `Create ${currentTabCfg.label}` : `Editing ${currentTabCfg.label}`}
                  </span>
                </div>
              </div>

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
                />
              )}

              {activeTab === "accommodation" && (
                <OfficeAccommodationTab
                  stateId={
                    selectedItem?.state_id ||
                    (selectedStateId !== "all"
                      ? selectedStateId
                      : String(states[0]?.id || ""))
                  }
                  zoneId={
                    selectedItem?.zone_id ||
                    (selectedZoneId !== "all"
                      ? selectedZoneId
                      : String(zones[0]?.id || ""))
                  }
                  year={
                    selectedItem?.reporting_year ||
                    (year !== "all" ? Number(year) : new Date().getFullYear())
                  }
                  profileId={selectedItem?.profile_id}
                />
              )}

              {activeTab === "utilities" && (
                <UtilityServicesTab
                  stateId={
                    selectedItem?.state_id ||
                    (selectedStateId !== "all"
                      ? selectedStateId
                      : String(states[0]?.id || ""))
                  }
                  zoneId={
                    selectedItem?.zone_id ||
                    (selectedZoneId !== "all"
                      ? selectedZoneId
                      : String(zones[0]?.id || ""))
                  }
                  year={
                    selectedItem?.reporting_year ||
                    (year !== "all" ? Number(year) : new Date().getFullYear())
                  }
                  profileId={selectedItem?.profile_id}
                  userRole={userRole}
                />
              )}

              {activeTab === "focal_persons" && (
                <FocalPersonsTab
                  stateId={
                    selectedItem?.state_id ||
                    (selectedStateId !== "all"
                      ? selectedStateId
                      : String(states[0]?.id || ""))
                  }
                  zoneId={
                    selectedItem?.zone_id ||
                    (selectedZoneId !== "all"
                      ? selectedZoneId
                      : String(zones[0]?.id || ""))
                  }
                  year={
                    selectedItem?.reporting_year ||
                    (year !== "all" ? Number(year) : new Date().getFullYear())
                  }
                />
              )}
            </div>
          )}

          {/* LIST MODE: Tables like Beneficiary Management */}
          {mode === "list" && (
            <>
              {/* Exactly 3 Clean Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {statCards.map((card) => (
                  <div key={card.label} className={`rounded-xl border px-4 py-3.5 ${card.tone}`}>
                    <p className="text-2xl font-bold tabular-nums">{loading ? "—" : card.value}</p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{card.label}</p>
                  </div>
                ))}
              </div>

              {/* Filter Ribbon */}
              <div className="grid gap-3 w-full rounded-xl border border-[#d4e8dc] bg-white px-4 py-4 grid-cols-1 sm:grid-cols-3">
                <div>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="w-full h-10 bg-[#f4f7f5] border-2 border-[#1a7a52]" displayValue={year === "all" ? "All Years" : year}>
                      <SelectValue placeholder="All Years" />
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

                <div>
                  <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
                    <SelectTrigger
                      className="w-full h-10 bg-[#f4f7f5] border-2 border-[#1a7a52]"
                      displayValue={selectedZoneId === "all" ? "All Zones" : (zones.find((z) => String(z.id) === selectedZoneId)?.description ?? selectedZoneId)}
                    >
                      <SelectValue placeholder="All Zones" />
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

                <div>
                  <Select value={selectedStateId} onValueChange={setSelectedStateId}>
                    <SelectTrigger
                      className="w-full h-10 bg-[#f4f7f5] border-2 border-[#1a7a52]"
                      displayValue={selectedStateId === "all" ? "All States" : (states.find((s) => String(s.id) === selectedStateId)?.description ?? selectedStateId)}
                    >
                      <SelectValue placeholder="All States" />
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
              </div>

              {/* Search Box */}
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${currentTabCfg.label} records...`}
                  className="pl-9 h-10 bg-white border-[#d4e8dc] text-xs"
                />
              </div>

              {/* Main Table Card (Beneficiary Management Style) */}
              <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Loading records...</span>
                    </div>
                  ) : filteredData.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                      <p className="text-sm text-slate-500">No {currentTabCfg.label} records match your filters.</p>
                      <Button
                        className="bg-orange-action hover:bg-orange-600 gap-2"
                        onClick={handleOpenCreate}
                      >
                        <Plus className="w-4 h-4" /> {currentTabCfg.newLabel}
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#e8f5ee] hover:bg-[#e8f5ee] border-b border-[#d4e8dc]">
                            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">Period / Year</TableHead>
                            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">Zone</TableHead>
                            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">State</TableHead>
                            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">
                              {activeTab === "general" && "Coordinator"}
                              {activeTab === "accommodation" && "Ownership / Condition"}
                              {activeTab === "utilities" && "Category / Contractor"}
                              {activeTab === "focal_persons" && "Functional Domain / Officer"}
                            </TableHead>
                            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">
                              {activeTab === "general" && "Staff / Target / Budget"}
                              {activeTab === "accommodation" && "Annual Rent"}
                              {activeTab === "utilities" && "Amount Claimed"}
                              {activeTab === "focal_persons" && "Official Designation"}
                            </TableHead>
                            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">Status</TableHead>
                            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredData.map((row) => {
                            const statusKey = row.status || "draft";
                            const st = STATUS_CONFIG[statusKey] || STATUS_CONFIG.draft;

                            return (
                              <TableRow
                                key={row.id || row.reference_id}
                                className="hover:bg-[#f8fdfb] border-b border-[#e8f3ec] last:border-0 cursor-pointer"
                                onClick={() => handleViewItem(row)}
                              >
                                <TableCell className="text-sm font-semibold text-[#0f3d2e] whitespace-nowrap">
                                  {row.reporting_year}
                                  {row.reporting_month ? ` (M${row.reporting_month})` : ""}
                                </TableCell>
                                <TableCell className="text-sm text-slate-700 whitespace-nowrap">
                                  {row.zone?.description || row.zonal_code || "—"}
                                </TableCell>
                                <TableCell className="text-sm text-slate-700 whitespace-nowrap">
                                  {row.state?.description || row.state_code || "—"}
                                </TableCell>

                                {/* Column 4: Dynamic Subject */}
                                <TableCell className="text-sm text-slate-800">
                                  {activeTab === "general" && (row.coordinator_name || "—")}
                                  {activeTab === "accommodation" && (
                                    <span>
                                      <strong>{row.ownership_status}</strong> • Condition: {row.current_condition}
                                    </span>
                                  )}
                                  {activeTab === "utilities" && (
                                    <span>
                                      <Badge variant="outline" className="mr-1.5 text-[10px] capitalize">
                                        {row.service_category}
                                      </Badge>
                                      {row.contractor_name}
                                    </span>
                                  )}
                                  {activeTab === "focal_persons" && (
                                    <span>
                                      <strong>{row.officer_name}</strong>
                                      <span className="block text-[11px] text-slate-500">{row.domain}</span>
                                    </span>
                                  )}
                                </TableCell>

                                {/* Column 5: Dynamic Metric */}
                                <TableCell className="text-sm text-slate-700">
                                  {activeTab === "general" && (
                                    <span>
                                      {row.staff_members?.length || row.staff_strength || 0} staff • {formatCurrency(row.annual_budget)}
                                    </span>
                                  )}
                                  {activeTab === "accommodation" && formatCurrency(row.rent_amount)}
                                  {activeTab === "utilities" && (
                                    <span className="font-semibold text-[#0f3d2e]">
                                      {formatCurrency(row.amount_claimed)}
                                    </span>
                                  )}
                                  {activeTab === "focal_persons" && (row.designation || "—")}
                                </TableCell>

                                {/* Column 6: Status */}
                                <TableCell>
                                  <Badge className={`text-[10px] px-2 py-0.5 inline-flex items-center gap-1 w-fit border ${st.cls}`}>
                                    {st.icon} {st.label}
                                  </Badge>
                                </TableCell>

                                {/* Column 7: Actions */}
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 gap-1.5 text-[#145c3f] hover:bg-[#eef6f1]"
                                      onClick={() => handleViewItem(row)}
                                    >
                                      <Eye className="w-3.5 h-3.5" /> View
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-slate-500 hover:text-[#0f3d2e] hover:bg-[#eef6f1]"
                                      onClick={() => handleEditItem(row)}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
