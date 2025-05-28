import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSortPreferencesStore } from "@/stores/useSortPreferencesStore";
import { AlignVerticalSpaceAround, SeparatorHorizontal, Shapes, SortAsc, SortDesc } from "lucide-react";
import { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type SortDirection = "asc" | "desc";
type SortBy = "name" | "kind" | "dateAdded" | "dateUpdated" | "size"
type FolderArrangement = "separated" | "mixed";

export function SortOptions(props: ComponentProps<typeof Button>) {
  // Use Zustand store instead of localStorage hooks
  const sortDirection = useSortPreferencesStore((state) => state.sortDirection);
  const setSortDirection = useSortPreferencesStore((state) => state.setSortDirection);
  
  const sortBy = useSortPreferencesStore((state) => state.sortBy);
  const setSortBy = useSortPreferencesStore((state) => state.setSortBy);
  
  const folderArrangement = useSortPreferencesStore((state) => state.folderArrangement);
  const setFolderArrangement = useSortPreferencesStore((state) => state.setFolderArrangement);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          {...props}
          className={cn(
            "group shadow-none text-sidebar-foreground hover:text-primary border border-transparent hover:border-border",
            props.className
          )}
          variant="secondary"
        >
          <AlignVerticalSpaceAround className="size-4 group-hover:scale-105 transition-transform" />
          <span className="sr-only">Sort Document or Folder</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-48">
        <DropdownMenuLabel>Sort By</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
          <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="kind">Kind</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dateAdded">Date Added</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dateUpdated">Date Updated</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="size">Size</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Direction</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup 
          value={sortDirection} 
          onValueChange={(value) => setSortDirection(value as SortDirection)}
        >
          <DropdownMenuRadioItem value="asc" className="flex items-center">
            <SortAsc className="size-4 mr-2" />
            Ascending
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc" className="flex items-center">
            <SortDesc className="size-4 mr-2" />
            Descending
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Folders and Files</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup 
          value={folderArrangement} 
          onValueChange={(value) => setFolderArrangement(value as FolderArrangement)}
        >
          <DropdownMenuRadioItem value="separated" className="flex items-center">
            <SeparatorHorizontal className="size-4 mr-2" />
            Separated
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="mixed" className="flex items-center"
          disabled={sortBy == "kind"}>
            <Shapes className="size-4 mr-2" />
            Mixed
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}