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
  role: Role; zone_id?: number; state_id?: number; department_id?: number; unit_id?: number;
  role_label?: string;
  role_config?: { report_scope: ReportScope; can_create_monthly: boolean; can_review_monthly: boolean };
  /** Structured access — array of {access_to, functionalities[]} */
  functionalities?: { access_to: string; functionalities: string[] }[];
  is_active: boolean; zone?: ZonalOffice; state?: StateOffice; department?: Department; unit?: Unit;
  createdAt: string;
}
export interface ZonalOffice { id: number; zonal_code: string; description: string; states?: StateOffice[]; }
export interface StateOffice { id: number; code: string; description: string; zonal_id: number; zone?: ZonalOffice; }
export interface Department { id: number; department_code: string; name: string; description?: string; units?: Unit[]; }
export interface Unit { id: number; unit_code: string; name: string; description?: string; department_id: number; department?: Department; }

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
  list: (params?: { role?: string; zone_id?: number; state_id?: number; search?: string; page?: number; limit?: number }) =>
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
  create: (body: Omit<ZonalOffice, "id">) =>
    request<{ success: boolean; data: ZonalOffice }>("/admin/zones", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: Partial<ZonalOffice>) =>
    request<{ success: boolean; data: ZonalOffice }>(`/admin/zones/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/admin/zones/${id}`, { method: "DELETE" }),
};

// States
export const statesApi = {
  list: (zone_id?: number) =>
    request<{ success: boolean; data: StateOffice[] }>(`/admin/states${qs({ zone_id })}`),
  create: (body: Omit<StateOffice, "id">) =>
    request<{ success: boolean; data: StateOffice }>("/admin/states", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: Partial<StateOffice>) =>
    request<{ success: boolean; data: StateOffice }>(`/admin/states/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/admin/states/${id}`, { method: "DELETE" }),
};

// Departments
export const departmentsApi = {
  list: () => request<{ success: boolean; data: Department[] }>("/admin/departments"),
  create: (body: Omit<Department, "id">) =>
    request<{ success: boolean; data: Department }>("/admin/departments", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: Partial<Department>) =>
    request<{ success: boolean; data: Department }>(`/admin/departments/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/admin/departments/${id}`, { method: "DELETE" }),
};

// Units
export const unitsApi = {
  list: (department_id?: number) =>
    request<{ success: boolean; data: Unit[] }>(`/admin/units${qs({ department_id })}`),
  create: (body: Omit<Unit, "id">) =>
    request<{ success: boolean; data: Unit }>("/admin/units", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: Partial<Unit>) =>
    request<{ success: boolean; data: Unit }>(`/admin/units/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: number) =>
    request<{ success: boolean; message: string }>(`/admin/units/${id}`, { method: "DELETE" }),
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
