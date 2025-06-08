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
}

export function TableFilters<TData>({
  table,
  filters,
}: TableFiltersProps<TData>) {
  const getDisplayValue = (filter: FilterOption) => {
    const currentFilterValue = table.getColumn(filter.column)?.getFilterValue() as string;
    return currentFilterValue || "";
  };

  return (
    <>
      {filters.map((filter) => (
        <Combobox
          key={filter.column}
          list={filter.options}
          value={getDisplayValue(filter)}
          onChange={(value) =>
            table.getColumn(filter.column)?.setFilterValue(value)
          }
          placeholder={filter.label}
          className="w-auto h-9 capitalize"
        />
      ))}
    </>
  );
}
