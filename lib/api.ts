import { tokenStore } from "./adminApi";

const BASE_URL = (import.meta.env?.VITE_API_URL as string) || "http://localhost:3001/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) {
    const msg =
      json?.errors?.[0]?.msg || json?.message || json?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

// ─── Annual Reports ───────────────────────────────────────────────────────────

export interface AnnualReportPayload {
  general: {
    year: string;
    state: string;
    staffNo: string;
    totalVehicles: string;
    totalHCF: string;
    totalAccreditedHCF2025: string;
    approvedBudget2025: string;
    totalAmountUtilized2025: string;
  };
  clinical: {
    totalAccreditedCEmONC: string;
    totalCEmONCBeneficiaries: string;
    totalAccreditedFFP: string;
    totalFFPBeneficiaries: string;
  };
  quarterly: Record<string, { q1: string; q2: string; q3: string; q4: string }>;
  status?: "draft" | "submitted";
  submitted_by?: string;
}

export const annualReportApi = {
  create: (payload: AnnualReportPayload) =>
    request<{ success: boolean; data: any }>("/annual-reports", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  saveDraft: (payload: AnnualReportPayload) =>
    request<{ success: boolean; data: any }>("/annual-reports", {
      method: "POST",
      body: JSON.stringify({ ...payload, status: "draft" }),
    }),

  update: (referenceId: string, payload: AnnualReportPayload) =>
    request<{ success: boolean; data: any }>(`/annual-reports/${referenceId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  list: (filters?: { state?: string; year?: string; status?: string }) => {
    const params = new URLSearchParams(
      Object.entries(filters || {}).filter(([, v]) => !!v) as [string, string][]
    ).toString();
    return request<{ success: boolean; data: any[] }>(
      `/annual-reports${params ? `?${params}` : ""}`
    );
  },

  get: (referenceId: string) =>
    request<{ success: boolean; data: any }>(`/annual-reports/${referenceId}`),

  updateStatus: (referenceId: string, status: string) =>
    request<{ success: boolean; data: any }>(`/annual-reports/${referenceId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  /** State-coordinator, zonal-coordinator, or SDO approves a report */
  approve: (referenceId: string, note?: string) =>
    request<{ success: boolean; data: any; message: string }>(`/annual-reports/${referenceId}/approve`, {
      method: "PATCH",
      body: JSON.stringify({ note }),
    }),

  /** State-coordinator, zonal-coordinator, or SDO rejects a report */
  reject: (referenceId: string, reason: string) =>
    request<{ success: boolean; data: any; message: string }>(`/annual-reports/${referenceId}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }),

  delete: (referenceId: string) =>
    request<{ success: boolean; message: string }>(`/annual-reports/${referenceId}`, {
      method: "DELETE",
    }),

  /** Aggregated state operational data from monthly departmental reports */
  getOperationalData: (
    year: number,
    filters?: { state_id?: number; zone_id?: number }
  ) => {
    const params = new URLSearchParams({ year: String(year) });
    if (filters?.state_id) params.set("state_id", String(filters.state_id));
    if (filters?.zone_id) params.set("zone_id", String(filters.zone_id));
    return request<{ success: boolean; data: OperationalDataResponse }>(
      `/annual-reports/operational-data?${params}`
    );
  },
};

export interface OperationalDataResponse {
  year: number;
  title: string;
  zone_id: number | null;
  zone_name: string | null;
  state_id: number | null;
  state_name: string | null;
  rows: OperationalDataRow[];
  state_count: number;
  source: string;
}

export interface QuarterlyBlock {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  sub_total: number;
}

export interface OperationalDataRow {
  sn: number;
  state_id: number;
  state: string;
  zone_id: number;
  zone: string | null;
  reporting_year: number;
  staff_no: number | null;
  total_vehicles: number | null;
  total_hcf_under_nhia: number | null;
  total_accredited_hcf: number | null;
  approved_budget: number | null;
  total_amount_utilized: number;
  cemonc_accredited_hcf: number | null;
  cemonc_beneficiaries: number | null;
  ffp_accredited_facilities: number | null;
  ffp_beneficiaries: number | null;
  gifship_enrolments: QuarterlyBlock;
  gifship_premium: QuarterlyBlock;
  ops_count: QuarterlyBlock;
  fsship_new_enrolments: QuarterlyBlock;
  extra_dependants: QuarterlyBlock;
  extra_dependant_premium: QuarterlyBlock;
  additional_dependants: QuarterlyBlock;
  change_of_provider: QuarterlyBlock;
  bhcpf_beneficiaries: number | null;
  bhcpf_facilities: number | null;
  tiship_lives: number | null;
  mha_lives: number | null;
  sshia_lives: number | null;
  complaints_registered: number;
  complaints_resolved: number;
  complaints_escalated: number;
  igr: QuarterlyBlock;
  qa_conducted: QuarterlyBlock;
  accreditation_requests: QuarterlyBlock;
  accreditation_conducted: QuarterlyBlock;
  marketing_sensitization: QuarterlyBlock;
  stakeholder_meetings: number;
  media_appearances: number;
  reconciliation_meetings: number;
  total_indebtedness: number;
  amount_recovered: number;
  months_with_data: { finance: number; programmes: number; sqa: number };
}

// ─── Stock Verification ───────────────────────────────────────────────────────

export const stockApi = {
  getZones: () =>
    request<{ success: boolean; data: any[] }>("/stock/zones"),

  getStates: (zoneId?: number | string) =>
    request<{ success: boolean; data: any[] }>(
      `/stock/states${zoneId ? `?zone_id=${zoneId}` : ""}`
    ),

  getDepartments: (stateId?: number | string) =>
    request<{ success: boolean; data: any[] }>(
      `/stock/departments${stateId ? `?state_id=${stateId}` : ""}`
    ),

  getUnits: (departmentId?: number | string) =>
    request<{ success: boolean; data: any[] }>(
      `/stock/units${departmentId ? `?department_id=${departmentId}` : ""}`
    ),

  getAssets: (
    stateId?: number | string,
    unitId?: number | string,
    status: "all" | "active" | "inactive" = "all",
  ) => {
    const params = new URLSearchParams();
    if (stateId) params.set("state_id", String(stateId));
    if (unitId)  params.set("unit_id",  String(unitId));
    params.set("status", status);
    const qs = params.toString();
    return request<{ success: boolean; data: any[] }>(`/stock/assets${qs ? `?${qs}` : ""}`);
  },

  createAsset: (payload: any) =>
    request<{ success: boolean; data: any }>("/stock/assets", {
      method: "POST", body: JSON.stringify(payload),
    }),

  updateAsset: (id: number | string, payload: any) =>
    request<{ success: boolean; data: any }>(`/stock/assets/${id}`, {
      method: "PUT", body: JSON.stringify(payload),
    }),

  setAssetStatus: (id: number | string, is_active: boolean) =>
    request<{ success: boolean; message: string; data: any }>(`/stock/assets/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ is_active }),
    }),

  listVerifications: (filters?: { zone_id?: string; state_id?: string; status?: string; type?: string }) => {
    const params = new URLSearchParams(
      Object.entries(filters || {}).filter(([, v]) => !!v) as [string, string][]
    ).toString();
    return request<{ success: boolean; data: any[] }>(
      `/stock/verifications${params ? `?${params}` : ""}`
    );
  },

  getVerification: (id: number | string) =>
    request<{ success: boolean; data: any }>(`/stock/verifications/${id}`),

  createVerification: (payload: any) =>
    request<{ success: boolean; data: any }>("/stock/verifications", {
      method: "POST", body: JSON.stringify(payload),
    }),

  updateVerification: (id: number | string, payload: any) =>
    request<{ success: boolean; data: any }>(`/stock/verifications/${id}`, {
      method: "PUT", body: JSON.stringify(payload),
    }),

  updateStatus: (id: number | string, status: string) =>
    request<{ success: boolean; data: any }>(`/stock/verifications/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    }),

  getDashboard: (filters?: { state_id?: string; zone_id?: string }) => {
    const params = new URLSearchParams(
      Object.entries(filters || {}).filter(([, v]) => !!v) as [string, string][]
    ).toString();
    return request<{ success: boolean; data: any }>(`/stock/dashboard${params ? `?${params}` : ""}`);
  },

  getDashboardDrill: (filters?: Record<string, string | undefined>) => {
    const params = new URLSearchParams(
      Object.entries(filters || {}).filter(([, v]) => !!v) as [string, string][]
    ).toString();
    return request<{ success: boolean; data: import("@/components/dashboard/DashboardDrillPanel").DrillRow[] }>(
      `/stock/dashboard/drill${params ? `?${params}` : ""}`,
    );
  },

  /** Store inventory catalog — maps to existing /store-management routes */
  getInventoryItems: () =>
    request<{ success: boolean; data: any[] }>("/store-management/inventory/items"),

  getInventoryItem: (id: number | string) =>
    request<{ success: boolean; data: any }>(`/store-management/inventory/items/${id}`),

  createInventoryItem: (payload: any) =>
    request<{ success: boolean; data: any }>("/store-management/inventory/items", {
      method: "POST", body: JSON.stringify(payload),
    }),

  /** Supply pre-verification — maps to existing /store-management routes */
  getSupplyVerifications: () =>
    request<{ success: boolean; data: any[] }>("/store-management/verification/supply"),

  getSupplyVerification: (id: number | string) =>
    request<{ success: boolean; data: any }>(`/store-management/verification/supply/${id}`),

  createSupplyVerification: (payload: any) =>
    request<{ success: boolean; data: any; inventoryPosted?: any[] }>("/store-management/verification/supply", {
      method: "POST", body: JSON.stringify(payload),
    }),

  /** Physical Asset Verification — audits Master Register (StoreAsset) */
  getPhysicalVerifications: (filters?: { status?: string; type?: string }) => {
    const params = new URLSearchParams(
      Object.entries(filters || {}).filter(([, v]) => !!v) as [string, string][]
    ).toString();
    return request<{ success: boolean; data: any[] }>(
      `/store-management/verification/physical${params ? `?${params}` : ""}`
    );
  },

  getPhysicalVerification: (id: number | string) =>
    request<{ success: boolean; data: any }>(`/store-management/verification/physical/${id}`),

  createPhysicalVerification: (payload: any) =>
    request<{ success: boolean; data: any }>("/store-management/verification/physical", {
      method: "POST", body: JSON.stringify(payload),
    }),

  getStockIssues: () =>
    request<{ success: boolean; data: any[] }>("/store-management/stores/issues"),

  createStockIssue: (payload: any) =>
    request<{ success: boolean; data: any }>("/store-management/stores/issues", {
      method: "POST", body: JSON.stringify(payload),
    }),

  getConversions: () =>
    request<{ success: boolean; data: any[] }>("/store-management/inventory/conversions"),

  capitaliseInventory: (payload: any) =>
    request<{ success: boolean; data: any }>("/store-management/inventory/capitalise", {
      method: "POST", body: JSON.stringify(payload),
    }),

  getInventoryMovements: (id: number | string) =>
    request<{ success: boolean; data: any[] }>(`/store-management/inventory/items/${id}/movements`),

  updatePhysicalVerification: (id: number | string, payload: any) =>
    request<{ success: boolean; data: any }>(`/store-management/verification/physical/${id}`, {
      method: "PUT", body: JSON.stringify(payload),
    }),

  // Transfers
  getTransfers: () =>
    request<{ success: boolean; data: any[] }>("/store-management/transfers"),

  createTransfer: (payload: any) =>
    request<{ success: boolean; data: any }>("/store-management/transfers", {
      method: "POST", body: JSON.stringify(payload),
    }),

  updateTransfer: (id: number | string, payload: any) =>
    request<{ success: boolean; data: any }>(`/store-management/transfers/${id}`, {
      method: "PUT", body: JSON.stringify(payload),
    }),

  // Maintenance
  getMaintenance: () =>
    request<{ success: boolean; data: any[] }>("/store-management/maintenance"),

  createMaintenance: (payload: any) =>
    request<{ success: boolean; data: any }>("/store-management/maintenance", {
      method: "POST", body: JSON.stringify(payload),
    }),

  // Disposal
  getDisposals: () =>
    request<{ success: boolean; data: any[] }>("/store-management/disposal"),

  createDisposal: (payload: any) =>
    request<{ success: boolean; data: any }>("/store-management/disposal", {
      method: "POST", body: JSON.stringify(payload),
    }),

  // Store assets (for transfer/maintenance/disposal pickers)
  getStoreAssets: () =>
    request<{ success: boolean; data: any[] }>("/store-management/assets"),
};

// ─── Monthly Reports ──────────────────────────────────────────────────────────

export type MonthlyDept = "finance" | "programmes" | "sqa";

const monthlyBase = (dept: MonthlyDept) => `/monthly/${dept}`;

const makeDeptApi = (dept: MonthlyDept) => ({
  list: (filters?: { state_id?: string; year?: string; month?: string; status?: string; section?: string }) => {
    const p = new URLSearchParams(Object.entries(filters || {}).filter(([,v]) => !!v) as [string,string][]).toString();
    return request<{ success: boolean; data: any[] }>(`${monthlyBase(dept)}${p ? `?${p}` : ""}`);
  },
  aggregate: (state_id: string, year: string) =>
    request<{ success: boolean; data: any[] }>(`${monthlyBase(dept)}/aggregate?state_id=${state_id}&year=${year}`),
  get: (id: number | string) =>
    request<{ success: boolean; data: any }>(`${monthlyBase(dept)}/${id}`),
  create: (payload: any) =>
    request<{ success: boolean; data: any }>(monthlyBase(dept), { method: "POST", body: JSON.stringify(payload) }),
  update: (id: number | string, payload: any) =>
    request<{ success: boolean; data: any }>(`${monthlyBase(dept)}/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  updateStatus: (id: number | string, status: string) =>
    request<{ success: boolean; data: any }>(`${monthlyBase(dept)}/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  approve: (id: number | string, note?: string) =>
    request<{ success: boolean; data: any; message: string }>(`${monthlyBase(dept)}/${id}/approve`, { method: "PATCH", body: JSON.stringify({ note }) }),
  reject: (id: number | string, reason: string) =>
    request<{ success: boolean; data: any; message: string }>(`${monthlyBase(dept)}/${id}/reject`, { method: "PATCH", body: JSON.stringify({ reason }) }),
});

export const monthlyApi = {
  finance:    makeDeptApi("finance"),
  programmes: makeDeptApi("programmes"),
  sqa:        makeDeptApi("sqa"),
};

// ─── SERVICOM M&E ─────────────────────────────────────────────────────────────

const servicomFilters = (filters?: Record<string, string | undefined>) => {
  const p = new URLSearchParams(
    Object.entries(filters || {}).filter(([, v]) => !!v) as [string, string][],
  ).toString();
  return p ? `?${p}` : "";
};

export const servicomApi = {
  getIndicators: () =>
    request<{ success: boolean; data: any[] }>("/servicom/indicators"),

  getDashboard: (filters?: { state_id?: string; zone_id?: string; from?: string; to?: string }) =>
    request<{ success: boolean; data: any }>(`/servicom/dashboard${servicomFilters(filters)}`),

  getDashboardDrill: (filters?: Record<string, string | undefined>) =>
    request<{ success: boolean; data: import("@/components/dashboard/DashboardDrillPanel").DrillRow[] }>(
      `/servicom/dashboard/drill${servicomFilters(filters)}`,
    ),

  listFacilities: (filters?: { state_id?: string; zone_id?: string }) =>
    request<{ success: boolean; data: any[] }>(`/servicom/facilities${servicomFilters(filters)}`),

  listVisits: (filters?: Record<string, string | undefined>) =>
    request<{ success: boolean; data: any[] }>(`/servicom/visits${servicomFilters(filters)}`),

  getVisit: (id: number | string) =>
    request<{ success: boolean; data: any }>(`/servicom/visits/${id}`),

  createVisit: (payload: any) =>
    request<{ success: boolean; data: any }>("/servicom/visits", {
      method: "POST", body: JSON.stringify(payload),
    }),

  updateVisit: (id: number | string, payload: any) =>
    request<{ success: boolean; data: any }>(`/servicom/visits/${id}`, {
      method: "PUT", body: JSON.stringify(payload),
    }),

  submitVisit: (id: number | string) =>
    request<{ success: boolean; data: any }>(`/servicom/visits/${id}/submit`, { method: "PATCH" }),

  approveVisit: (id: number | string) =>
    request<{ success: boolean; data: any }>(`/servicom/visits/${id}/approve`, { method: "PATCH" }),

  returnVisit: (id: number | string, reason: string) =>
    request<{ success: boolean; data: any }>(`/servicom/visits/${id}/return`, {
      method: "PATCH", body: JSON.stringify({ reason }),
    }),

  uploadEvidence: (visitId: number | string, file: File, description?: string) => {
    const token = tokenStore.get();
    const form = new FormData();
    form.append("file", file);
    if (description) form.append("description", description);
    return fetch(`${BASE_URL}/servicom/visits/${visitId}/evidence`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (res) => {
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Upload failed");
      return json as { success: boolean; data: any };
    });
  },

  listInvestigatingOfficers: (filters?: Record<string, string | undefined>) =>
    request<{ success: boolean; data: {
      id: number; name: string; staff_id?: string; role?: string;
      department?: string | null; department_code?: string | null; unit?: string | null;
    }[] }>(
      `/servicom/investigating-officers${servicomFilters(filters)}`,
    ),

  listComplaints: (filters?: Record<string, string | undefined>) =>
    request<{ success: boolean; data: any[] }>(`/servicom/complaints${servicomFilters(filters)}`),

  listComplaintSla: () =>
    request<{ success: boolean; data: any[] }>("/servicom/complaint-sla"),

  getComplaint: (id: number | string) =>
    request<{ success: boolean; data: any }>(`/servicom/complaints/${id}`),

  createComplaint: (payload: any) =>
    request<{ success: boolean; data: any }>("/servicom/complaints", {
      method: "POST", body: JSON.stringify(payload),
    }),

  updateComplaint: (id: number | string, payload: any) =>
    request<{ success: boolean; data: any }>(`/servicom/complaints/${id}`, {
      method: "PUT", body: JSON.stringify(payload),
    }),

  listSatisfactionSurveys: (filters?: Record<string, string | undefined>) =>
    request<{ success: boolean; data: any[] }>(`/servicom/satisfaction-surveys${servicomFilters(filters)}`),

  getSatisfactionSurvey: (id: number | string) =>
    request<{ success: boolean; data: any }>(`/servicom/satisfaction-surveys/${id}`),

  createSatisfactionSurvey: (payload: any) =>
    request<{ success: boolean; data: any }>("/servicom/satisfaction-surveys", {
      method: "POST", body: JSON.stringify(payload),
    }),

  updateSatisfactionSurvey: (id: number | string, payload: any) =>
    request<{ success: boolean; data: any }>(`/servicom/satisfaction-surveys/${id}`, {
      method: "PUT", body: JSON.stringify(payload),
    }),

  listCommentCards: (filters?: Record<string, string | undefined>) =>
    request<{ success: boolean; data: any[] }>(`/servicom/comment-cards${servicomFilters(filters)}`),

  getCommentCard: (id: number | string) =>
    request<{ success: boolean; data: any }>(`/servicom/comment-cards/${id}`),

  createCommentCard: (payload: any) =>
    request<{ success: boolean; data: any }>("/servicom/comment-cards", {
      method: "POST", body: JSON.stringify(payload),
    }),

  updateCommentCard: (id: number | string, payload: any) =>
    request<{ success: boolean; data: any }>(`/servicom/comment-cards/${id}`, {
      method: "PUT", body: JSON.stringify(payload),
    }),
};

// ─── State Office Unified Monthly Reports ─────────────────────────────────────

export type StateOfficeReportType =
  | "enrolment" | "migration" | "cemonc"
  | "complaints" | "accreditation" | "stakeholder" | "hmo-selection" | "challenges"
  | "igr" | "sshia-financial" | "expenditure-profile";

const makeStateOfficeApi = (type: StateOfficeReportType) => ({
  list: (filters?: { state_id?: string; zone_id?: string; year?: string; month?: string; status?: string }) => {
    const p = new URLSearchParams(Object.entries(filters || {}).filter(([, v]) => !!v) as [string, string][]).toString();
    return request<{ success: boolean; data: any[] }>(
      `/state-office/${type}/reports${p ? `?${p}` : ""}`
    );
  },
  get: (id: number | string) =>
    request<{ success: boolean; data: any }>(`/state-office/${type}/reports/${id}`),
  create: (payload: any) =>
    request<{ success: boolean; data: any }>(`/state-office/${type}/reports`, {
      method: "POST", body: JSON.stringify(payload),
    }),
  update: (id: number | string, payload: any) =>
    request<{ success: boolean; data: any }>(`/state-office/${type}/reports/${id}`, {
      method: "PUT", body: JSON.stringify(payload),
    }),
  updateStatus: (id: number | string, status: string) =>
    request<{ success: boolean; data: any }>(`/state-office/${type}/reports/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    }),
});

