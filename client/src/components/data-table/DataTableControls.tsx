import AlertDialog from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Columns2, Trash } from "lucide-react";

interface DataTableControlsProps {
  searchColumns: { key: string; label: string }[];
  filterColumns: { key: string; label: string; options: string[] }[];
  searchQueries: { [key: string]: string };
  filters: { [key: string]: string };
  columns: { key: string; label: string }[];
  visibleColumns: string[];
  selectedCount: number;
  setSearchQueries: React.Dispatch<
    React.SetStateAction<{ [key: string]: string }>
  >;
  setFilters: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  setVisibleColumns: React.Dispatch<React.SetStateAction<string[]>>;
  handleDeleteSelected: () => void;
}

export default function DataTableControls({
  searchColumns,
  filterColumns,
  searchQueries,
  filters,
  columns,
  visibleColumns,
  selectedCount,
  setSearchQueries,
  setFilters,
  setVisibleColumns,
  handleDeleteSelected,
}: DataTableControlsProps) {
  return (
    <div className="flex gap-2 flex-wrap items-center">
      {searchColumns.map((col) => (
        <Input
          key={col.key}
          type="text"
          placeholder={`Search ${col.label}...`}
          value={searchQueries[col.key] || ""}
          onChange={(e) =>
            setSearchQueries((prev) => ({ ...prev, [col.key]: e.target.value }))
          }
          className="sm:max-w-[16rem] w-full shrink-0 bg-foreground text-black"
        />
      ))}
      {filterColumns.map((filter) => (
        <Combobox
          key={filter.key}
          list={filter.options.map((option) => ({
            label: option.replace(/-/g, " "),
            value: option,
          }))}
          value={filters[filter.key] || ""}
          onChange={(val) =>
            setFilters((prev) => ({ ...prev, [filter.key]: val as string }))
          }
          placeholder={filter.label}
          className="w-fit h-9 bg-foreground text-black shadow-sm"
        />
      ))}
      <div className="ml-auto flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="bg-foreground text-black shadow-sm"
            >
              <Columns2 className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.key}
                checked={visibleColumns.includes(col.key)}
                onCheckedChange={(checked) =>
                  setVisibleColumns((prev) =>
                    checked
                      ? [...prev, col.key]
                      : prev.filter((k) => k !== col.key)
                  )
                }
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialog
          title={
            <>
              <span>Delete Selected</span>
              <Badge variant="outline" className="text-black">
                {selectedCount}
              </Badge>
            </>
          }
          description="Are you sure you want to delete the selected items?"
          size="icon"
          triggerLabel={<Trash className="size-4" />}
          acceptLabel="Delete"
          variant="destructive"
          className="bg-foreground text-black shadow-sm"
          disabled={selectedCount === 0}
          onAccept={handleDeleteSelected}
        />
      </div>
    </div>
  );
}