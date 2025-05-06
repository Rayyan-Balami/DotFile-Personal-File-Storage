import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { useViewPreferencesStore } from "@/stores/useViewPreferencesStore";
import { LayoutGrid, List, Rows2 } from "lucide-react";

export function ViewOptions() {
  // Use primitive selectors to avoid unnecessary re-renders
  const viewType = useViewPreferencesStore((state) => state.viewType);
  const setViewType = useViewPreferencesStore((state) => state.setViewType);
  
  return (
    <ButtonGroup orientation="horizontal" className="bg-secondary rounded-md">
      <Button
        className={`group shadow-none text-sidebar-foreground hover:text-primary border ${
          viewType === "large"
            ? "bg-secondary-foreground/2 hover:bg-secondary-foreground/2 text-primary"
            : "border-transparent hover:border-border"
        }`}
        variant="secondary"
        onClick={() => setViewType("large")}
      >
        <LayoutGrid className="size-4 group-hover:scale-105 transition-transform" />
        <span className="sr-only">Large View Document or Folder</span>
      </Button>
      <Button
        className={`group shadow-none text-sidebar-foreground hover:text-primary border ${
          viewType === "compact"
            ? "bg-secondary-foreground/2 hover:bg-secondary-foreground/2 text-primary"
            : "border-transparent hover:border-border"
        }`}
        variant="secondary"
        onClick={() => setViewType("compact")}
      >
        <Rows2 className="size-4 group-hover:scale-105 transition-transform" />
        <span className="sr-only">Compact View Document or Folder</span>
      </Button>
      <Button
        className={`group shadow-none text-sidebar-foreground hover:text-primary border ${
          viewType === "list"
            ? "bg-secondary-foreground/2 hover:bg-secondary-foreground/2 text-primary"
            : "border-transparent hover:border-border"
        }`}
        variant="secondary"
        onClick={() => setViewType("list")}
      >
        <List className="size-4 group-hover:scale-105 transition-transform" />
        <span className="sr-only">List View Document or Folder</span>
      </Button>
    </ButtonGroup>
  );
}