export const stateOfficeApi = {
  enrolment: makeStateOfficeApi("enrolment"),
  migration: makeStateOfficeApi("migration"),
  cemonc:    makeStateOfficeApi("cemonc"),
  complaints: makeStateOfficeApi("complaints"),
  accreditation: makeStateOfficeApi("accreditation"),
  stakeholder: makeStateOfficeApi("stakeholder"),
  "hmo-selection": makeStateOfficeApi("hmo-selection"),
  challenges: makeStateOfficeApi("challenges"),
  igr: makeStateOfficeApi("igr"),
  "sshia-financial": makeStateOfficeApi("sshia-financial"),
  "expenditure-profile": makeStateOfficeApi("expenditure-profile"),
  "weekly-actionable": makeStateOfficeApi("weekly-actionable"),
  "contracted-services": makeStateOfficeApi("contracted-services"),
};

const stateOfficeFilters = (filters?: Record<string, string | undefined>) => {
  const p = new URLSearchParams(
    Object.entries(filters || {}).filter(([, v]) => !!v) as [string, string][]
  ).toString();
  return p ? `?${p}` : "";
};

export const stateOfficeDashboardApi = {
  getDashboard: (filters?: { state_id?: string; zone_id?: string; year?: string; month?: string }) =>
    request<{ success: boolean; data: any }>(`/state-office/dashboard${stateOfficeFilters(filters)}`),

  getDashboardDrill: (filters?: Record<string, string | undefined>) =>
    request<{ success: boolean; data: import("@/components/dashboard/DashboardDrillPanel").DrillRow[] }>(
      `/state-office/dashboard/drill${stateOfficeFilters(filters)}`,
    ),
};

