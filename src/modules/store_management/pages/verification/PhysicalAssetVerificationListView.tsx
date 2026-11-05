import React, { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { storeManagementApi } from "@/src/services/storeManagementApi";
import { stockApi } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, Eye, ClipboardCheck, RefreshCw, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { matchesStore } from "../../lib/storeOptions";
import { useCreateReviewAccess } from "@/src/access/createReviewAccess";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";

type ConditionBucket = "good" | "defective" | "missing" | "obsolete" | "retired";

interface Option {
  id: number | string;
  label: string;
  zone_id?: number | string;
}

const DEFAULT_CATEGORIES = [
  "Office Equipment",
  "Computer Equipment",
  "Office Furniture",
  "Motor Vehicles",
  "Plant & Machinery",
  "Furniture & Fittings",
  "Land & Buildings",
  "Medical Equipment",
];

const BUCKET_BADGE: Record<ConditionBucket, { label: string; className: string }> = {
  good: { label: "Good", className: "bg-[#e8f5ee] text-[#0f3d2e]" },
  defective: { label: "Defective", className: "bg-rose-50 text-rose-800" },
  missing: { label: "Missing", className: "bg-slate-100 text-slate-700" },
  obsolete: { label: "Obsolete", className: "bg-amber-100 text-amber-950" },
  retired: { label: "Retired", className: "bg-slate-200 text-slate-700" },
};

function conditionBucket(asset: any): ConditionBucket {
  const blob = [
    asset.physicalCondition,
    asset.operationalStatus,
    asset.status,
    asset.verificationStatus,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\bretir|\bdispos/.test(blob)) return "retired";
  if (/\bobsolete/.test(blob)) return "obsolete";
  if (/\bmissing|\blost/.test(blob)) return "missing";
  if (/\bdefect|\bpoor|\bdamaged|\brepair/.test(blob)) return "defective";
  return "good";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PhysicalAssetVerificationListView() {
  const navigate = useNavigate();
  const { canCreate, createOnly } = useCreateReviewAccess();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(!createOnly);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<ConditionBucket | "all">("all");

  const [zones, setZones] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [zoneFilter, setZoneFilter] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await storeManagementApi.getAssets();
      if (res.success && Array.isArray(res.data)) setAssets(res.data);
      else if (Array.isArray(res)) setAssets(res);
      else setAssets([]);
    } catch (err: any) {
      setError(err.message || "Failed to load assets");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (createOnly) return;
    fetchAssets();
  }, [createOnly]);

  useEffect(() => {
    if (!createOnly) return;
    navigate("/store-management/assets/register", { replace: true });
  }, [createOnly, navigate]);

  useEffect(() => {
    if (createOnly) return;
    stockApi
      .getZones()
      .then((r: any) => {
        setZones((r.data || []).map((z: any) => ({ id: z.id, label: z.description })));
      })
      .catch(() => {});
  }, [createOnly]);

  useEffect(() => {
    if (!zoneFilter) {
      stockApi
        .getStates()
        .then((r: any) => {
          setStates((r.data || []).map((s: any) => ({ id: s.id, label: s.description, zone_id: s.zonal_id })));
        })
        .catch(() => setStates([]));
      return;
    }
    stockApi
      .getStates(zoneFilter)
      .then((r: any) => {
        setStates((r.data || []).map((s: any) => ({ id: s.id, label: s.description, zone_id: s.zonal_id })));
      })
      .catch(() => setStates([]));
  }, [zoneFilter]);

  const zoneLabel = useMemo(() => {
    const found = zones.find((z) => String(z.id) === String(zoneFilter));
    return found ? found.label : "";
  }, [zones, zoneFilter]);

  const stateLabel = useMemo(() => {
    const found = states.find((s) => String(s.id) === String(stateFilter));
    return found ? found.label : "";
  }, [states, stateFilter]);

  const categoryOptions = useMemo(() => {
    const list = new Set<string>(DEFAULT_CATEGORIES);
    for (const a of assets) {
      const cat = a.primaryCategory || a.category;
      if (cat && typeof cat === "string") list.add(cat.trim());
    }
    return Array.from(list).sort();
  }, [assets]);

  const matchesLocation = (a: any) => {
    if (zoneFilter) {
      let zoneMatches = false;
      if (a.zone_id && String(a.zone_id) === String(zoneFilter)) {
        zoneMatches = true;
      } else if (a.zone_name && zoneLabel && a.zone_name.toLowerCase().includes(zoneLabel.toLowerCase())) {
        zoneMatches = true;
      } else if (zoneLabel.toLowerCase().includes("headquarters") || zoneLabel.toLowerCase().includes("hq")) {
        if ((a.facilitySite || "").toLowerCase().includes("hq") || (a.officeDeptUnit || "").toLowerCase().includes("hq")) {
          zoneMatches = true;
        }
      }
      if (!zoneMatches && states.length > 0) {
        const stateMatchesInZone = states.some((s) =>
          matchesStore(a.officeDeptUnit, s.label) ||
          matchesStore(a.facilitySite, s.label) ||
          matchesStore(a.location, s.label) ||
          (a.state_id && String(a.state_id) === String(s.id))
        );
        if (stateMatchesInZone) zoneMatches = true;
      }
      if (!zoneMatches) return false;
    }

    if (stateFilter) {
      if (a.state_id && String(a.state_id) === String(stateFilter)) {
        return true;
      }
      if (stateLabel) {
        return (
          matchesStore(a.officeDeptUnit, stateLabel) ||
          matchesStore(a.facilitySite, stateLabel) ||
          matchesStore(a.location, stateLabel) ||
          matchesStore(a.specificLocation, stateLabel)
        );
      }
      return false;
    }

    return true;
  };

  const matchesCategory = (a: any) => {
    if (!categoryFilter) return true;
    const cat = (a.primaryCategory || a.category || "").toLowerCase();
    return cat === categoryFilter.toLowerCase();
  };

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (!matchesLocation(a)) return false;
      if (!matchesCategory(a)) return false;
      if (!q) return true;
      return [
        a.assetId,
        a.assetNumber,
        a.nhiaTagNumber,
        a.name,
        a.assignedCustodian,
        a.custodian,
        a.officeDeptUnit,
        a.primaryCategory,
        a.serialNumber,
        a.facilitySite,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [assets, zoneFilter, stateFilter, categoryFilter, query, states, zoneLabel, stateLabel]);

  const counts = useMemo(() => {
    const next = { good: 0, defective: 0, missing: 0, obsolete: 0, retired: 0 };
    for (const a of searched) next[conditionBucket(a)] += 1;
    return next;
  }, [searched]);

  const filtered = useMemo(() => {
    if (bucket === "all") return searched;
    return searched.filter((a) => conditionBucket(a) === bucket);
  }, [searched, bucket]);

  const toggleBucket = (next: ConditionBucket | "all") => {
    setBucket((prev) => (prev === next ? "all" : next));
  };

  const resetFilters = () => {
    setZoneFilter("");
    setStateFilter("");
    setCategoryFilter("");
    setQuery("");
    setBucket("all");
  };

  const hasActiveFilters = Boolean(zoneFilter || stateFilter || categoryFilter || query || bucket !== "all");

  const statCards = [
    { key: "all" as const, label: "Total", value: searched.length, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]", onClick: () => setBucket("all") },
    { key: "good" as const, label: "Good", value: counts.good, tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100", onClick: () => toggleBucket("good") },
    { key: "defective" as const, label: "Defective", value: counts.defective, tone: "text-rose-800 bg-rose-50/80 border-rose-100", onClick: () => toggleBucket("defective") },
    { key: "missing" as const, label: "Missing", value: counts.missing, tone: "text-slate-600 bg-white border-slate-200", onClick: () => toggleBucket("missing") },
  ];

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "tag",
        header: "Tag",
        accessorFn: (row) => row.assetId || row.assetNumber || row.nhiaTagNumber,
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold tabular-nums text-[#145c3f] whitespace-nowrap">
            {row.original.assetId || row.original.assetNumber || row.original.nhiaTagNumber || `AST-${row.original.id}`}
          </span>
        ),
      },
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.name || "—"}</span>,
      },
      {
        id: "category",
        header: "Category",
        accessorFn: (row) => row.primaryCategory || row.category,
        cell: ({ row }) => (
          <span className="text-slate-700 whitespace-nowrap">{row.original.primaryCategory || row.original.category || "—"}</span>
        ),
      },
      {
        id: "custodian",
        header: "Custodian",
        accessorFn: (row) => row.assignedCustodian || row.custodian,
        cell: ({ row }) => (
          <span className="text-slate-800 whitespace-nowrap">{row.original.assignedCustodian || row.original.custodian || "—"}</span>
        ),
      },
      {
        id: "location",
        header: "Location",
        accessorFn: (row) => row.officeDeptUnit || row.department || row.location,
        cell: ({ row }) => (
          <span className="text-slate-700 whitespace-nowrap">
            {row.original.officeDeptUnit || row.original.department || row.original.location || "—"}
          </span>
        ),
      },
      {
        id: "condition",
        header: "Condition",
        cell: ({ row }) => {
          const tone = BUCKET_BADGE[conditionBucket(row.original)];
          return (
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${tone.className}`}>
              {tone.label}
            </span>
          );
        },
      },
      {
        id: "lastVerified",
        header: "Last verified",
        accessorFn: (row) => row.lastVerificationDate,
        cell: ({ row }) => (
          <span className="text-slate-700 tabular-nums whitespace-nowrap">{formatDate(row.original.lastVerificationDate)}</span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original;
          const id = item.id || item.assetId || item.assetNumber;
          return (
            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
              <Button
                size="sm"
                variant="outline"
                aria-label={`View ${item.name || "asset"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/store-management/assets/detail/${encodeURIComponent(String(id))}`);
                }}
                className="h-8 px-2.5 text-[11px] font-semibold border-slate-200"
              >
                <Eye className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> View
              </Button>
              <Button
                size="sm"
                aria-label={`Verify ${item.name || "asset"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/store-management/verification/verify/asset/${encodeURIComponent(String(item.id))}`);
                }}
                className="h-8 px-2.5 text-[11px] font-semibold bg-[#145c3f] hover:bg-[#0f3d2e] text-white"
              >
                <ClipboardCheck className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Verify
              </Button>
            </div>
          );
        },
      },
    ],
    [navigate],
  );

  if (createOnly) return null;

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 gap-3">
        <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">Physical Asset Verification</h2>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchAssets} disabled={loading} className="gap-2 border-[#d4e8dc]">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
            <Button
              className="bg-orange-action hover:bg-orange-600 gap-2 shadow-md shadow-orange-500/15"
              onClick={() => navigate("/store-management/assets/register")}
            >
              <Plus className="w-4 h-4" /> Register Asset
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-5 space-y-4">
          {error && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statCards.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={c.onClick}
                className={`rounded-sm border px-3 py-2.5 text-left transition-shadow ${c.tone} ${
                  bucket === c.key ? "ring-2 ring-[#1a7a52] ring-offset-1" : ""
                }`}
              >
                <p className="text-2xl font-bold tabular-nums">{loading ? "—" : c.value}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{c.label}</p>
              </button>
            ))}
          </div>

          <Card className="rounded-sm border border-[#d4e8dc] py-0 gap-0 shadow-2xs bg-white">
            <CardContent className="py-1.5 px-3 space-y-1.5">
              <div className="grid grid-flow-col auto-cols-fr gap-2.5 items-end">
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Zone</Label>
                  <Select
                    value={zoneFilter || "ALL"}
                    onValueChange={(val) => {
                      setZoneFilter(val === "ALL" ? "" : val);
                      setStateFilter("");
                    }}
                  >
                    <SelectTrigger size="sm" displayValue={zoneLabel || "All Zones"}>
                      <SelectValue placeholder="All Zones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Zones</SelectItem>
                      {zones.map((z) => (
                        <SelectItem key={z.id} value={String(z.id)}>
                          {z.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">State</Label>
                  <Select
                    value={stateFilter || "ALL"}
                    disabled={!zoneFilter && states.length === 0}
                    onValueChange={(val) => setStateFilter(val === "ALL" ? "" : val)}
                  >
                    <SelectTrigger
                      size="sm"
                      displayValue={stateLabel || (zoneFilter ? "All States in Zone" : "All States")}
                    >
                      <SelectValue placeholder={zoneFilter ? "All States in Zone" : "All States"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">{zoneFilter ? "All States in Zone" : "All States"}</SelectItem>
                      {states.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</Label>
                  <Select
                    value={categoryFilter || "ALL"}
                    onValueChange={(val) => setCategoryFilter(val === "ALL" ? "" : val)}
                  >
                    <SelectTrigger size="sm" displayValue={categoryFilter || "All Categories"}>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Categories</SelectItem>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {hasActiveFilters && (
                <div className="flex justify-end pt-0.5">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 gap-1 shrink-0" onClick={resetFilters}>
                    <XCircle className="w-3.5 h-3.5" /> Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <ShadcnDataTable
            title="PHYSICAL ASSET VERIFICATION REGISTER"
            columns={columns}
            data={filtered}
            loading={loading}
            searchPlaceholder="Search tag, name, custodian…"
            searchValue={query}
            onSearchChange={setQuery}
            emptyMessage={
              bucket === "all"
                ? "No assets registered yet — add an asset first"
                : `No ${bucket} assets match this search`
            }
            onRowClick={(item) => {
              const id = item.id || item.assetId || item.assetNumber;
              navigate(`/store-management/assets/detail/${encodeURIComponent(String(id))}`);
            }}
            pageSize={50}
            showTableOptions={false}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
