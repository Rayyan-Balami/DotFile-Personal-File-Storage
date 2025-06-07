import { GlobalDropdownMenu } from "@/components/menuItems/GlobalMenuItems";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useParams } from "@tanstack/react-router";
import { Ellipsis } from "lucide-react";
import { ComponentProps } from "react";

interface GlobalMenuProps extends ComponentProps<typeof Button> {
  // parentId is now optional since we determine it internally
  parentId?: string | null;
}

export function GlobalMenu({
  parentId: externalParentId,
  ...props
}: GlobalMenuProps) {
  // Determine current folder context internally
  const params = useParams({ strict: false });
  const currentFolderId = params.id || null;

  // Use external parentId if provided, otherwise use the current route context
  const parentId =
    externalParentId !== undefined ? externalParentId : currentFolderId;

  return (
    <GlobalDropdownMenu
      parentId={parentId}
      trigger={
        <Button
          {...props}
          className={cn(
            "group shadow-none text-sidebar-foreground hover:text-primary border border-transparent hover:border-border",
            props.className
          )}
          variant="secondary"
        >
          <Ellipsis className="size-4 group-hover:scale-105 transition-transform" />
          <span className="sr-only">Global menu</span>
        </Button>
      }
    />
  );
}
