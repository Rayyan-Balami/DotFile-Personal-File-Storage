"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchStore } from "@/stores/useSearchStore";
import { Undo } from "lucide-react";
import { useEffect } from "react";

function SearchOptions() {
  const { filters, setFilters } = useSearchStore();

  // Item type options
  const itemTypeOptions = [
    { label: "Folders", value: "folder" },
    { label: "Files", value: "file" },
  ];

  // File type options based on MIME categories
  const fileTypeOptions = [
    { label: "Images", value: "image" },
    { label: "Videos", value: "video" },
    { label: "Audio", value: "audio" },
    { label: "Documents", value: "document" },
    { label: "Spreadsheets", value: "spreadsheet" },
    { label: "Presentations", value: "presentation" },
    { label: "Archives", value: "archive" },
    { label: "Code", value: "code" },
    { label: "Other", value: "other" },
  ];

  // Location options
  const locationOptions = [
    { label: "My Drive", value: "myDrive" },
    { label: "Trash", value: "trash" },
    { label: "Recent", value: "recent" },
  ];

  const handleItemTypeChange = (value: string | string[]) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    setFilters(prev => ({ ...prev, itemType: newValue }));
  };

  const handleFileTypeChange = (value: string | string[]) => {
    // For multiple selection, value will be an array
    const newValue = Array.isArray(value) ? value : [value];
    setFilters(prev => ({ ...prev, fileType: newValue }));
  };

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
  };

  const handlePinnedToggle = (checked: boolean) => {
    setFilters(prev => ({ ...prev, isPinned: checked }));
  };

  const handleLocationChange = (value: string | string[]) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    setFilters(prev => ({ ...prev, location: newValue }));
  };

  const clearFilters = () => {
    setFilters({
      itemType: 'all',
      fileType: [],
      dateRange: { from: undefined, to: undefined },
      isPinned: false,
      location: 'myDrive',
    });
  };

  const hasActiveFilters = 
    filters.itemType !== 'all' || 
    filters.fileType.length > 0 ||
    filters.dateRange.from || 
    filters.dateRange.to ||
    filters.isPinned ||
    filters.location !== 'myDrive';

  // Debounce the filters to avoid too many rapid updates
  const debouncedFilters = useDebounce(filters, 500);

  // Effect to handle debounced filter changes
  useEffect(() => {
    console.log('Debounced filters applied:', debouncedFilters);
  }, [debouncedFilters]);

  return (
    <section className="min-w-full -order-1 flex items-center gap-2 overflow-x-auto flex-1 no-scrollbar">
      {/* Clear Filters Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={clearFilters}
        className="text-muted-foreground hover:text-foreground"
        disabled={!hasActiveFilters}
      >
        <Undo className="size-4" />
        <span className="sr-only">Clear Filters</span>
      </Button>

      {/* Item Type Picker (folder/file) */}
      <Combobox
        list={itemTypeOptions}
        value={filters.itemType}
        onChange={handleItemTypeChange}
        placeholder="Item Type"
        className="w-auto min-w-32"
      />

      {/* File Types Dropdown */}
      <Combobox
        list={fileTypeOptions}
        value={filters.fileType}
        onChange={handleFileTypeChange}
        placeholder="File Type"
        className="w-auto min-w-32"
        disabled={filters.itemType === 'folder'}
        multiple={true}
      />

      {/* Date Range Picker */}
      <DateRangePicker
        label="Date Range"
        value={filters.dateRange}
        onChange={handleDateRangeChange}
      />

      {/* Pinned Toggle */}
      <div className="flex items-center gap-2 whitespace-nowrap rounded-md text-sm border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-9 px-2.5 py-2">
        <Checkbox
          id="pinned-filter"
          checked={filters.isPinned}
          onCheckedChange={handlePinnedToggle}
        />
        <label htmlFor="pinned-filter">
          Pinned Only
        </label>
      </div>

      {/* Location Dropdown */}
      <Combobox
        list={locationOptions}
        value={filters.location}
        onChange={handleLocationChange}
        placeholder="Location"
        className="w-auto min-w-32"
      />
    </section>
  );
}

export default SearchOptions;
