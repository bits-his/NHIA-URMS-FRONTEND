import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function searchableText(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(searchableText).join(" ");
  if (typeof value === "object") return Object.values(value).map(searchableText).join(" ");
  return String(value).toLowerCase().replace(/_/g, " ");
}

export function matchesListSearch(record: unknown, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const text = searchableText(record);
  return terms.every((term) => text.includes(term));
}

export function useListSearch() {
  const [search, setSearch] = React.useState("");
  const matchesSearch = React.useCallback(
    (record: unknown) => matchesListSearch(record, search),
    [search],
  );
  const searchInput = (
    <div className="relative w-full col-span-full">
      <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="search"
        aria-label="Search records"
        placeholder="Search records…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="h-10 bg-white border-[#d4e8dc] pl-9 pr-10"
      />
      {search && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear search"
          onClick={() => setSearch("")}
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
  return { search, setSearch, matchesSearch, searchInput };
}
