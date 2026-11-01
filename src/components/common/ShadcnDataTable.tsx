import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  HelpCircle,
  Loader2,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ShadcnDataTableProps<TData, TValue> {
  title?: string;
  infoTooltip?: string;
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  filterPills?: React.ReactNode;
  actionButton?: React.ReactNode;
  sortOptions?: { label: string; columnId: string; desc?: boolean }[];
  onRowClick?: (row: TData) => void;
  getRowClassName?: (row: TData) => string | undefined;
  emptyMessage?: string;
  pageSize?: number;
  enableSelection?: boolean;
  onSelectionChange?: (selectedRows: TData[]) => void;
  showTableOptions?: boolean;
}

export function ShadcnDataTable<TData, TValue>({
  title = "RECENT RECORDS",
  infoTooltip,
  columns,
  data,
  loading = false,
  searchPlaceholder = "Search...",
  searchValue: controlledSearch,
  onSearchChange,
  filterPills,
  actionButton,
  sortOptions = [],
  onRowClick,
  getRowClassName,
  emptyMessage = "No records found.",
  pageSize = 50,
  enableSelection = false,
  onSelectionChange,
  showTableOptions = false,
}: ShadcnDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [internalGlobalFilter, setInternalGlobalFilter] = React.useState("");

  const isControlledSearch = controlledSearch !== undefined;
  const currentSearch = isControlledSearch ? controlledSearch : internalGlobalFilter;

  const handleSearch = (val: string) => {
    if (isControlledSearch && onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalGlobalFilter(val);
    }
  };

  // Only include checkbox column if enableSelection is explicitly true
  const effectiveColumns = React.useMemo(() => {
    if (!enableSelection) {
      return columns.filter((col) => col.id !== "select");
    }
    return columns;
  }, [columns, enableSelection]);

  const table = useReactTable({
    data,
    columns: effectiveColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: isControlledSearch ? undefined : internalGlobalFilter,
    },
    enableRowSelection: enableSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  // Notify parent on selection change
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table
        .getSelectedRowModel()
        .rows.map((r) => r.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, onSelectionChange, table]);

  return (
    <div className="w-full rounded-sm border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
      {/* 1. Solvix Unified Card Header (Title on Left | Search + Options on Right) */}
      <div className="p-3 sm:p-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white">
        {/* Left Section: Title + Info icon + Inline Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-800 select-none">
              {title}
            </span>
            <HelpCircle
              className="size-3.5 text-slate-300 hover:text-slate-500 cursor-pointer transition-colors"
              title={infoTooltip || title}
            />
          </div>

          {filterPills && (
            <div className="flex flex-wrap items-center gap-1.5">
              {filterPills}
            </div>
          )}
        </div>

        {/* Right Section: Compact Search + Action Button + More Menu */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <div className="relative w-48 sm:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <Input
              value={currentSearch}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8 pr-7 h-8 text-xs bg-slate-50/70 border-slate-200 focus:bg-white focus:border-slate-400 rounded-sm transition-colors placeholder:text-slate-400"
            />
            {currentSearch && (
              <button
                type="button"
                onClick={() => handleSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-sm"
                aria-label="Clear search"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {actionButton}

          {/* More options menu (...) - Only shown when showTableOptions is true */}
          {showTableOptions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 p-0 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-sm shrink-0 shadow-2xs"
                  aria-label="Table options"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Table Options
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Sort Sub-options */}
                  {sortOptions.length > 0 && (
                    <>
                      <DropdownMenuLabel className="text-[10px] text-slate-400 font-medium">
                        Sort By
                      </DropdownMenuLabel>
                      {sortOptions.map((opt) => (
                        <DropdownMenuItem
                          key={opt.label}
                          onClick={() => setSorting([{ id: opt.columnId, desc: !!opt.desc }])}
                          className="cursor-pointer text-xs"
                        >
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Column Visibility Options */}
                  <DropdownMenuLabel className="text-[10px] text-slate-400 font-medium">
                    Columns
                  </DropdownMenuLabel>
                  {table
                    .getAllColumns()
                    .filter((col) => col.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize text-xs cursor-pointer"
                        checked={column.getIsVisible()}
                        onCheckedChange={(val) => column.toggleVisibility(!!val)}
                      >
                        {typeof column.columnDef.header === "string"
                          ? column.columnDef.header
                          : column.id.replace(/_/g, " ")}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* 2. Solvix Table Body */}
      <div className="overflow-x-auto">
        <Table className="w-full text-xs">
          <TableHeader className="bg-slate-50/70 border-b border-slate-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-slate-50/70 border-none">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "h-9 px-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none whitespace-nowrap",
                        canSort && "cursor-pointer hover:text-slate-800"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-1.5">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            <span className="inline-flex">
                              {isSorted === "asc" ? (
                                <ArrowUp className="size-3 text-[#007a8c]" />
                              ) : isSorted === "desc" ? (
                                <ArrowDown className="size-3 text-[#007a8c]" />
                              ) : (
                                <ArrowUpDown className="size-3 text-slate-300 opacity-60" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-44 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-8">
                    <Loader2 className="size-6 animate-spin text-[#007a8c]" />
                    <span className="text-xs font-medium text-slate-500">Loading records...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors",
                    onRowClick && "cursor-pointer",
                    getRowClassName?.(row.original)
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="py-3 px-3.5 text-slate-700 align-middle font-normal"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-44 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-8">
                    <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Inbox className="size-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-600">{emptyMessage}</span>
                    {currentSearch && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSearch("")}
                        className="text-xs text-[#007a8c] hover:underline h-7"
                      >
                        Clear search filter
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 3. Solvix Pagination Footer Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-4">
          {enableSelection ? (
            <span>
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected
            </span>
          ) : (
            <span>
              Showing{" "}
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}{" "}
              of {table.getFilteredRowModel().rows.length} entries
            </span>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Rows:</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="h-7 px-2 text-xs bg-white border border-slate-200 rounded-sm font-medium text-slate-700 outline-none cursor-pointer hover:border-slate-300"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {Math.max(1, table.getPageCount())}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7 p-0 bg-white border-slate-200 disabled:opacity-30"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="First page"
            >
              <ChevronsLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7 p-0 bg-white border-slate-200 disabled:opacity-30"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7 p-0 bg-white border-slate-200 disabled:opacity-30"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7 p-0 bg-white border-slate-200 disabled:opacity-30"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
            >
              <ChevronsRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShadcnDataTable;
