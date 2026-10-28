import * as React from "react";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { stateOfficeAccreditedProvidersApi } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  type: "hmo" | "hcp";
  stateId?: string;
  value?: string;
  /** Shown when the selected id is not yet in the loaded options list */
  displayName?: string;
  onChange: (provider: {
    id: string;
    name: string;
    code: string;
    address?: string | null;
    facility_type?: string | null;
  } | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

type CachedOption = SearchSelectOption & {
  address?: string | null;
  facility_type?: string | null;
  name?: string;
  code?: string;
};

function formatProviderLabel(name: string, code?: string | null) {
  const n = String(name || "").trim();
  const c = String(code || "").trim();
  if (n && c) return `${n} - ${c}`;
  return n || c;
}

export default function AccreditedProviderSelect({
  type, stateId, value, displayName, onChange, disabled, placeholder,
}: Props) {
  const [options, setOptions] = React.useState<SearchSelectOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const cacheRef = React.useRef<Map<string, CachedOption>>(new Map());
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStateId = React.useRef<string | undefined>(stateId);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const needsState = type === "hcp";

  const load = React.useCallback(async (q?: string) => {
    if (needsState && !stateId) {
      setOptions([]);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await stateOfficeAccreditedProvidersApi.list({
        type,
        ...(needsState && stateId ? { state_id: stateId } : {}),
        q: q?.trim() || undefined,
        limit: type === "hmo" ? "100" : "200",
      });
      const opts = res.data.map((p: any) => {
        const code = p.provider_code || p.code || "";
        const o: CachedOption = {
          value: String(p.id),
          label: formatProviderLabel(p.name, code),
          sub: code || undefined,
          name: p.name,
          code,
          address: p.address ?? null,
          facility_type: p.facility_type ?? null,
        };
        cacheRef.current.set(o.value, o);
        return o;
      });
      setOptions(opts);
      if (!opts.length && !q?.trim()) {
        setLoadError(needsState
          ? "No accredited facilities (HCF) found for this state. Run npm run db:seed-all in the backend."
          : "No accredited HMOs found.");
      }
    } catch (err: any) {
      setOptions([]);
      setLoadError(err.message || "Failed to load providers");
      toast.error("Failed to load accredited providers", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [type, stateId, needsState]);

  React.useEffect(() => {
    if (needsState && prevStateId.current !== stateId) {
      if (prevStateId.current !== undefined) onChangeRef.current(null);
      prevStateId.current = stateId;
    }
    if (!needsState) prevStateId.current = stateId;
    cacheRef.current.clear();
    load();
  }, [type, stateId, load, needsState]);

  const handleSearch = React.useCallback((q: string) => {
    if (type !== "hcp") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      if (!q.trim()) load();
      return;
    }
    debounceRef.current = setTimeout(() => load(q), 300);
  }, [type, load]);

  const handleChange = (id: string) => {
    if (!id) {
      onChange(null);
      return;
    }
    const opt = (cacheRef.current.get(id) ?? options.find((o) => o.value === id)) as CachedOption | undefined;
    onChange({
      id,
      name: opt?.name ?? opt?.label ?? "",
      code: opt?.code ?? opt?.sub ?? "",
      address: opt?.address ?? null,
      facility_type: opt?.facility_type ?? null,
    });
  };

  const blocked = disabled || (needsState && !stateId);

  return (
    <div className="space-y-1.5">
      <SearchSelect
        options={options}
        value={value}
        onChange={handleChange}
        disabled={blocked || loading}
        displayLabel={
          value
            ? (cacheRef.current.get(value)?.label
              || options.find((o) => o.value === value)?.label
              || displayName
              || undefined)
            : (displayName || undefined)
        }
        placeholder={
          needsState && !stateId
            ? "Select state first"
            : loading
              ? "Loading NHIA list..."
              : (placeholder ?? `Select accredited ${type.toUpperCase()}`)
        }
        searchPlaceholder={
          type === "hmo"
            ? "Search accredited HMOs (nationwide)..."
            : "Search facilities (HCF) in selected state..."
        }
        clearable
        onSearchChange={type === "hcp" ? handleSearch : undefined}
      />
      {!loading && loadError && !blocked && (
        <p className="text-xs text-amber-700">{loadError}</p>
      )}
    </div>
  );
}
