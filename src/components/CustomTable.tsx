import React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
} from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns,
  Loader2,
  Inbox
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export interface CustomTableField {
  title: string;
  value: string;
  className?: string;
  footerClassName?: string;
  footer?: React.ReactNode;
  custom?: boolean;
  component?: (item: any, index: number) => React.ReactNode;
}

export interface CustomTableProps {
  data?: any[];
  fields?: CustomTableField[];
  filter?: boolean;
  showCustomizeColumns?: boolean;
  selection?: boolean;
  loading?: boolean;
  pageSize?: number;
  message?: string;
  footerData?: any;
  onSelectionChange?: (selectedRows: any) => void;
}

export function CustomTable({
  data: initialData = [],
  fields = [],
  filter = false,
  showCustomizeColumns = false,
  selection = false,
  loading = false,
  pageSize = 10,
  message = "No Data Available",
  footerData = null,
  onSelectionChange = null,
}: CustomTableProps) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [sorting, setSorting] = React.useState([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: pageSize,
  });

  React.useEffect(() => {
    if (onSelectionChange && typeof onSelectionChange === "function") {
      onSelectionChange(rowSelection);
    }
  }, [rowSelection, onSelectionChange]);

  const columns: ColumnDef<any, any>[] = [
    ...(selection
      ? [
        {
          id: "select",
          header: ({ table }: any) => (
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label="Select all"
              className="translate-y-[2px]"
            />
          ),
          cell: ({ row }: any) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
              className="translate-y-[2px]"
            />
          ),
          enableSorting: false,
          enableHiding: false,
        },
      ]
      : []),
    ...fields.map((f, i) => {
      return {
        accessorKey: f.value || `col_${i}`,
        header: f.title,
        className: f.className || "",
        footerClassName: f.footerClassName || "",
        footer: f.footer,
        cell: ({ row }: any) => {
          const item = row.original;
          if (f.custom && f.component) {
            return f.component(item, row.index);
          }
          return (
            <span className={f.className || ""}>
              {item[f.value] !== undefined && item[f.value] !== null
                ? String(item[f.value])
                : "—"}
            </span>
          );
        },
      };
    }),
  ] as any;

  const table = useReactTable({
    data: initialData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    enableRowSelection: selection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="w-full space-y-3">
      {filter && showCustomizeColumns && (
        <div className="flex items-center justify-end gap-2 mb-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Columns className="h-3.5 w-3.5 mr-1.5" />
                  <span>Customize Columns</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56 text-xs">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.id !== "undefined" && column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {typeof column.columnDef.header === "string"
                        ? column.columnDef.header
                        : column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded bg-white shadow-sm">
        <Table className="w-full text-xs">
          <TableHeader className="bg-slate-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={`font-bold text-slate-800 uppercase tracking-wider py-3 ${(header.column.columnDef as any).className || "text-left"
                      }`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center p-8">
                  <div className="flex justify-center items-center gap-2 text-slate-500">
                    <Loader2 className="animate-spin h-6 w-6 text-sky-600" />
                    <span>Loading records...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5 px-4 text-slate-700 font-medium">
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
                  className="h-32 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                    <Inbox className="h-8 w-8 text-slate-300" />
                    <span className="font-semibold text-slate-500 text-xs">{message}</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {footerData && (
            <tfoot className="bg-slate-50 border-t border-gray-200 font-bold">
              <TableRow>
                {fields.map((f, i) => (
                  <TableCell
                    key={`ft_${i}`}
                    className={`py-3 px-4 ${f.footerClassName || ""}`}
                  >
                    {f.footer || "—"}
                  </TableCell>
                ))}
              </TableRow>
            </tfoot>
          )}
        </Table>
      </div>

      {/* Pagination Bar */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-600 font-medium pt-1">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px] text-xs">
              <SelectValue placeholder={String(table.getState().pagination.pageSize)} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 30, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <div>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1} ({table.getFilteredRowModel().rows.length} total)
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomTable;
