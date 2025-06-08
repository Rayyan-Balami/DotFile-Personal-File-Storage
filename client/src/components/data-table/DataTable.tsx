"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import DataTableBody from "./DataTableBody";
import DataTableControls from "./DataTableControls";
import DataTableFooter from "./DataTableFooter";

interface ActionItem {
  label: string;
  onClick: (item: any) => void;
}

interface Column {
  key: string;
  label: string;
  visible?: boolean;
  render?: (row: any) => React.ReactNode;
}

interface FilterColumn {
  key: string;
  label: string;
  options: string[];
}

interface SearchColumn {
  key: string;
  label: string;
}

interface DataTableProps {
  apiPath: string;
  columns: Column[];
  filterColumns?: FilterColumn[];
  searchColumns?: SearchColumn[];
  limitOptions?: number[];
  actions?: boolean | ActionItem[];
  refresh?: boolean;
  selected?: string[];
  setSelected?: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCount?: number;
  setSelectedCount?: React.Dispatch<React.SetStateAction<number>>;
  data?: any[];
  setData?: React.Dispatch<React.SetStateAction<any[]>>;
  rowCheckDisabled?: boolean | ((item: any) => boolean);
}

export default function DataTable({
  apiPath,
  columns,
  filterColumns = [],
  searchColumns = [],
  limitOptions = [5, 10, 25],
  actions,
  refresh,
  selected: externalSelected,
  setSelected: externalSetSelected,
  selectedCount: externalSelectedCount,
  setSelectedCount: externalSetSelectedCount,
  data: externalData,
  setData: externalSetData,
  rowCheckDisabled = false,
}: DataTableProps) {
  const [internalData, setInternalData] = useState<any[]>([]);
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const [internalSelectedCount, setInternalSelectedCount] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQueries, setSearchQueries] = useState<{ [key: string]: string }>(
    {}
  );
  const [filters, setFilters] = useState<{ [key: string]: string }>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columns.reduce<string[]>(
      (acc, col) => (col.visible === false ? acc : [...acc, col.key]),
      []
    )
  );
  const [limit, setLimit] = useState<number>(limitOptions[0]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const selected = externalSelected ?? internalSelected;
  const setSelected = externalSetSelected ?? setInternalSelected;
  const selectedCount = externalSelectedCount ?? internalSelectedCount;
  const setSelectedCount = externalSetSelectedCount ?? setInternalSelectedCount;
  const data = externalData ?? internalData;
  const setData = externalSetData ?? setInternalData;

  // Custom hook to debounce searches and filters
  const debouncedSearchQueries = useDebounce(searchQueries, 2000);
  const debouncedFilters = useDebounce(filters, 2000);

  useEffect(() => {
    setIsLoading(true);
  }, [searchQueries, filters, page, limit]);

  useEffect(() => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...debouncedFilters,
    });

    searchColumns.forEach((col) => {
      if (debouncedSearchQueries[col.key]?.trim()) {
        queryParams.append(
          `search_${col.key}`,
          debouncedSearchQueries[col.key].trim()
        );
      }
    });

    const qs = queryParams.toString();
    setIsLoading(true);

    fetch(`${apiPath}?${qs}`)
      .then((res) => res.ok && res.json())
      .then((result) => {
        if (result) {
          setData(result.items);
          setTotalPages(result.totalPages);
        }
      })
      .catch((error) => console.error("Error fetching data:", error))
      .finally(() => setIsLoading(false));
  }, [page, limit, apiPath, debouncedFilters, debouncedSearchQueries, refresh]);
  console.log("data", data);

  function toggleSelection(id: string) {
    setSelected((prev) => {
      const newSelected = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      setSelectedCount(newSelected.length);
      return newSelected;
    });
  }

  async function handleDeleteSelected() {
    if (selected.length === 0) {
      toast.success("Event has been created", {
        description: "Sunday, December 03, 2023 at 9:00 AM",
      });
      return;
    }
    try {
      const res = await fetch(`${apiPath}/delete`, {
        method: "POST",
        body: JSON.stringify({ ids: selected }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error("Uh oh! Something went wrong", {
          description: error || "An error occurred while deleting.",
        });
        return;
      }
      setData((prev) => prev.filter((item) => !selected.includes(item.id)));
      setSelected([]);
      setSelectedCount(0);
      toast.success("Deleted successfully", {
        description: "Selected items were successfully deleted.",
      });
    } catch (error) {
      console.error("Delete error:", error);

      toast.error("Uh oh! Something went wrong", {
        description: "An error occurred while deleting.",
      });
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6 overflow-auto grid auto-rows-max">
      <DataTableControls
        searchColumns={searchColumns}
        filterColumns={filterColumns}
        searchQueries={searchQueries}
        filters={filters}
        columns={columns}
        visibleColumns={visibleColumns}
        selectedCount={selectedCount}
        setSearchQueries={setSearchQueries}
        setFilters={setFilters}
        setVisibleColumns={setVisibleColumns}
        handleDeleteSelected={handleDeleteSelected}
      />
      <div className="rounded-md border overflow-x-scroll bg-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 ">
                <Checkbox
                  className="rounded"
                  checked={selected.length === data.length && data.length > 0}
                  onCheckedChange={(checked) => {
                    const newSelected = checked ? data.map((i) => i.id) : [];
                    setSelected(newSelected);
                    setSelectedCount(newSelected.length);
                  }}
                />
              </TableHead>
              {columns
                .filter((col) => visibleColumns.includes(col.key))
                .map((col) => (
                  <TableHead key={col.key} className="whitespace-nowrap">
                    {col.label}
                  </TableHead>
                ))}
              {actions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <DataTableBody
            data={data}
            columns={columns}
            visibleColumns={visibleColumns}
            isLoading={isLoading}
            actions={actions}
            selected={selected}
            toggleSelection={toggleSelection}
            rowCheckDisabled={rowCheckDisabled}
          />
        </Table>
      </div>
      <DataTableFooter
        page={page}
        totalPages={totalPages}
        limit={limit}
        limitOptions={limitOptions}
        setPage={setPage}
        setLimit={setLimit}
      />
    </div>
  );
}