export const stateOfficeEnrolleeComplaintsApi = {
  summary: (filters?: { state_id?: string; zone_id?: string; year?: string; month?: string }) =>
    request<{ success: boolean; data: {
      summary: { against_type: string; count: number }[];
      status: { status: string; count: number }[];
      total_complaints: number;
    } }>(`/state-office/enrollee-complaints/summary${stateOfficeFilters(filters)}`),
  list: (filters?: {
    state_id?: string; zone_id?: string; year?: string; month?: string;
    against_type?: string; status?: string;
  }) =>
    request<{ success: boolean; data: any[] }>(
      `/state-office/enrollee-complaints${stateOfficeFilters(filters)}`
    ),
  get: (id: number | string) =>
    request<{ success: boolean; data: any }>(`/state-office/enrollee-complaints/${id}`),
  create: (payload: any) =>
    request<{ success: boolean; data: any }>("/state-office/enrollee-complaints", {
      method: "POST", body: JSON.stringify(payload),
    }),
  update: (id: number | string, payload: any) =>
    request<{ success: boolean; data: any }>(`/state-office/enrollee-complaints/${id}`, {
      method: "PUT", body: JSON.stringify(payload),
    }),
};

export const hmoProvidersApi = {
  list: (filters?: { q?: string; limit?: string }) => {
    const p = new URLSearchParams(
      Object.entries(filters || {}).filter(([, v]) => !!v) as [string, string][],
    ).toString();
    return request<{ success: boolean; data: any[] }>(`/hmo-providers${p ? `?${p}` : ""}`);
  },
  get: (id: number | string) =>
    request<{ success: boolean; data: any }>(`/hmo-providers/${id}`),
};

