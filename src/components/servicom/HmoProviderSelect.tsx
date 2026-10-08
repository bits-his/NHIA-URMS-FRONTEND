import * as React from "react";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { hmoProvidersApi } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  value?: string;
  onChange: (provider: { id: string; name: string; code: string } | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

type CachedOption = SearchSelectOption & { name?: string; code?: string };

function formatPartyLabel(name: string, code?: string | null) {
  const n = String(name || "").trim();
  const c = String(code || "").trim();
  if (n && c) return `${n} - ${c}`;
  return n || c;
}

export default function HmoProviderSelect({ value, onChange, disabled, placeholder, className }: Props) {
  const [options, setOptions] = React.useState<SearchSelectOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const cacheRef = React.useRef<Map<string, CachedOption>>(new Map());
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = React.useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const res = await hmoProvidersApi.list({ q: q?.trim() || undefined, limit: "200" });
      const opts = res.data.map((p: any) => {
        const o: CachedOption = {
          value: String(p.id),
          name: p.name,
          label: formatPartyLabel(p.name, p.hmo_code),
          code: p.hmo_code,
        };
        cacheRef.current.set(o.value, o);
        return o;
      });
      setOptions(opts);
    } catch (err: any) {
      setOptions([]);
      toast.error("Failed to load HMO providers", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const handleSearch = React.useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(q), 300);
  }, [load]);

  const handleChange = (id: string) => {
    if (!id) {
      onChange(null);
      return;
    }
    const opt = (cacheRef.current.get(id) ?? options.find((o) => o.value === id)) as CachedOption | undefined;
    onChange({
      id,
      name: opt?.name ?? opt?.label ?? "",
      code: opt?.code ?? "",
    });
  };

  return (
    <SearchSelect
      options={options}
      value={value}
      onChange={handleChange}
      disabled={disabled || loading}
      className={className}
      placeholder={loading ? "Loading HMOs..." : (placeholder ?? "Select HMO")}
      searchPlaceholder="Search accredited HMOs..."
      clearable
      onSearchChange={handleSearch}
    />
  );
}
