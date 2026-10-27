const BASE_URL = (import.meta.env?.VITE_API_URL as string) || "http://localhost:3001/api";

// ─── Token storage ────────────────────────────────────────────────────────────
export const tokenStore = {
  get: () => localStorage.getItem("nhia@token"),
  set: (t: string) => localStorage.setItem("nhia@token", t),
  clear: () => localStorage.removeItem("nhia@token"),
};

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
    const msg = json?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type Role = string;

export type ReportScope = "national" | "zonal" | "state" | "none";

export interface AppRole {
  id: number;
  key: string;
  label: string;
  staff_id_prefix: string;
  report_scope: ReportScope;
  can_create_monthly: boolean;
  can_review_monthly: boolean;
  description?: string | null;
  is_system: boolean;
  is_active: boolean;
  department_code?: string | null;
  default_access?: { access_to: string; functionalities: string[] }[] | null;
}

export interface AdminUser {
  id: number; name: string; staff_id: string; email?: string;
  role: Role; zonal_code?: string; zone_id?: string; state_code?: string; state_id?: string; department_id?: number | string; department_code?: string; unit_id?: number | string; unit_code?: string;
  role_label?: string;
  role_config?: { report_scope: ReportScope; can_create_monthly: boolean; can_review_monthly: boolean };
  /** Structured access — array of {access_to, functionalities[]} */
  functionalities?: { access_to: string; functionalities: string[] }[];
  is_active: boolean; zone?: ZonalOffice; state?: StateOffice; department?: Department; unit?: Unit;
  createdAt: string;
}
export interface ZonalOffice { zonal_code: string; description: string; states?: StateOffice[]; }
export interface StateOffice {
  code: string;
  description: string;
  zonal_code: string;
  is_hq?: boolean;
  is_zonal_office?: boolean;
  zone?: ZonalOffice;
}
export interface Department { department_code: string; name: string; description?: string; units?: Unit[]; }
export interface Unit { unit_code: string; name: string; description?: string; department_code: string; department?: Department; }

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (staff_id: string, password: string) =>
    request<{ success: boolean; token: string; user: AdminUser }>("/auth/login", {
      method: "POST", body: JSON.stringify({ staff_id, password }),
    }),
  me: () => request<{ success: boolean; user: AdminUser }>("/auth/me"),
};

// ─── Admin CRUD helpers ───────────────────────────────────────────────────────
const qs = (p?: Record<string, any>) => {
  if (!p) return "";
  const s = new URLSearchParams(
    Object.entries(p).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])
  ).toString();
  return s ? `?${s}` : "";
};

// Users
export const usersApi = {
  list: (params?: { role?: string; zonal_code?: string; zone_id?: string; state_code?: string; state_id?: string; search?: string; page?: number; limit?: number }) =>
    request<{ success: boolean; data: AdminUser[]; total: number; pages: number }>(`/admin/users${qs(params)}`),
  get: (id: number) => request<{ success: boolean; data: AdminUser }>(`/admin/users/${id}`),
  create: (body: Partial<AdminUser> & { password: string }) =>
    request<{ success: boolean; data: AdminUser }>("/admin/users", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: Partial<AdminUser> & { password?: string }) =>
    request<{ success: boolean; data: AdminUser }>(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  updatePrivileges: (id: number, access: { access_to: string; functionalities: string[] }[]) =>
    request<{ success: boolean; data: AdminUser }>(`/admin/users/${id}/privileges`, {
      method: "PATCH", body: JSON.stringify({ access }),
    }),
  deactivate: (id: number) =>
    request<{ success: boolean; message: string; data: AdminUser }>(`/admin/users/${id}/deactivate`, { method: "PATCH" }),
  activate: (id: number) =>
    request<{ success: boolean; message: string; data: AdminUser }>(`/admin/users/${id}/activate`, { method: "PATCH" }),
};

// Zones
export const zonesApi = {
  list: () => request<{ success: boolean; data: ZonalOffice[] }>("/admin/zones"),
  create: (body: ZonalOffice) =>
    request<{ success: boolean; data: ZonalOffice }>("/admin/zones", { method: "POST", body: JSON.stringify(body) }),
  update: (zonal_code: string, body: Partial<ZonalOffice>) =>
    request<{ success: boolean; data: ZonalOffice }>(`/admin/zones/${encodeURIComponent(zonal_code)}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (zonal_code: string) =>
    request<{ success: boolean; message: string }>(`/admin/zones/${encodeURIComponent(zonal_code)}`, { method: "DELETE" }),
};

// States
export const statesApi = {
  list: (zonal_code?: string) =>
    request<{ success: boolean; data: StateOffice[] }>(`/admin/states${qs({ zonal_code })}`),
  create: (body: StateOffice) =>
    request<{ success: boolean; data: StateOffice }>("/admin/states", { method: "POST", body: JSON.stringify(body) }),
  update: (code: string, body: Partial<StateOffice>) =>
    request<{ success: boolean; data: StateOffice }>(`/admin/states/${encodeURIComponent(code)}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (code: string) =>
    request<{ success: boolean; message: string }>(`/admin/states/${encodeURIComponent(code)}`, { method: "DELETE" }),
};

// Departments
export const departmentsApi = {
  list: () => request<{ success: boolean; data: Department[] }>("/admin/departments"),
  create: (body: Omit<Department, "department_code"> & { department_code?: string }) =>
    request<{ success: boolean; data: Department }>("/admin/departments", { method: "POST", body: JSON.stringify(body) }),
  update: (department_code: string, body: Partial<Department>) =>
    request<{ success: boolean; data: Department }>(`/admin/departments/${encodeURIComponent(department_code)}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (department_code: string) =>
    request<{ success: boolean; message: string }>(`/admin/departments/${encodeURIComponent(department_code)}`, { method: "DELETE" }),
};

// Units
export const unitsApi = {
  list: (department_code?: number | string) =>
    request<{ success: boolean; data: Unit[] }>(`/admin/units${qs({ department_code })}`),
  create: (body: Omit<Unit, "unit_code"> & { unit_code?: string; department_id?: string }) =>
    request<{ success: boolean; data: Unit }>("/admin/units", { method: "POST", body: JSON.stringify(body) }),
  update: (unit_code: string, body: Partial<Unit>) =>
    request<{ success: boolean; data: Unit }>(`/admin/units/${encodeURIComponent(unit_code)}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (unit_code: string) =>
    request<{ success: boolean; message: string }>(`/admin/units/${encodeURIComponent(unit_code)}`, { method: "DELETE" }),
};

// Roles
export const rolesApi = {
  list: (activeOnly = false) =>
    request<{ success: boolean; data: AppRole[] }>(`/admin/roles${qs({ active: activeOnly ? "true" : undefined })}`),
  accessTemplate: (role: string, unit_code?: string) =>
    request<{ success: boolean; data: { access_to: string; functionalities: string[] }[]; department_code?: string | null }>(
      `/admin/access-template${qs({ role, unit_code })}`,
    ),
  create: (body: Omit<AppRole, "id" | "is_system">) =>
    request<{ success: boolean; data: AppRole }>("/admin/roles", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: Partial<AppRole>) =>
    request<{ success: boolean; data: AppRole }>(`/admin/roles/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/admin/roles/${id}`, { method: "DELETE" }),
};
