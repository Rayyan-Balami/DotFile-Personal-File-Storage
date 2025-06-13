import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { useDebounce } from "@/hooks/use-debounce";
import { Table } from "@tanstack/react-table";
import { useCallback, useEffect, useRef, useState } from "react";

interface FilterOption {
  column: string;
  label: string;
  options: { label: string; value: string }[];
}

interface DateRangeFilterOption {
  column: string;
  label: string;
}

interface TableFiltersProps<TData> {
  table: Table<TData>;
  filters: FilterOption[];
  dateRangeFilters?: DateRangeFilterOption[];
  onFiltersChange?: (filters: Record<string, any>) => void;
  filterValues?: Record<string, any>;
}

export function TableFilters<TData>({
  table,
  filters,
  dateRangeFilters = [],
  onFiltersChange,
  filterValues = {},
}: TableFiltersProps<TData>) {
  // Local state for debouncing
  const [localFilterValues, setLocalFilterValues] = useState<
    Record<string, any>
  >({});
  const [localDateRangeValues, setLocalDateRangeValues] = useState<
    Record<string, { from: Date | undefined; to: Date | undefined }>
  >({});

  // Ref to track if we're updating filters to prevent infinite loops
  const isUpdatingRef = useRef(false);
  const previousFiltersRef = useRef<string>("");

  // Debounced values
  const debouncedFilterValues = useDebounce(localFilterValues);
  const debouncedDateRangeValues = useDebounce(localDateRangeValues);

  // Memoized callback for filter changes
  const handleFiltersUpdate = useCallback(() => {
    if (!onFiltersChange || isUpdatingRef.current) return;

    const dateFilters: Record<string, any> = {};

    // Process date range filters
    Object.entries(debouncedDateRangeValues).forEach(([column, range]) => {
      if (range.from && range.to) {
        dateFilters[`${column}Start`] = range.from.toLocaleDateString("en-CA");
        dateFilters[`${column}End`] = range.to.toLocaleDateString("en-CA");
      }
    });

    // Combine both filter types
    const allFilters = { ...debouncedFilterValues, ...dateFilters };

    // Convert to string to compare with previous
    const filtersString = JSON.stringify(allFilters);

    // Only call onFiltersChange if filters have actually changed
    if (filtersString !== previousFiltersRef.current) {
      isUpdatingRef.current = true;
      previousFiltersRef.current = filtersString;

      // Use setTimeout to break the synchronous update cycle
      setTimeout(() => {
        onFiltersChange(allFilters);
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [debouncedFilterValues, debouncedDateRangeValues, onFiltersChange]);

  // Effect to trigger actual filter changes when debounced values change
  useEffect(() => {
    handleFiltersUpdate();
  }, [handleFiltersUpdate]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      isUpdatingRef.current = false;
    };
  }, []);

  const getDisplayValue = useCallback(
    (filter: FilterOption) => {
      // Use local state first (for immediate UI feedback), then server-side filter values, then table state
      if (onFiltersChange) {
        return (
          localFilterValues[filter.column] || filterValues[filter.column] || ""
        );
      }
      const currentFilterValue = table
        .getColumn(filter.column)
        ?.getFilterValue() as string;
      return currentFilterValue || "";
    },
    [localFilterValues, filterValues, onFiltersChange, table]
  );

  const handleFilterChange = useCallback(
    (filterColumn: string, value: string | string[]) => {
      const stringValue = Array.isArray(value) ? value[0] || "" : value;

      if (onFiltersChange) {
        // Server-side filtering with debouncing
        setLocalFilterValues((prev) => {
          const newFilters = { ...prev };
          if (stringValue) {
            newFilters[filterColumn] = stringValue;
          } else {
            delete newFilters[filterColumn];
          }
          return newFilters;
        });
      } else {
        // Client-side filtering (immediate)
        table.getColumn(filterColumn)?.setFilterValue(stringValue);
      }
    },
    [onFiltersChange, table]
  );

  const handleDateRangeChange = useCallback(
    (
      filterColumn: string,
      range: { from: Date | undefined; to: Date | undefined }
    ) => {
      if (onFiltersChange) {
        // Server-side filtering with debouncing
        setLocalDateRangeValues((prev) => ({
          ...prev,
          [filterColumn]: range,
        }));
      }
    },
    [onFiltersChange]
  );

  const getDateRangeValue = useCallback(
    (filter: DateRangeFilterOption) => {
      if (onFiltersChange) {
        // Use local state first (for immediate UI feedback)
        if (localDateRangeValues[filter.column]) {
          return localDateRangeValues[filter.column];
        }

        // Fall back to server-side filter values
        const startDate = filterValues[`${filter.column}Start`];
        const endDate = filterValues[`${filter.column}End`];

        if (startDate && endDate) {
          return {
            from: new Date(startDate),
            to: new Date(endDate),
          };
        }
      }

      return { from: undefined, to: undefined };
    },
    [localDateRangeValues, filterValues, onFiltersChange]
  );

  return (
    <>
      {filters.map((filter) => (
        <Combobox
          key={filter.column}
          list={filter.options}
          value={getDisplayValue(filter)}
          onChange={(value) => handleFilterChange(filter.column, value)}
          placeholder={filter.label}
          className="w-auto capitalize"
        />
      ))}

      {dateRangeFilters.map((filter) => (
        <DateRangePicker
          key={filter.column}
          label={filter.label}
          value={getDateRangeValue(filter)}
          onChange={(range) => handleDateRangeChange(filter.column, range)}
        />
      ))}
    </>
  );
}
