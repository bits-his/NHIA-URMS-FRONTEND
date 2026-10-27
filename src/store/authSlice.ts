import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AccessEntry } from "@/src/access/types";

export interface AuthStateOffice  { code: string; description: string; zonal_code?: string; }
export interface AuthZonalOffice  { zonal_code: string; description: string; }
export interface AuthDepartment   { department_code: string; name: string; }
export interface AuthUnit         { unit_code: string; name: string; department_code?: string; }

export interface AuthUser {
  id: number;
  name: string;
  staff_id: string;
  email?: string;
  role: string;
  /** Structured access — [{access_to, functionalities[]}] */
  functionalities?: AccessEntry[];
  zonal_code?: string;
  state_code?: string;
  department_code?: string;
  unit_code?: string;
  /** @deprecated legacy numeric ids */
  zone_id?: number | string;
  state_id?: number | string;
  department_id?: number | string;
  unit_id?: number | string;
  is_active?: boolean;
  /** Nested objects returned by the backend on login/me */
  state?:      AuthStateOffice;
  zone?:       AuthZonalOffice;
  department?: AuthDepartment;
  unit?:       AuthUnit;
  role_label?: string;
  role_config?: { report_scope: string; can_create_monthly: boolean; can_review_monthly: boolean };
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

const TOKEN_KEY = "nhia@token";
const USER_KEY  = "nhia@user";

function loadFromStorage(): AuthState {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw   = localStorage.getItem(USER_KEY);
    if (!token || !raw) return { user: null, token: null };
    const user = JSON.parse(raw) as AuthUser;
    return { user, token };
  } catch {
    return { user: null, token: null };
  }
}

const authSlice = createSlice({
  name: "auth",
  initialState: loadFromStorage(),
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: AuthUser; token: string }>) {
      state.user  = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem(TOKEN_KEY, action.payload.token);
      localStorage.setItem(USER_KEY,  JSON.stringify(action.payload.user));
    },
    logout(state) {
      state.user  = null;
      state.token = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
