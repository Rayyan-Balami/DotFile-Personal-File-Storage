import { AlignVerticalSpaceAround, SortAsc, SortDesc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  Menubar,
  MenubarContent,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";

type SortDirection = "asc" | "desc";
type SortBy = "name" | "kind" | "dateModified" | "dateAdded" | "dateOpened" | "size" | "desk";
type FolderArrangement = "separated" | "mixed";

export function SortOptions() {
  const [sortDirection, setSortDirection] = useLocalStorage<SortDirection>("sort-direction", "asc");
  const [sortBy, setSortBy] = useLocalStorage<SortBy>("sort-by", "name");
  const [folderArrangement, setFolderArrangement] = useLocalStorage<FolderArrangement>(
    "folder-arrangement", 
    "separated"
  );

  return (
      <MenubarMenu>
        <MenubarTrigger asChild>
          <Button
            className="group shadow-none first:rounded-l-md last:rounded-r-md rounded-none text-sidebar-foreground hover:text-primary border border-transparent hover:border-border"
            variant="secondary"
          >
            <AlignVerticalSpaceAround className="size-4 group-hover:scale-105 transition-transform" />
            <span className="sr-only">Sort Document or Folder</span>
          </Button>
        </MenubarTrigger>
        <MenubarContent>
          <MenubarLabel>Sort By</MenubarLabel>
          <MenubarSeparator />
          <MenubarRadioGroup value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
            <MenubarRadioItem value="name">Name</MenubarRadioItem>
            <MenubarRadioItem value="kind">Kind</MenubarRadioItem>
            <MenubarRadioItem value="dateModified">Date Modified</MenubarRadioItem>
            <MenubarRadioItem value="dateAdded">Date Added</MenubarRadioItem>
            <MenubarRadioItem value="dateOpened">Date Last Opened</MenubarRadioItem>
            <MenubarRadioItem value="size">Size</MenubarRadioItem>
            <MenubarRadioItem value="desk">Desk</MenubarRadioItem>
          </MenubarRadioGroup>
          <MenubarSeparator />
          <MenubarLabel>Direction</MenubarLabel>
          <MenubarSeparator />
          <MenubarRadioGroup 
            value={sortDirection} 
            onValueChange={(value) => setSortDirection(value as SortDirection)}
          >
            <MenubarRadioItem value="asc" className="flex items-center">
              <SortAsc className="size-4 mr-2" />
              Ascending
            </MenubarRadioItem>
            <MenubarRadioItem value="desc" className="flex items-center">
              <SortDesc className="size-4 mr-2" />
              Descending
            </MenubarRadioItem>
          </MenubarRadioGroup>
          <MenubarSeparator />
          <MenubarLabel>Folders and Files</MenubarLabel>
          <MenubarSeparator />
          <MenubarRadioGroup 
            value={folderArrangement} 
            onValueChange={(value) => setFolderArrangement(value as FolderArrangement)}
          >
            <MenubarRadioItem value="separated" className="flex items-center">
              <SortAsc className="size-4 mr-2" />
              Separated
            </MenubarRadioItem>
            <MenubarRadioItem value="mixed" className="flex items-center">
              <SortDesc className="size-4 mr-2" />
              Mixed
            </MenubarRadioItem>
          </MenubarRadioGroup>
        </MenubarContent>
      </MenubarMenu>
  );
}
