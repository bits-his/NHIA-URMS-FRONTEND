import * as React from "react";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { hcfFacilitiesApi, stateOfficeAccreditedProvidersApi } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  /** Optional — when set, results are scoped to that state office id. */
  stateId?: string;
  value?: string;
  onChange: (facility: {
    id: string;
    name: string;
    code?: string;
    state_name?: string;
    email?: string | null;
    facility_type?: string | null;
    service_applied_for?: string | null;
    facility_code?: string | null;
  } | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** When false, search works without selecting a state first (default true for form flows). */
  requireState?: boolean;
}

type CachedOption = SearchSelectOption & {
  code?: string;
  state_name?: string;
  email?: string | null;
  facility_type?: string | null;
  service_applied_for?: string | null;
  facility_code?: string | null;
};

export default function HcfFacilitySelect({
  stateId,
  value,
  onChange,
  disabled,
  placeholder,
  className,
  requireState = true,
}: Props) {
  const [options, setOptions] = React.useState<SearchSelectOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const cacheRef = React.useRef<Map<string, CachedOption>>(new Map());
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStateId = React.useRef(stateId);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const blocked = disabled || (requireState && !stateId);

  const load = React.useCallback(async (q?: string) => {
    if (requireState && !stateId) {
      setOptions([]);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await hcfFacilitiesApi.list({
        q: q?.trim() || undefined,
        state_id: stateId || undefined,
        unique: "1",
        limit: "200",
      });
      let rows = Array.isArray(res.data) ? res.data : [];
      if (!rows.length) {
        const fallback = await stateOfficeAccreditedProvidersApi.list({
          type: "hcp",
          ...(stateId ? { state_id: stateId } : {}),
          q: q?.trim() || undefined,
          limit: "200",
        });
        rows = (fallback.data || []).map((p: any) => ({
          id: `acc-${p.id}`,
          name: p.name,
          accreditation_code: p.provider_code,
          facility_code: p.provider_code,
          email: p.email ?? null,
          facility_type: p.facility_type ?? null,
          service_applied_for: p.facility_type ?? null,
          state_name: null,
        }));
      }
      const opts = rows.map((f: any) => {
        const o: CachedOption = {
          value: String(f.id),
          label: f.name,
          sub: f.accreditation_code || f.facility_code || f.state_name || f.lga || undefined,
          code: f.accreditation_code || f.facility_code || undefined,
          state_name: f.state_name ?? f.state?.description ?? undefined,
          email: f.email ?? null,
          facility_type: f.facility_type ?? null,
          service_applied_for: f.service_applied_for ?? null,
          facility_code: f.facility_code ?? null,
        };
        cacheRef.current.set(o.value, o);
        return o;
      });
      setOptions(opts);
      if (!opts.length && !q?.trim()) {
        setLoadError(requireState
          ? "No HCF facilities found for this state."
          : "No HCF facilities found.");
      }
    } catch (err: any) {
      setOptions([]);
      setLoadError(err.message || "Failed to load HCF facilities");
      toast.error("Failed to load HCF facilities", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [stateId, requireState]);

  React.useEffect(() => {
    if (prevStateId.current !== stateId) {
      if (prevStateId.current !== undefined) onChangeRef.current(null);
      prevStateId.current = stateId;
    }
    cacheRef.current.clear();
    load();
  }, [stateId, load]);

  const handleSearch = React.useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(q), 300);
  }, [load]);

  const handleChange = (id: string) => {
    if (!id) {
      onChange(null);
      return;
    }
    const opt = cacheRef.current.get(id) ?? (options.find((o) => o.value === id) as CachedOption | undefined);
    onChange({
      id,
      name: opt?.label ?? "",
      code: opt?.code,
      state_name: opt?.state_name,
      email: opt?.email ?? null,
      facility_type: opt?.facility_type ?? null,
      service_applied_for: opt?.service_applied_for ?? null,
      facility_code: opt?.facility_code ?? null,
    });
  };

  return (
    <div className="space-y-1.5">
      <SearchSelect
        options={options}
        value={value}
        onChange={handleChange}
        disabled={blocked || loading}
        className={className}
        placeholder={
          requireState && !stateId
            ? "Select state first"
            : loading
              ? "Loading facilities..."
              : (placeholder ?? "Select healthcare facility (HCF)")
        }
        searchPlaceholder="Search HCF facilities..."
        clearable
        onSearchChange={handleSearch}
      />
      {!loading && loadError && !blocked ? (
        <p className="text-xs text-amber-700">{loadError}</p>
      ) : null}
    </div>
  );
}
