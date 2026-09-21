import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { stockApi } from "@/lib/api";
import CustomTable, { CustomTableField } from "@/components/CustomTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PackageCheck, Plus, Download, Eye, Search, X } from "lucide-react";
import PageLayout from "../components/PageLayout";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { getPrimaryCategoryKeys, matchesStore } from "../lib/storeOptions";
import { useCreateReviewAccess } from "@/src/access/createReviewAccess";

interface Option {
  id: number | string;
  label: string;
  zone_id?: number | string;
}

export default function SupplyVerificationView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const navigate = useNavigate();
  const { canCreate, createOnly } = useCreateReviewAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(!createOnly);

  React.useEffect(() => {
    if (!createOnly) return;
    if (onNavigate) onNavigate("store-supply-verification-new");
    else navigate("/store-management/verification/supply/new", {
      state: { from: "/store-management/verification/supply" },
      replace: true,
    });
  }, [createOnly, navigate, onNavigate]);

  // Filter states
  const [zones, setZones] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [zoneFilter, setZoneFilter] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [verdictFilter, setVerdictFilter] = useState<string>("");

  useEffect(() => {
    stockApi
      .getZones()
      .then((r: any) => {
        setZones((r.data || []).map((z: any) => ({ id: z.id, label: z.description })));
      })
      .catch(() => {});
  }, []);

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
    const set = new Set<string>(getPrimaryCategoryKeys());
    for (const v of verifications) {
      if (v.goodsCategory) set.add(v.goodsCategory);
    }
    return Array.from(set);
  }, [verifications]);

  useEffect(() => {
    if (createOnly) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await stockApi.getSupplyVerifications();
        if (!cancelled) {
          setVerifications(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.error("Failed to load supply verifications:", err);
        if (!cancelled) setVerifications([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createOnly]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return verifications.filter((v) => {
      // Zone filter
      if (zoneFilter) {
        let zoneMatch = false;
        if (v.zone_id && String(v.zone_id) === String(zoneFilter)) {
          zoneMatch = true;
        } else if (v.zone_name && zoneLabel && v.zone_name.toLowerCase().includes(zoneLabel.toLowerCase())) {
          zoneMatch = true;
        } else if (states.length > 0) {
          zoneMatch = states.some(
            (s) =>
              (v.state_id && String(v.state_id) === String(s.id)) ||
              matchesStore(v.storeLocation, s.label) ||
              matchesStore(v.state_name, s.label)
          );
        }
        if (!zoneMatch) return false;
      }

      // State filter
      if (stateFilter) {
        let stateMatch = false;
        if (v.state_id && String(v.state_id) === String(stateFilter)) {
          stateMatch = true;
        } else if (stateLabel) {
          stateMatch =
            matchesStore(v.storeLocation, stateLabel) || matchesStore(v.state_name, stateLabel);
        }
        if (!stateMatch) return false;
      }

      // Category filter
      if (categoryFilter && (v.goodsCategory || "").toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      // Verdict filter
      if (verdictFilter && v.verdict !== verdictFilter) {
        return false;
      }

      // Query filter
      if (!query) return true;
      return [
        v.supplyRefNo,
        v.supplierName,
        v.goodsCategory,
        v.storeSubcategory,
        v.suppliedItemName,
        v.storeLocation,
        v.verdict,
        v.zone_name,
        v.state_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [verifications, q, zoneFilter, stateFilter, categoryFilter, verdictFilter, states, zoneLabel, stateLabel]);

  const resetFilters = () => {
    setZoneFilter("");
    setStateFilter("");
    setCategoryFilter("");
    setVerdictFilter("");
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const hasActiveFilters = Boolean(zoneFilter || stateFilter || categoryFilter || verdictFilter || q);

  const openCertificate = (item: any) => {
    navigate(`/store-management/verification/supply/${item.id}`, {
      state: { from: "/store-management/verification/supply" },
    });
  };

  const fields: CustomTableField[] = [
    { title: "Control No.", value: "supplyRefNo", className: "font-mono font-bold text-slate-800" },
    { title: "Supplier", value: "supplierName" },
    { title: "Major Category", value: "goodsCategory" },
    { title: "Subcategory", value: "storeSubcategory" },
    { title: "Item", value: "suppliedItemName" },
    { title: "Qty", value: "suppliedQuantity", className: "text-right font-bold" },
    { title: "State Store", value: "storeLocation" },
    {
      title: "Route",
      value: "classification",
      custom: true,
      component: (item) => (
        <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
          {item.classification === "STORE_INVENTORY" ? "Store Inventory" : "Asset Register"}
        </Badge>
      ),
    },
    {
      title: "Verdict",
      value: "verdict",
      custom: true,
      component: (item) => (
        <Badge
          className={
            item.verdict === "VERIFIED_PASSED"
              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
              : item.verdict === "PARTIAL_PASS"
                ? "bg-amber-100 text-amber-800 border-amber-200"
                : "bg-rose-100 text-rose-800 border-rose-200"
          }
        >
          {item.verdict === "VERIFIED_PASSED"
            ? "Passed"
            : item.verdict === "PARTIAL_PASS"
              ? "Partial"
              : item.verdict || "Failed"}
        </Badge>
      ),
    },
    {
      title: "Certificate",
      value: "id",
      custom: true,
      component: (item) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px] font-bold"
          onClick={(e) => {
            e.stopPropagation();
            openCertificate(item);
          }}
        >
          <Eye className="h-3 w-3 mr-1" /> View
        </Button>
      ),
    },
  ];

  if (createOnly) return null;

  return (
    <PageLayout
      title={
        <span className="flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-[#25a872]" /> Verification of Supply
        </span>
      }
      description="Inspection certificates — open a row to view full certificate details"
      actions={
        <>
          <Button variant="outline" size="sm" className="text-xs h-9 border-slate-200">
            <Download className="w-4 h-4 mr-1.5" /> Export Log
          </Button>
          {canCreate && (
          <Button
            size="sm"
            className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs h-9 font-semibold"
            onClick={() => {
              if (onNavigate) onNavigate("store-supply-verification-new");
              else navigate("/store-management/verification/supply/new", {
                state: { from: "/store-management/verification/supply" },
              });
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Verification Certificate
          </Button>
          )}
        </>
      }
    >
      {/* Compact Filters in One Row */}
      <div className="flex flex-wrap md:flex-nowrap items-center gap-2.5 bg-white p-2.5 border border-slate-200 rounded-xl shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <input
            id="supply-search"
            type="search"
            value={q}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value) next.set("q", e.target.value); else next.delete("q");
              setSearchParams(next, { replace: true });
            }}
            placeholder="Search control no, supplier, item, store…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25a872]/40"
          />
        </div>

        {/* Zone */}
        <div className="w-40 shrink-0">
          <Select
            value={zoneFilter || "ALL"}
            onValueChange={(val) => {
              setZoneFilter(val === "ALL" ? "" : val);
              setStateFilter("");
            }}
          >
            <SelectTrigger size="sm" displayValue={zoneLabel || "All Zones"} className="bg-white">
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

        {/* State */}
        <div className="w-44 shrink-0">
          <Select
            value={stateFilter || "ALL"}
            disabled={!zoneFilter && states.length === 0}
            onValueChange={(val) => setStateFilter(val === "ALL" ? "" : val)}
          >
            <SelectTrigger
              size="sm"
              displayValue={stateLabel || (zoneFilter ? "All States in Zone" : "All States")}
              className="bg-white"
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

        {/* Goods Category */}
        <div className="w-44 shrink-0">
          <Select
            value={categoryFilter || "ALL"}
            onValueChange={(val) => setCategoryFilter(val === "ALL" ? "" : val)}
          >
            <SelectTrigger size="sm" displayValue={categoryFilter || "All Categories"} className="bg-white">
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

        {/* Verdict */}
        <div className="w-36 shrink-0">
          <Select
            value={verdictFilter || "ALL"}
            onValueChange={(val) => setVerdictFilter(val === "ALL" ? "" : val)}
          >
            <SelectTrigger
              size="sm"
              displayValue={
                verdictFilter === "VERIFIED_PASSED"
                  ? "Passed"
                  : verdictFilter === "PARTIAL_PASS"
                    ? "Partial"
                    : verdictFilter === "FAILED"
                      ? "Failed"
                      : "All Verdicts"
              }
              className="bg-white"
            >
              <SelectValue placeholder="All Verdicts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Verdicts</SelectItem>
              <SelectItem value="VERIFIED_PASSED">Passed</SelectItem>
              <SelectItem value="PARTIAL_PASS">Partial</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Button */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="h-9 px-2.5 text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 shrink-0"
            title="Clear filters"
          >
            <X className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>
      <CustomTable
        data={filtered}
        fields={fields}
        filter={false}
        loading={loading}
        pageSize={15}
        message="No supply verification records found"
      />
    </PageLayout>
  );
}
