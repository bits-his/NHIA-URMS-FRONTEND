import * as React from "react";
import { useNavigate, useParams, useLocation, Navigate } from "react-router-dom";
import {
  Plus, RefreshCw, Loader2, Pencil, Eye, Save, Paperclip, Building2, Mail, MapPin, Trash2,
} from "lucide-react";
import { OWNERSHIP_STATUSES, OFFICE_CONDITIONS } from "./adminHr/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { apiFileUrl, stateZonalOfficeProfileApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { ALL_STATES, useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import PageLayout from "@/src/components/PageLayout";

const BASE = "/soc/office-profile";

interface Props {
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

type Geo = { id: number; description: string; zonal_id?: number };

type StaffMember = {
  _key: string;
  name: string;
  email: string;
  file_number: string;
  unit: string;
};

type AccommodationEntry = {
  _key: string;
  ownershipStatus: string;
  rentAmount: string;
  rentExpiryDate: string;
  currentCondition: string;
  remarks: string;
};

type Profile = {
  id: number;
  reporting_year: number;
  zone_id: number;
  state_id: number;
  staff_strength: number | null;
  coordinator_name: string | null;
  coordinator_phone: string | null;
  coordinator_email: string | null;
  staff_members?: Array<{
    name?: string | null;
    email?: string | null;
    file_number?: string | null;
    unit?: string | null;
  }> | null;
  office_address: string | null;
  office_email: string | null;
  enrolment_target: number | null;
  annual_budget: number | null;
  accommodation_entries?: Array<{
    ownershipStatus?: string | null;
    rentAmount?: number | string | null;
    rentExpiryDate?: string | null;
    currentCondition?: string | null;
    remarks?: string | null;
  }> | null;
  aop_original_name: string | null;
  aop_file_path: string | null;
  zone?: Geo;
  state?: Geo;
};

type Mode = "list" | "create" | "edit" | "view";

const uid = () => Math.random().toString(36).slice(2);
const DEFAULT_UNITS = ["Programs", "SQA/Enforcement", "HR/Admin", "ICT"];
const emptyStaffDraft = () => ({ name: "", email: "", file_number: "", unit: "" });
const emptyAccomDraft = () => ({
  ownershipStatus: "",
  rentAmount: "",
  rentExpiryDate: "",
  currentCondition: "",
  remarks: "",
});

const isOwnedStatus = (status: string) => {
  const s = String(status || "").toLowerCase();
  return s.includes("owned");
};

function asArray<T = any>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === "string" && v.trim()) {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

const emptyForm = (year: string, zoneId?: string | null, stateId?: string | null) => ({
  reporting_year: year,
  zone_id: zoneId ?? "",
  state_id: stateId ?? "",
  office_address: "",
  office_email: "",
  enrolment_target: "",
  annual_budget: "",
  remove_aop: "",
});

type FormState = ReturnType<typeof emptyForm>;

function money(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-NG");
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#d4e8dc] bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-[#d4e8dc] px-3 py-2">
        <h3 className="text-sm font-bold text-[#145c3f]">{title}</h3>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="text-sm font-medium text-slate-800 break-words">{value || "—"}</div>
    </div>
  );
}

function resolveMode(pathname: string, id?: string): Mode {
  if (pathname.endsWith("/new")) return "create";
  if (pathname.endsWith("/edit")) return "edit";
  if (id) return "view";
  return "list";
}