export const hcfFacilitiesApi = {
  list: (filters?: { q?: string; state_id?: string; service?: string; unique?: string; limit?: string }) => {
    const p = new URLSearchParams(
      Object.entries(filters || {}).filter(([, v]) => !!v) as [string, string][],
    ).toString();
    return request<{ success: boolean; data: any[] }>(
      `/servicom/hcf-facilities${p ? `?${p}` : ""}`,
    );
  },
  listServices: () =>
    request<{ success: boolean; data: string[] }>("/servicom/hcf-facilities/services"),
  get: (id: number | string) =>
    request<{ success: boolean; data: any }>(`/hcf-facilities/${id}`),
};

export const stateOfficeAccreditedProvidersApi = {
  list: (filters: { type: "hmo" | "hcp"; q?: string; limit?: string; state_id?: string }) =>
    request<{ success: boolean; data: any[] }>(
      `/accredited-providers${stateOfficeFilters(filters)}`
    ),
  sync: () =>
    request<{ success: boolean; data: { hmoCount: number; hcpCount: number; total: number } }>(
      "/state-office/accredited-providers/sync", { method: "POST" }
    ),
};

export const stateOfficeReconciliationApi = {
  list: (filters?: { state_id?: string; zone_id?: string; year?: string; month?: string }) =>
    request<{ success: boolean; data: any[] }>(
      `/state-office/reconciliation-meetings${stateOfficeFilters(filters)}`
    ),
  create: (payload: any) =>
    request<{ success: boolean; data: any }>("/state-office/reconciliation-meetings", {
      method: "POST", body: JSON.stringify(payload),
    }),
  update: (id: number | string, payload: any) =>
    request<{ success: boolean; data: any }>(`/state-office/reconciliation-meetings/${id}`, {
      method: "PUT", body: JSON.stringify(payload),
    }),
};

