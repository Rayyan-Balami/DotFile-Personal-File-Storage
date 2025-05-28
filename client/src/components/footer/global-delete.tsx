import { Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function GlobalDelete(props: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={cn(
        "group shadow-none text-sidebar-foreground hover:text-primary border border-transparent hover:border-border",
        props.className
      )}
      variant="secondary"
    >
      <Trash2 className="size-4 group-hover:scale-105 transition-transform" />
      <span className="sr-only">Delete selected</span>
    </Button>
  );
}

export default GlobalDelete;