export default function StateZonalOfficeProfilePage({ defaultStateId, defaultZoneId }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams<{ id: string }>();
  const { canCreate, createOnly } = useStateOfficeAccess();
  const yearOptions = React.useMemo(() => buildReportingYearOptions(), []);
  const currentYear = yearOptions[0] || String(new Date().getFullYear());
  const mode = resolveMode(location.pathname, routeId);

  const [formKey, setFormKey] = React.useState(0);
  const [rows, setRows] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(mode === "list" && !createOnly);
  const [detailLoading, setDetailLoading] = React.useState(mode === "view" || mode === "edit");
  const [saving, setSaving] = React.useState(false);
  const [detail, setDetail] = React.useState<Profile | null>(null);
  const [existingAop, setExistingAop] = React.useState<{ name: string; path: string } | null>(null);
  const [aopFile, setAopFile] = React.useState<File | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [zones, setZones] = React.useState<Geo[]>([]);
  const [formStates, setFormStates] = React.useState<Geo[]>([]);
  const [unitOptions, setUnitOptions] = React.useState<string[]>(DEFAULT_UNITS);
  const [staffMembers, setStaffMembers] = React.useState<StaffMember[]>([]);
  const [staffDraft, setStaffDraft] = React.useState(emptyStaffDraft());
  const [accommodationEntries, setAccommodationEntries] = React.useState<AccommodationEntry[]>([]);
  const [accomDraft, setAccomDraft] = React.useState(emptyAccomDraft());
  const [f, setF] = React.useState<FormState>(emptyForm(currentYear, defaultZoneId, defaultStateId));

  const zoneLocked = !!defaultZoneId;
  const stateLocked = !!defaultStateId;
  const [filterYear, setFilterYear] = React.useState("all");
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const {
    showStateFilter, filterState, setFilterState, apiStateId, stateFilterActive,
  } = useMonthlyStateFilter(defaultStateId, defaultZoneId);
  const [filterStates, setFilterStates] = React.useState<Geo[]>([]);

  React.useEffect(() => {
    stockApi.getZones().then((r) => setZones(r.data || [])).catch(() => setZones([]));
    stockApi.getUnits(undefined, "state")
      .then((r) => {
        const names = (r.data || [])
          .map((u: { description?: string; name?: string }) => u.description || u.name || "")
          .filter(Boolean);
        setUnitOptions(names.length ? Array.from(new Set(names)) : DEFAULT_UNITS);
      })
      .catch(() => setUnitOptions(DEFAULT_UNITS));
  }, []);

  React.useEffect(() => {
    const zid = filterZone !== "all" ? filterZone : defaultZoneId;
    const req = zid ? stockApi.getStates(zid) : stockApi.getStates();
    req.then((r) => setFilterStates(r.data || [])).catch(() => setFilterStates([]));
  }, [filterZone, defaultZoneId]);

  React.useEffect(() => {
    if (!f.zone_id) { setFormStates([]); return; }
    stockApi.getStates(f.zone_id).then((r) => setFormStates(r.data || [])).catch(() => setFormStates([]));
  }, [f.zone_id]);

  const load = React.useCallback(async () => {
    if (createOnly) return;
    setLoading(true);
    try {
      const res = await stateZonalOfficeProfileApi.list({
        year: filterYear !== "all" ? filterYear : undefined,
        zone_id: (filterZone !== "all" ? filterZone : defaultZoneId) || undefined,
        state_id: apiStateId || defaultStateId || undefined,
      });
      setRows(res.data || []);
    } catch (err: any) {
      toast.error("Failed to load office profiles", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterZone, apiStateId, defaultZoneId, defaultStateId, createOnly]);

  React.useEffect(() => {
    if (mode === "list" && !createOnly) load();
  }, [load, mode, createOnly]);

  const applyProfile = React.useCallback((row: Profile) => {
    setDetail(row);
    setExistingAop(row.aop_file_path ? { name: row.aop_original_name || "AOP", path: row.aop_file_path } : null);
    setAopFile(null);
    const staffRows = asArray<NonNullable<Profile["staff_members"]>[number]>(row.staff_members);
    const staffs = staffRows.length
      ? staffRows.map((s) => ({
          _key: uid(),
          name: s.name || "",
          email: s.email || "",
          file_number: s.file_number || "",
          unit: s.unit || "",
        }))
      : row.coordinator_name || row.coordinator_email
        ? [{
            _key: uid(),
            name: row.coordinator_name || "",
            email: row.coordinator_email || "",
            file_number: "",
            unit: "",
          }]
        : [];
    setStaffMembers(staffs);
    setStaffDraft(emptyStaffDraft());
    const accomRows = asArray<NonNullable<Profile["accommodation_entries"]>[number]>(row.accommodation_entries);
    setAccommodationEntries(
      accomRows.map((a) => ({
        _key: uid(),
        ownershipStatus: a.ownershipStatus || "",
        rentAmount: a.rentAmount != null && a.rentAmount !== "" ? String(a.rentAmount) : "",
        rentExpiryDate: String(a.rentExpiryDate || "").slice(0, 10),
        currentCondition: a.currentCondition || "",
        remarks: a.remarks || "",
      })),
    );
    setAccomDraft(emptyAccomDraft());
    setF({
      reporting_year: String(row.reporting_year),
      zone_id: String(row.zone_id),
      state_id: String(row.state_id),
      office_address: row.office_address || "",
      office_email: row.office_email || "",
      enrolment_target: row.enrolment_target != null ? String(row.enrolment_target) : "",
      annual_budget: row.annual_budget != null ? String(row.annual_budget) : "",
      remove_aop: "",
    });
  }, []);

  React.useEffect(() => {
    if (mode !== "view" && mode !== "edit") return;
    if (!routeId) return;
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const res = await stateZonalOfficeProfileApi.get(routeId);
        if (!cancelled && res.data) applyProfile(res.data);
      } catch (err: any) {
        if (!cancelled) {
          toast.error("Failed to load profile", { description: err.message });
          navigate(BASE, { replace: true });
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mode, routeId, applyProfile, navigate]);

  React.useEffect(() => {
    if (mode !== "create") return;
    setDetail(null);
    setExistingAop(null);
    setAopFile(null);
    setStaffMembers([]);
    setStaffDraft(emptyStaffDraft());
    setAccommodationEntries([]);
    setAccomDraft(emptyAccomDraft());
    setF(emptyForm(currentYear, defaultZoneId, defaultStateId));
  }, [mode, formKey, currentYear, defaultZoneId, defaultStateId]);

  const setField = (key: keyof FormState, value: string) => {
    setF((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "zone_id" && !stateLocked) next.state_id = "";
      return next;
    });
  };

  const addStaffToTable = () => {
    if (!staffDraft.name.trim()) {
      toast.error("Staff name is required.");
      return;
    }
    setStaffMembers((prev) => [
      ...prev,
      {
        _key: uid(),
        name: staffDraft.name.trim(),
        email: staffDraft.email.trim(),
        file_number: staffDraft.file_number.trim(),
        unit: staffDraft.unit,
      },
    ]);
    setStaffDraft(emptyStaffDraft());
  };

  const addAccommodationToTable = () => {
    const d = accomDraft;
    if (!d.ownershipStatus) {
      toast.error("Ownership status is required.");
      return;
    }
    const owned = isOwnedStatus(d.ownershipStatus);
    if (!owned && !d.rentAmount && !d.rentExpiryDate && !d.currentCondition && !d.remarks.trim()) {
      toast.error("Enter rent, condition, or remarks before adding.");
      return;
    }
    setAccommodationEntries((prev) => [
      ...prev,
      {
        _key: uid(),
        ownershipStatus: d.ownershipStatus,
        rentAmount: owned ? "" : d.rentAmount,
        rentExpiryDate: owned ? "" : d.rentExpiryDate,
        currentCondition: d.currentCondition,
        remarks: d.remarks.trim(),
      },
    ]);
    setAccomDraft(emptyAccomDraft());
  };

  const ownedDraft = isOwnedStatus(accomDraft.ownershipStatus);

  const handleSave = async () => {
    if (!f.reporting_year || !f.zone_id || !f.state_id) {
      toast.error("Year, zone, and state are required.");
      return;
    }
    setSaving(true);
    try {
      // Include any draft rows that were filled but not yet added to the table
      let staffRows = [...staffMembers];
      if (staffDraft.name.trim()) {
        staffRows = [
          ...staffRows,
          {
            _key: uid(),
            name: staffDraft.name.trim(),
            email: staffDraft.email.trim(),
            file_number: staffDraft.file_number.trim(),
            unit: staffDraft.unit,
          },
        ];
      }
      let accomRows = [...accommodationEntries];
      if (accomDraft.ownershipStatus) {
        const owned = isOwnedStatus(accomDraft.ownershipStatus);
        accomRows = [
          ...accomRows,
          {
            _key: uid(),
            ownershipStatus: accomDraft.ownershipStatus,
            rentAmount: owned ? "" : accomDraft.rentAmount,
            rentExpiryDate: owned ? "" : accomDraft.rentExpiryDate,
            currentCondition: accomDraft.currentCondition,
            remarks: accomDraft.remarks.trim(),
          },
        ];
      }

      const staffPayload = staffRows
        .map(({ name, email, file_number, unit }) => ({ name, email, file_number, unit }))
        .filter((s) => s.name || s.email || s.file_number || s.unit);
      const accommodationPayload = accomRows
        .map(({ ownershipStatus, rentAmount, rentExpiryDate, currentCondition, remarks }) => {
          const owned = isOwnedStatus(ownershipStatus);
          return {
            ownershipStatus,
            rentAmount: owned || !rentAmount ? null : Number(rentAmount),
            rentExpiryDate: owned ? "" : rentExpiryDate,
            currentCondition,
            remarks,
          };
        })
        .filter((a) =>
          a.ownershipStatus || a.rentAmount != null || a.rentExpiryDate || a.currentCondition || a.remarks
        );
      const primary = staffPayload[0];
      const res = await stateZonalOfficeProfileApi.save({
        reporting_year: f.reporting_year,
        zone_id: f.zone_id,
        state_id: f.state_id,
        staff_members: staffPayload,
        coordinator_name: primary?.name || "",
        coordinator_email: primary?.email || "",
        office_address: f.office_address,
        office_email: f.office_email,
        enrolment_target: f.enrolment_target,
        annual_budget: f.annual_budget,
        accommodation_entries: accommodationPayload,
        remove_aop: f.remove_aop || undefined,
      }, aopFile, mode === "edit" ? routeId : null);
      toast.success(mode === "edit" ? "Profile updated" : "Profile saved");
      if (createOnly && mode === "create") {
        setFormKey((k) => k + 1);
        return;
      }
      if (res?.data) applyProfile(res.data);
      const savedId = res?.data?.id || routeId;
      if (savedId) navigate(`${BASE}/${savedId}`);
      else navigate(BASE);
    } catch (err: any) {
      toast.error("Could not save profile", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (mode === "list" && createOnly) {
    return <Navigate to={`${BASE}/new`} replace />;
  }

  const counts = React.useMemo(() => ({
    total: rows.length,
    withAop: rows.filter((r) => r.aop_file_path).length,
    states: new Set(rows.map((r) => r.state_id)).size,
    year: rows.filter((r) => String(r.reporting_year) === currentYear).length,
  }), [rows, currentYear]);

  const hasFilters = filterYear !== "all" || filterZone !== "all" || stateFilterActive;
  const filterZoneLabel = filterZone === "all"
    ? "All Zones"
    : (zones.find((z) => String(z.id) === filterZone)?.description ?? filterZone);
  const filterStateLabel = filterState === ALL_STATES
    ? "All States"
    : (filterStates.find((s) => String(s.id) === filterState)?.description ?? filterState);
  const zoneLabel = zones.find((z) => String(z.id) === f.zone_id)?.description ?? "Select Zone";
  const stateLabel = formStates.find((s) => String(s.id) === f.state_id)?.description ?? "Select State";
  const lockGeo = zoneLocked;
  const lockStateField = stateLocked || !f.zone_id;

  const formBack = createOnly ? "/" : BASE;
  const editBack = routeId ? `${BASE}/${routeId}` : BASE;

  /* ── List ── */
  if (mode === "list") {
    return (
      <PageLayout
        bare
        title="State Office Profile"
        actions={(
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-8 gap-1.5 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            {canCreate && (
              <Button size="sm" className="h-8 bg-orange-action hover:bg-orange-600 gap-1.5 text-xs" onClick={() => navigate(`${BASE}/new`)}>
                <Plus className="w-3.5 h-3.5" /> New Profile
              </Button>
            )}
          </div>
        )}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "Total", value: counts.total },
            { label: `${currentYear}`, value: counts.year },
            { label: "With AOP", value: counts.withAop },
            { label: "States", value: counts.states },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-[#d4e8dc] bg-white px-3 py-2.5">
              <p className="text-xl font-black text-[#145c3f] tabular-nums">{c.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#d4e8dc] bg-white px-3 py-2">
          {!zoneLocked && (
            <div className="flex-1 min-w-[120px]">
              <Select value={filterZone} onValueChange={(v) => { setFilterZone(v); if (showStateFilter) setFilterState(ALL_STATES); }}>
                <SelectTrigger className="h-8 w-full text-xs" displayValue={filterZoneLabel}>
                  <SelectValue placeholder="All Zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {showStateFilter && (
            <div className="flex-1 min-w-[120px]">
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger className="h-8 w-full text-xs" displayValue={filterStateLabel}>
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATES}>All States</SelectItem>
                  {filterStates.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex-1 min-w-[100px]">
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="h-8 w-full text-xs" displayValue={filterYear === "all" ? "All Years" : filterYear}>
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-slate-500"
              onClick={() => {
                setFilterYear("all");
                if (!zoneLocked) setFilterZone("all");
                if (showStateFilter) setFilterState(ALL_STATES);
              }}
            >
              Clear
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-[#d4e8dc] bg-white overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
              <Building2 className="w-7 h-7 opacity-30" />
              <p className="text-sm">{hasFilters ? "No profiles match your filters" : "No office profiles found"}</p>
              {!hasFilters && canCreate && (
                <Button size="sm" variant="outline" className="mt-1 h-8 gap-1.5 text-xs" onClick={() => navigate(`${BASE}/new`)}>
                  <Plus className="w-3.5 h-3.5" /> New Profile
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                    <TableHead className="h-9 text-xs font-bold text-slate-600">Year</TableHead>
                    <TableHead className="h-9 text-xs font-bold text-slate-600">Zone</TableHead>
                    <TableHead className="h-9 text-xs font-bold text-slate-600">State</TableHead>
                    <TableHead className="h-9 text-xs font-bold text-slate-600 text-right">Staffs</TableHead>
                    <TableHead className="h-9 text-xs font-bold text-slate-600">Lead Staff</TableHead>
                    <TableHead className="h-9 text-xs font-bold text-slate-600 text-right">Target</TableHead>
                    <TableHead className="h-9 text-xs font-bold text-slate-600 text-right">Budget</TableHead>
                    <TableHead className="h-9 text-xs font-bold text-slate-600">AOP</TableHead>
                    <TableHead className="h-9 text-xs font-bold text-slate-600 text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const staffList = asArray<NonNullable<Profile["staff_members"]>[number]>(row.staff_members);
                    const staffCount = staffList.length || row.staff_strength || "—";
                    const leadName = staffList[0]?.name || row.coordinator_name || "—";
                    const leadEmail = staffList[0]?.email || row.coordinator_email || "";
                    return (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-[#f8fdfb]"
                        onClick={() => navigate(`${BASE}/${row.id}`)}
                      >
                        <TableCell className="py-2 text-sm font-semibold">{row.reporting_year}</TableCell>
                        <TableCell className="py-2 text-sm text-slate-600 whitespace-nowrap">{row.zone?.description || "—"}</TableCell>
                        <TableCell className="py-2 text-sm font-semibold whitespace-nowrap">{row.state?.description || "—"}</TableCell>
                        <TableCell className="py-2 text-sm text-right tabular-nums">{staffCount}</TableCell>
                        <TableCell className="py-2 text-sm text-slate-600 whitespace-nowrap">
                          <div>{leadName}</div>
                          {leadEmail ? <div className="text-[11px] text-slate-400">{leadEmail}</div> : null}
                        </TableCell>
                        <TableCell className="py-2 text-sm text-right tabular-nums">{row.enrolment_target ?? "—"}</TableCell>
                        <TableCell className="py-2 text-sm font-semibold text-right tabular-nums">{money(row.annual_budget)}</TableCell>
                        <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                          {row.aop_file_path ? (
                            <a className="inline-flex items-center gap-1 text-xs text-primary hover:underline" href={apiFileUrl(row.aop_file_path)} target="_blank" rel="noreferrer">
                              <Paperclip className="w-3 h-3" /> AOP
                            </a>
                          ) : (
                            <Badge className="text-[10px] px-1.5 py-0 border bg-slate-100 text-slate-500 border-slate-200">None</Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs text-slate-500 hover:text-primary"
                            onClick={() => navigate(`${BASE}/${row.id}`)}
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </PageLayout>
    );
  }

  if ((mode === "view" || mode === "edit") && detailLoading) {
    return (
      <PageLayout bare title="Office Profile" back backTo={BASE}>
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
        </div>
      </PageLayout>
    );
  }

  const zoneName = detail?.zone?.description || zones.find((z) => String(z.id) === f.zone_id)?.description || "—";
  const stateName = detail?.state?.description || formStates.find((s) => String(s.id) === f.state_id)?.description || "—";

  /* ── View ── */
  if (mode === "view") {
    return (
      <PageLayout
        bare
        title="Office Profile"
        back
        backTo={formBack}
        actions={canCreate ? (
          <Button size="sm" className="h-8 bg-orange-action hover:bg-orange-600 gap-1.5 text-xs" onClick={() => navigate(`${BASE}/${routeId}/edit`)}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
        ) : undefined}
      >
        <div className="rounded-lg bg-gradient-to-r from-[#145c3f] to-[#1a7a54] px-4 py-3 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Year {f.reporting_year}</p>
          <h2 className="text-lg font-bold leading-tight">{stateName}</h2>
          <p className="text-xs text-white/80">{zoneName}</p>
        </div>

        <Section title={`Staffs (${staffMembers.length})`}>
          <div className="overflow-x-auto -mx-3 -mb-3">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                  <TableHead className="h-8 text-[11px] font-bold w-8">#</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold">Name</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold">Email</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold">File No.</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold">Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffMembers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-6 text-center text-xs text-slate-400">No staff recorded</TableCell></TableRow>
                ) : staffMembers.map((s, i) => (
                  <TableRow key={s._key}>
                    <TableCell className="py-1.5 text-xs text-slate-500">{i + 1}</TableCell>
                    <TableCell className="py-1.5 text-sm font-medium">{s.name || "—"}</TableCell>
                    <TableCell className="py-1.5 text-sm">
                      {s.email ? <a className="text-primary hover:underline inline-flex items-center gap-1" href={`mailto:${s.email}`}><Mail className="w-3 h-3" />{s.email}</a> : "—"}
                    </TableCell>
                    <TableCell className="py-1.5 text-sm">{s.file_number || "—"}</TableCell>
                    <TableCell className="py-1.5 text-sm">{s.unit || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>

        <Section title="Office Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Fact label="Address" value={<span className="inline-flex items-start gap-1"><MapPin className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />{f.office_address || "—"}</span>} />
            <Fact label="E-mail" value={f.office_email ? <a className="text-primary hover:underline" href={`mailto:${f.office_email}`}>{f.office_email}</a> : "—"} />
          </div>
        </Section>

        <Section title="Targets & AOP">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Fact label="Enrolment Target" value={f.enrolment_target || "—"} />
            <Fact label="Annual Budget" value={money(f.annual_budget)} />
            <Fact
              label="AOP"
              value={
                existingAop ? (
                  <a className="inline-flex items-center gap-1 text-primary hover:underline" href={apiFileUrl(existingAop.path)} target="_blank" rel="noreferrer">
                    <Paperclip className="w-3.5 h-3.5" /> {existingAop.name}
                  </a>
                ) : "None"
              }
            />
          </div>
        </Section>

        <Section title={`Office Accommodation (${accommodationEntries.length})`}>
          <div className="overflow-x-auto -mx-3 -mb-3">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                  <TableHead className="h-8 text-[11px] font-bold w-8">#</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold">Ownership</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold text-right">Rent</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold">Expiry</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold">Condition</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accommodationEntries.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-6 text-center text-xs text-slate-400">No accommodation recorded</TableCell></TableRow>
                ) : accommodationEntries.map((a, i) => {
                  const owned = isOwnedStatus(a.ownershipStatus);
                  return (
                    <TableRow key={a._key}>
                      <TableCell className="py-1.5 text-xs text-slate-500">{i + 1}</TableCell>
                      <TableCell className="py-1.5 text-sm font-medium">{a.ownershipStatus || "—"}</TableCell>
                      <TableCell className="py-1.5 text-sm text-right tabular-nums">{owned ? "N/A" : money(a.rentAmount)}</TableCell>
                      <TableCell className="py-1.5 text-sm whitespace-nowrap">{owned ? "N/A" : (a.rentExpiryDate || "—")}</TableCell>
                      <TableCell className="py-1.5 text-sm">{a.currentCondition || "—"}</TableCell>
                      <TableCell className="py-1.5 text-sm max-w-[200px] truncate">{a.remarks || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Section>
      </PageLayout>
    );
  }

  /* ── Create / Edit form ── */
  return (
    <PageLayout
      bare
      key={formKey}
      title={mode === "edit" ? "Edit Office Profile" : "New Office Profile"}
      back
      backTo={mode === "edit" ? editBack : formBack}
      actions={(
        <Button size="sm" className="h-8 bg-orange-action hover:bg-orange-600 gap-1.5 text-xs" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {mode === "edit" ? "Update" : "Save"}
        </Button>
      )}
    >
      <Section title="Location & Year">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="space-y-1">
            <Label className="text-xs">Zone <span className="text-red-500">*</span></Label>
            <Select value={f.zone_id} onValueChange={(v) => setField("zone_id", v)} disabled={lockGeo}>
              <SelectTrigger className={`h-9 w-full ${lockGeo ? "opacity-70 bg-slate-50" : ""}`} displayValue={zoneLabel}>
                <SelectValue placeholder="Select Zone" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">State <span className="text-red-500">*</span></Label>
            <Select value={f.state_id} onValueChange={(v) => setField("state_id", v)} disabled={lockStateField}>
              <SelectTrigger className={`h-9 w-full ${lockStateField ? "opacity-70 bg-slate-50" : ""}`} displayValue={stateLabel}>
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent>
                {formStates.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reporting Year <span className="text-red-500">*</span></Label>
            <Select value={f.reporting_year} onValueChange={(v) => setField("reporting_year", v)}>
              <SelectTrigger className="h-9 w-full" displayValue={f.reporting_year}>
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section title="Staffs">
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 items-end">
            <div className="space-y-1 lg:col-span-1">
              <Label className="text-xs">Staff Name <span className="text-red-500">*</span></Label>
              <Input className="h-9" placeholder="Full name" value={staffDraft.name} onChange={(e) => setStaffDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input className="h-9" type="email" placeholder="email@example.com" value={staffDraft.email} onChange={(e) => setStaffDraft((d) => ({ ...d, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">File Number</Label>
              <Input className="h-9" placeholder="File no." value={staffDraft.file_number} onChange={(e) => setStaffDraft((d) => ({ ...d, file_number: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Unit</Label>
              <Select value={staffDraft.unit} onValueChange={(v) => setStaffDraft((d) => ({ ...d, unit: v }))}>
                <SelectTrigger className="h-9 w-full" displayValue={staffDraft.unit || "Select Unit"}>
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" size="sm" className="h-9 bg-orange-action hover:bg-orange-600 gap-1" onClick={addStaffToTable}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border border-[#d4e8dc]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                  <TableHead className="h-8 text-[11px] font-bold w-8">#</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold">Name</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold">Email</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold">File No.</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold">Unit</TableHead>
                  <TableHead className="h-8 w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-xs text-slate-400">
                      Fill the form above and click Add
                    </TableCell>
                  </TableRow>
                ) : staffMembers.map((row, i) => (
                  <TableRow key={row._key}>
                    <TableCell className="py-1.5 text-xs text-slate-500">{i + 1}</TableCell>
                    <TableCell className="py-1.5 text-sm font-medium">{row.name}</TableCell>
                    <TableCell className="py-1.5 text-sm">{row.email || "—"}</TableCell>
                    <TableCell className="py-1.5 text-sm">{row.file_number || "—"}</TableCell>
                    <TableCell className="py-1.5 text-sm">{row.unit || "—"}</TableCell>
                    <TableCell className="py-1.5 text-right">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => setStaffMembers((p) => p.filter((r) => r._key !== row._key))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Section>

      <Section title="Office Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Office Address</Label>
            <Input className="h-9" value={f.office_address} onChange={(e) => setField("office_address", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Office E-mail</Label>
            <Input className="h-9" type="email" value={f.office_email} onChange={(e) => setField("office_email", e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title="Targets & AOP">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="space-y-1">
            <Label className="text-xs">Enrolment Target</Label>
            <Input className="h-9" type="number" min={0} value={f.enrolment_target} onChange={(e) => setField("enrolment_target", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Annual Budget (NGN)</Label>
            <Input className="h-9" type="number" min={0} step="0.01" value={f.annual_budget} onChange={(e) => setField("annual_budget", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">AOP</Label>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setAopFile(file);
                if (file) setField("remove_aop", "");
              }}
            />
            <div className="flex flex-wrap items-center gap-1.5 min-h-9">
              <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => fileRef.current?.click()}>
                <Paperclip className="w-3.5 h-3.5" />
                {aopFile ? "Replace" : "Attach"}
              </Button>
              {aopFile && <span className="text-xs text-slate-600 truncate max-w-[140px]">{aopFile.name}</span>}
              {!aopFile && existingAop && f.remove_aop !== "true" && (
                <>
                  <a className="text-xs text-primary underline truncate max-w-[140px]" href={apiFileUrl(existingAop.path)} target="_blank" rel="noreferrer">{existingAop.name}</a>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-rose-600" onClick={() => { setField("remove_aop", "true"); setExistingAop(null); }}>Remove</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Office Accommodation">
        <div className="space-y-3">
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 items-end ${ownedDraft ? "xl:grid-cols-4" : "xl:grid-cols-6"}`}>
            <div className="space-y-1">
              <Label className="text-xs">Ownership <span className="text-red-500">*</span></Label>
              <Select
                value={accomDraft.ownershipStatus}
                onValueChange={(v) => setAccomDraft((d) => ({
                  ...d,
                  ownershipStatus: v,
                  ...(isOwnedStatus(v) ? { rentAmount: "", rentExpiryDate: "" } : {}),
                }))}
              >
                <SelectTrigger className="h-9 w-full" displayValue={accomDraft.ownershipStatus || "Select"}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {OWNERSHIP_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!ownedDraft && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Rent (NGN)</Label>
                  <Input className="h-9" type="number" min={0} value={accomDraft.rentAmount} onChange={(e) => setAccomDraft((d) => ({ ...d, rentAmount: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rent Expiry</Label>
                  <Input className="h-9" type="date" value={accomDraft.rentExpiryDate} onChange={(e) => setAccomDraft((d) => ({ ...d, rentExpiryDate: e.target.value }))} />
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Condition</Label>
              <Select value={accomDraft.currentCondition} onValueChange={(v) => setAccomDraft((d) => ({ ...d, currentCondition: v }))}>
                <SelectTrigger className="h-9 w-full" displayValue={accomDraft.currentCondition || "Select"}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {OFFICE_CONDITIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Remarks</Label>
              <Input className="h-9" value={accomDraft.remarks} onChange={(e) => setAccomDraft((d) => ({ ...d, remarks: e.target.value }))} />
            </div>
            <Button type="button" size="sm" className="h-9 bg-orange-action hover:bg-orange-600 gap-1" onClick={addAccommodationToTable}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border border-[#d4e8dc]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                  <TableHead className="h-8 text-[11px] font-bold w-8">#</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold">Ownership</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold text-right">Rent</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold">Expiry</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold">Condition</TableHead>
                  <TableHead className="h-8 text-[11px] font-bold">Remarks</TableHead>
                  <TableHead className="h-8 w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {accommodationEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-6 text-center text-xs text-slate-400">
                      Fill the form above and click Add
                    </TableCell>
                  </TableRow>
                ) : accommodationEntries.map((row, i) => {
                  const owned = isOwnedStatus(row.ownershipStatus);
                  return (
                    <TableRow key={row._key}>
                      <TableCell className="py-1.5 text-xs text-slate-500">{i + 1}</TableCell>
                      <TableCell className="py-1.5 text-sm font-medium">{row.ownershipStatus}</TableCell>
                      <TableCell className="py-1.5 text-sm text-right tabular-nums">{owned ? "N/A" : money(row.rentAmount)}</TableCell>
                      <TableCell className="py-1.5 text-sm whitespace-nowrap">{owned ? "N/A" : (row.rentExpiryDate || "—")}</TableCell>
                      <TableCell className="py-1.5 text-sm">{row.currentCondition || "—"}</TableCell>
                      <TableCell className="py-1.5 text-sm max-w-[180px] truncate">{row.remarks || "—"}</TableCell>
                      <TableCell className="py-1.5 text-right">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => setAccommodationEntries((p) => p.filter((r) => r._key !== row._key))}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </Section>
    </PageLayout>
  );
}