export const stateOfficeComplianceVisitsApi = {
  list: (filters?: { state_id?: string; zone_id?: string; year?: string; month?: string; status?: string }) =>
    request<{ success: boolean; data: any[] }>(
      `/state-office/compliance-visits${stateOfficeFilters(filters)}`
    ),
  get: (id: number | string) =>
    request<{ success: boolean; data: any }>(`/state-office/compliance-visits/${id}`),
  create: (payload: any) =>
    request<{ success: boolean; data: any }>("/state-office/compliance-visits", {
      method: "POST", body: JSON.stringify(payload),
    }),
  update: (id: number | string, payload: any) =>
    request<{ success: boolean; data: any }>(`/state-office/compliance-visits/${id}`, {
      method: "PUT", body: JSON.stringify(payload),
    }),
};

// ─── SQA Compliance Management (Facility Compliance Reporting) ────────────────

const complianceFilters = (filters?: Record<string, string | undefined>) => {
  const p = new URLSearchParams(
    Object.entries(filters || {}).filter(([, v]) => !!v) as [string, string][],
  ).toString();
  return p ? `?${p}` : "";
};

export const complianceApi = {
  list: (filters?: { state_id?: string; zone_id?: string; year?: string; status?: string }) =>
    request<{ success: boolean; data: any[] }>(
      `/sqa/compliance-reports${complianceFilters(filters)}`,
    ),
  get: (id: number | string) =>
    request<{ success: boolean; data: any }>(`/sqa/compliance-reports/${id}`),
  create: (payload: any) =>
    request<{ success: boolean; data: any }>("/sqa/compliance-reports", {
      method: "POST", body: JSON.stringify(payload),
    }),
  update: (id: number | string, payload: any) =>
    request<{ success: boolean; data: any }>(`/sqa/compliance-reports/${id}`, {
      method: "PUT", body: JSON.stringify(payload),
    }),
  updateStatus: (id: number | string, status: string) =>
    request<{ success: boolean; data: any }>(`/sqa/compliance-reports/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    }),
};

