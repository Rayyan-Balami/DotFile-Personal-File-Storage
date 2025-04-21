import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  PanelRightClose,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { useSidebar } from "@/components/ui/sidebar";

export function NavigationControls() {
  const { toggleSidebar, open, state, isMobile } = useSidebar();

  return (
    <>
      {state !== "collapsed" && (
        <Button
          className="group shadow-none rounded-md text-sidebar-foreground hover:text-primary border border-transparent hover:border-border"
          variant="secondary"
          onClick={toggleSidebar}
        >
          <PanelRightClose
            className={`size-4.25 text-sidebar-foreground hover:text-sidebar-accent-foreground ${
              open ? "rotate-180" : ""
            } group-hover:scale-105 transition-transform`}
          />
        </Button>
      )}
      <ButtonGroup orientation="horizontal">
        <Button
          className="group shadow-none text-sidebar-foreground hover:text-sidebar-accent-foreground border border-transparent hover:border-border"
          variant="secondary"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-0.25 transition-transform" />
          <span className="sr-only">Go Back</span>
        </Button>
        <Button
          className="group shadow-none text-sidebar-foreground hover:text-sidebar-accent-foreground border border-transparent hover:border-border"
          variant="secondary"
        >
          <ArrowRight className="size-4 group-hover:translate-x-0.25 transition-transform" />
          <span className="sr-only">Go Forward</span>
        </Button>
        <Button
          className="group shadow-none text-sidebar-foreground hover:text-sidebar-accent-foreground border border-transparent hover:border-border"
          variant="secondary"
        >
          <ChevronDown className="size-4 group-hover:translate-y-0.25 transition-transform" />
          <span className="sr-only">List History</span>
        </Button>
      </ButtonGroup>

      <Button
        className="group shadow-none text-sidebar-foreground hover:text-sidebar-accent-foreground border border-transparent hover:border-border"
        variant="secondary"
      >
        <ArrowUp className="size-4 group-hover:-translate-y-0.25 transition-transform" />
        <span className="sr-only">Go One Level Up Directory</span>
      </Button>
    </>
  );
}
