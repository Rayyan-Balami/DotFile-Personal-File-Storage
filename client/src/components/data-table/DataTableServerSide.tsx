import {
  ColumnDef,
  PaginationState,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

import { DataTableActionDialog } from "@/components/data-table/DataTableActionDialog";
import { TableFilters } from "@/components/data-table/DataTableFilters";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import { DataTableSearch } from "@/components/data-table/DataTableSearch";
import { DataTableViewOptions } from "@/components/data-table/DataTableViewOptions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FilterOption {
  column: string;
  label: string;
  options: { label: string; value: string }[];
}

interface DateRangeFilterOption {
  column: string;
  label: string;
}

interface SearchColumn {
  column: string;
  label: string;
}

interface ServerSidePagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface DataTableServerSideProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination: ServerSidePagination;
  loading?: boolean;
  filters?: FilterOption[];
  dateRangeFilters?: DateRangeFilterOption[];
  searchColumns?: SearchColumn[];
  onPaginationChange: (pagination: PaginationState) => void;
  onSortingChange?: (sorting: SortingState) => void;
  onSearchChange?: (search: string, searchColumns?: string[]) => void;
  onFiltersChange?: (filters: Record<string, any>) => void;
  sorting?: SortingState;
  searchValue?: string;
  filterValues?: Record<string, any>;
  actionDialogs?: {
    [key: string]: {
      title: string;
      description: string;
      trigger: React.ReactNode;
      confirmButtonText: string;
      onConfirm: (selectedIds: string[]) => Promise<void>;
    };
  };
}

export function DataTableServerSide<TData, TValue>({
  columns,
  data,
  pagination,
  loading = false,
  filters = [],
  dateRangeFilters = [],
  searchColumns = [],
  onPaginationChange,
  onSortingChange,
  onSearchChange,
  onFiltersChange,
  sorting = [],
  searchValue = "",
  filterValues = {},
  actionDialogs = {},
}: DataTableServerSideProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] =
    React.useState<SortingState>(sorting);
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    pageCount: pagination.totalPages,
    state: {
      sorting: internalSorting,
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.pageSize,
      },
      rowSelection,
      columnPinning: {
        left: ["select"],
        right: ["actions"],
      },
    },
    enableRowSelection: true,
    enableColumnPinning: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: (updater) => {
      const newSorting =
        typeof updater === "function" ? updater(internalSorting) : updater;
      setInternalSorting(newSorting);
      onSortingChange?.(newSorting);
    },
    onPaginationChange: (updater) => {
      const currentPagination = {
        pageIndex: pagination.page - 1,
        pageSize: pagination.pageSize,
      };
      const newPagination =
        typeof updater === "function" ? updater(currentPagination) : updater;
      onPaginationChange({
        pageIndex: newPagination.pageIndex,
        pageSize: newPagination.pageSize,
      });
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  const handleSearchChange = (value: string) => {
    const searchFields = searchColumns.map((col) => col.column);
    onSearchChange?.(value, searchFields);
  };

  const handleFiltersChange = (newFilters: Record<string, any>) => {
    onFiltersChange?.(newFilters);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {searchColumns.length > 0 && (
          <DataTableSearch
            searchColumns={searchColumns}
            table={table}
            onSearchChange={handleSearchChange}
            searchValue={searchValue}
          />
        )}
        {(filters.length > 0 || dateRangeFilters.length > 0) && (
          <TableFilters
            filters={filters}
            dateRangeFilters={dateRangeFilters}
            table={table}
            onFiltersChange={handleFiltersChange}
            filterValues={filterValues}
          />
        )}
        <div className="ml-auto flex items-center gap-2">
          {Object.entries(actionDialogs).map(([key, dialog]) => (
            <DataTableActionDialog
              key={key}
              table={table}
              title={dialog.title}
              description={dialog.description}
              confirmButtonText={dialog.confirmButtonText}
              trigger={dialog.trigger}
              onConfirm={dialog.onConfirm}
            />
          ))}
          <DataTableViewOptions table={table} />
        </div>
      </div>
      <div className="rounded-md border bg-card overflow-auto">
        <Table className="relative">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isPinnedLeft = header.column.getIsPinned() === "left";
                  const isPinnedRight = header.column.getIsPinned() === "right";

                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={`${isPinnedLeft ? "sticky left-0" : ""} ${isPinnedRight ? "sticky right-0" : ""}`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
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
                  className="h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isPinnedLeft = cell.column.getIsPinned() === "left";
                    const isPinnedRight = cell.column.getIsPinned() === "right";

                    return (
                      <TableCell
                        key={cell.id}
                        className={`${isPinnedLeft ? "sticky left-0" : ""} ${isPinnedRight ? "sticky right-0" : ""}`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </>
  );
}
