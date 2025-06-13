import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { colorMap } from "@/config/colors";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchStore } from "@/stores/useSearchStore";
import { logger } from "@/utils/logger";
import { Squircle, Undo } from "lucide-react";
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

  const handleItemTypeChange = (value: string | string[]) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    setFilters((prev) => ({ ...prev, itemType: newValue }));
  };

  const handleFileTypeChange = (value: string | string[]) => {
    // For multiple selection, value will be an array
    const newValue = Array.isArray(value) ? value : [value];
    setFilters((prev) => ({ ...prev, fileType: newValue }));
  };

  const handleDateRangeChange = (range: {
    from: Date | undefined;
    to: Date | undefined;
  }) => {
    setFilters((prev) => ({ ...prev, dateRange: range }));
  };

  const handlePinnedToggle = (checked: boolean) => {
    setFilters((prev) => ({ ...prev, isPinned: checked }));
  };

  const clearFilters = () => {
    setFilters({
      itemType: "all",
      fileType: [],
      dateRange: { from: undefined, to: undefined },
      isPinned: false,
      colors: [],
    });
  };

  const hasActiveFilters =
    filters.itemType !== "all" ||
    filters.fileType.length > 0 ||
    filters.dateRange.from ||
    filters.dateRange.to ||
    filters.isPinned ||
    filters.colors.length > 0;

  // Debounce the filters to avoid too many rapid updates
  const debouncedFilters = useDebounce(filters, 500);

  // Effect to handle debounced filter changes
  useEffect(() => {
    logger.info("Debounced filters applied:", debouncedFilters);
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
        disabled={filters.itemType === "folder"}
        multiple={true}
      />

      {/* Date Range Picker */}
      <DateRangePicker
        label="Date Range"
        value={filters.dateRange}
        onChange={handleDateRangeChange}
      />

      {/* Color Filter Indicator */}
      <div className="flex items-center gap-4 whitespace-nowrap rounded-md text-sm border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-9 px-2.5 py-2">
        <span className="text-sm">Colors</span>
        <div className="flex gap-1">
          {filters.colors.length > 0 ? (
            filters.colors.map((color) => (
              <Squircle
                key={color}
                className="size-4 stroke-2"
                fill={colorMap[color].secondary}
                stroke={colorMap[color].primary}
              />
            ))
          ) : (
            <Squircle className="size-4 stroke-2 fill-muted stroke-muted-foreground" />
          )}
        </div>
      </div>

      {/* Pinned Toggle */}
      <div className="flex items-center gap-4 whitespace-nowrap rounded-md text-sm border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-9 px-2.5 py-2 cursor-pointer *:cursor-pointer">
        <label htmlFor="pinned-filter">Pinned Only</label>
        <Checkbox
          id="pinned-filter"
          checked={filters.isPinned}
          onCheckedChange={handlePinnedToggle}
          className="size-3.5"
        />
      </div>
    </section>
  );
}

export default SearchOptions;
