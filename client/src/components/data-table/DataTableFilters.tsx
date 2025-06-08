import { Table } from "@tanstack/react-table";
import { Combobox } from "../ui/combobox";

interface FilterOption {
  column: string;
  label: string;
  options: { label: string; value: string }[];
}

interface TableFiltersProps<TData> {
  table: Table<TData>;
  filters: FilterOption[];
  onFiltersChange?: (filters: Record<string, any>) => void;
  filterValues?: Record<string, any>;
}

export function TableFilters<TData>({
  table,
  filters,
  onFiltersChange,
  filterValues = {},
}: TableFiltersProps<TData>) {
  const getDisplayValue = (filter: FilterOption) => {
    // Use server-side filter values if provided, otherwise fall back to table state
    if (onFiltersChange && filterValues) {
      return filterValues[filter.column] || "";
    }
    const currentFilterValue = table.getColumn(filter.column)?.getFilterValue() as string;
    return currentFilterValue || "";
  };

  const handleFilterChange = (filterColumn: string, value: string | string[]) => {
    const stringValue = Array.isArray(value) ? value[0] || "" : value;
    
    if (onFiltersChange) {
      // Server-side filtering
      const newFilters = { ...filterValues };
      if (stringValue) {
        newFilters[filterColumn] = stringValue;
      } else {
        delete newFilters[filterColumn];
      }
      onFiltersChange(newFilters);
    } else {
      // Client-side filtering
      table.getColumn(filterColumn)?.setFilterValue(stringValue);
    }
  };

  return (
    <>
      {filters.map((filter) => (
        <Combobox
          key={filter.column}
          list={filter.options}
          value={getDisplayValue(filter)}
          onChange={(value) => handleFilterChange(filter.column, value)}
          placeholder={filter.label}
          className="w-auto h-9 capitalize"
        />
      ))}
    </>
  );
}
