import { tokenStore } from "@/lib/adminApi";

const BASE_URL = (import.meta.env?.VITE_API_URL as string) || "http://localhost:3001/api";
const API_BASE = `${BASE_URL}/store-management`;

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = tokenStore.get();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "API Request Failed");
  }
  return data;
}

export const storeManagementApi = {
  getAssets: () => fetchWithAuth("/assets"),
  getAssetById: (id: number | string) => fetchWithAuth(`/assets/${id}`),
  createAsset: (payload: any) => fetchWithAuth("/assets", { method: "POST", body: JSON.stringify(payload) }),
  updateAsset: (id: number | string, payload: any) => fetchWithAuth(`/assets/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteAsset: (id: number | string) => fetchWithAuth(`/assets/${id}`, { method: "DELETE" }),

  getInventoryItems: () => fetchWithAuth("/inventory/items"),
  createInventoryItem: (payload: any) => fetchWithAuth("/inventory/items", { method: "POST", body: JSON.stringify(payload) }),

  getGoodsReceipts: () => fetchWithAuth("/inventory/receipts"),
  createGoodsReceipt: (payload: any) => fetchWithAuth("/inventory/receipts", { method: "POST", body: JSON.stringify(payload) }),

  getStockIssues: () => fetchWithAuth("/stores/issues"),
  createStockIssue: (payload: any) => fetchWithAuth("/stores/issues", { method: "POST", body: JSON.stringify(payload) }),

  getTransfers: () => fetchWithAuth("/transfers"),
  createTransfer: (payload: any) => fetchWithAuth("/transfers", { method: "POST", body: JSON.stringify(payload) }),
  updateTransfer: (id: number | string, payload: any) => fetchWithAuth(`/transfers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  getSupplyVerifications: () => fetchWithAuth("/verification/supply"),
  createSupplyVerification: (payload: any) => fetchWithAuth("/verification/supply", { method: "POST", body: JSON.stringify(payload) }),

  getMaintenance: () => fetchWithAuth("/maintenance"),
  createMaintenance: (payload: any) => fetchWithAuth("/maintenance", { method: "POST", body: JSON.stringify(payload) }),
  getDisposals: () => fetchWithAuth("/disposal"),
  createDisposal: (payload: any) => fetchWithAuth("/disposal", { method: "POST", body: JSON.stringify(payload) }),

  getPrepaymentAnalyses: () => fetchWithAuth("/prepayment-analysis"),
  getPrepaymentAnalysisById: (id: number | string) => fetchWithAuth(`/prepayment-analysis/${id}`),
  createPrepaymentAnalysis: async (payload: Record<string, any>, file?: File | null) => {
    const token = tokenStore.get();
    if (file) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.append(k, String(v));
      });
      fd.append("awardLetter", file);
      const res = await fetch(`${API_BASE}/prepayment-analysis`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "API Request Failed");
      return data;
    }
    return fetchWithAuth("/prepayment-analysis", { method: "POST", body: JSON.stringify(payload) });
  },
};
