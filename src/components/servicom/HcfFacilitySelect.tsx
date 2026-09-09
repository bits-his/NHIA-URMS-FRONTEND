import * as React from "react";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { hcfFacilitiesApi } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  stateId?: string;
  value?: string;
  onChange: (facility: { id: string; name: string; code?: string; state_name?: string } | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

type CachedOption = SearchSelectOption & { code?: string; state_name?: string };

export default function HcfFacilitySelect({ stateId, value, onChange, disabled, placeholder }: Props) {
  const [options, setOptions] = React.useState<SearchSelectOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const cacheRef = React.useRef<Map<string, CachedOption>>(new Map());
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStateId = React.useRef(stateId);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const load = React.useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const res = await hcfFacilitiesApi.list({
        q: q?.trim() || undefined,
        state_id: stateId || undefined,
        unique: "1",
        limit: "200",
      });
      const opts = res.data.map((f: any) => {
        const o: CachedOption = {
          value: String(f.id),
          label: f.name,
          sub: f.accreditation_code || f.state_name || f.lga || undefined,
          code: f.accreditation_code ?? undefined,
          state_name: f.state_name ?? f.state?.description ?? undefined,
        };
        cacheRef.current.set(o.value, o);
        return o;
      });
      setOptions(opts);
    } catch (err: any) {
      setOptions([]);
      toast.error("Failed to load HCF facilities", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [stateId]);

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
    const opt = cacheRef.current.get(id) ?? options.find((o) => o.value === id);
    onChange({
      id,
      name: opt?.label ?? "",
      code: (opt as CachedOption | undefined)?.code,
      state_name: (opt as CachedOption | undefined)?.state_name,
    });
  };

  const blocked = disabled || !stateId;

  return (
    <SearchSelect
      options={options}
      value={value}
      onChange={handleChange}
      disabled={blocked || loading}
      placeholder={
        !stateId
          ? "Select state first"
          : loading
            ? "Loading facilities..."
            : (placeholder ?? "Select healthcare facility (HCF)")
      }
      searchPlaceholder="Search HCF facilities..."
      clearable
      onSearchChange={handleSearch}
    />
  );
}
