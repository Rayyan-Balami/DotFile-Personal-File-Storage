import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Search, UndoDot } from "lucide-react";
import React, { useState } from "react";

interface SearchColumn {
  column: string;
  label: string;
}

interface DataTableSearchProps<TData> {
  table: Table<TData>;
  searchColumns?: SearchColumn[];
  onSearchChange?: (search: string, searchColumns?: string[]) => void;
  searchValue?: string;
}

export function DataTableSearch<TData>({ 
  table, 
  searchColumns = [], 
  onSearchChange,
  searchValue = ""
}: DataTableSearchProps<TData>) {
  const [searchFilters, setSearchFilters] = useState<Record<string, string>>({});
  const [activeSelectedIndexes, setActiveSelectedIndexes] = useState<number[]>([0]); // Manage multiple selected indexes
  const [globalSearch, setGlobalSearch] = useState(searchValue);

  // Update global search when searchValue prop changes
  React.useEffect(() => {
    setGlobalSearch(searchValue);
  }, [searchValue]);

  const handleSearchFilter = (event: React.ChangeEvent<HTMLInputElement>, columnId: string) => {
    const value = event.target.value;
    setSearchFilters((prev) => ({
      ...prev,
      [columnId]: value,
    }));
    
    if (onSearchChange) {
      // Server-side search - trigger search with selected columns
      const selectedColumns = searchColumns
        .filter((_, index) => activeSelectedIndexes.includes(index))
        .map(col => col.column);
      onSearchChange(value, selectedColumns);
    } else {
      // Client-side search
      table.getColumn(columnId)?.setFilterValue(value);
    }
  };

  const handleClearSearch = () => {
    setSearchFilters({});
    setGlobalSearch("");
    
    if (onSearchChange) {
      // Server-side - clear search
      onSearchChange("", []);
    } else {
      // Client-side - clear all column filters
      searchColumns.forEach(({ column }) =>
        table.getColumn(column)?.setFilterValue("")
      );
    }
  };

  const handleCheckboxChange = (index: number) => {
    setActiveSelectedIndexes(
      (prev) =>
        prev.includes(index)
          ? prev.filter((i) => i !== index) // Deselect if already selected
          : [...prev, index] // Add index if not selected
    );
  };

  if (searchColumns.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="gap-1">
            <Search className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
        <DropdownMenuLabel>Search Filters</DropdownMenuLabel>
        <DropdownMenuSeparator />
          {searchColumns.map(({ label, column }, index) => (
            <DropdownMenuCheckboxItem
              key={column} // Use column ID for key
              className="capitalize"
              checked={activeSelectedIndexes.includes(index)}
              onCheckedChange={() => {
                handleCheckboxChange(index);
              }}
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* //button to clear all search filters */}
      {activeSelectedIndexes.length > 0 && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleClearSearch}
          disabled={Object.keys(searchFilters).length === 0 && globalSearch === ""}
        >
          <UndoDot className="w-4 h-4" />
        </Button>
      )}
      {searchColumns
        .filter((_, index) => activeSelectedIndexes.includes(index)) // Filter only active indexes
        .map(({ column, label }) => (
          <Input
            key={column} // Use column ID for key
            placeholder={`Search ${label}`} // Display the label in the placeholder
            value={searchFilters[column] || ""}
            onChange={(event) => handleSearchFilter(event, column)}
            className="flex-1 h-9" // Always show active inputs
          />
        ))}
    </div>
  );
}