import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Folder, FolderProps } from "@/components/ui/icons-svg-repo";
import { cn } from "@/lib/utils";
import {
  Copy,
  Download,
  Lock,
  MoreHorizontal,
  Pencil,
  Reply,
  Share,
  Trash2
} from "lucide-react";
import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface FolderCardProps {
  name: string;
  items?: string; // This represents the number of items
  href?: string;
  isPrivate?: boolean;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  className?: string;
  type?: "large" | "compact" | "list"; // New prop for card type
  isAlternate?: boolean; // New prop for alternating row background
  color?: FolderProps['color']; // Add color prop using the Folder component's color prop type
}

// Common menu actions that can be reused by both context and dropdown menus
const menuActions = [
  { icon: Pencil, label: "Rename" },
  { icon: Share, label: "Share" },
  { icon: Download, label: "Download" },
  { icon: Copy, label: "Duplicate" },
  { icon: Trash2, label: "Delete", separator: true },
];

// Generate menu items for both context menu and dropdown
const MenuItems = ({ isContextMenu = true }) => {
  const MenuItem = isContextMenu ? ContextMenuItem : DropdownMenuItem;
  const MenuSeparator = isContextMenu
    ? ContextMenuSeparator
    : DropdownMenuSeparator;

  return (
    <>
      {menuActions.map(({ icon: Icon, label, separator }) => (
        <React.Fragment key={label}>
          {separator && <MenuSeparator />}
          <MenuItem onClick={(e) => e.stopPropagation()}>
            <Icon className="text-muted-foreground mr-2 h-4 w-4" />
            <span>{label}</span>
          </MenuItem>
        </React.Fragment>
      ))}
    </>
  );
};

// Component for the dropdown/more options button that appears in all card types
const MoreOptionsButton = () => (
  <div
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
  >
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="rounded-md size-6.5 [&>svg]:size-[0.75rem] p-0.5 shadow-none"
          aria-label="More options"
        >
          <MoreHorizontal />
          <span className="sr-only">More options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="end">
        <MenuItems isContextMenu={false} />
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

export function FolderCard({
  name,
  items = "0",
  href = "#",
  className,
  type = "large",
  isAlternate = false, // Add default value
  color = "default", // Add default color value
}: FolderCardProps) {
  // Info section common to all card types
  const infoSection = (includeDate: boolean = false) => (
    <div className="flex-1 flex items-center gap-2.25 text-xs text-muted-foreground">
      {includeDate && (
        <Tooltip delayDuration={1000}>
          <TooltipTrigger asChild>
            <span
              className="text-xs w-full max-w-xs text-muted-foreground whitespace-nowrap line-clamp-1"
              aria-label="Last modified on Mar 1, 2023"
            >
              Mar 1, 2023・12:00 PM
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Last modified on Mar 1, 2023 at 12:00 PM</p>
          </TooltipContent>
        </Tooltip>
      )}
      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>
          <span
            className={`${includeDate ? "ml-auto" : "line-clamp-1"} whitespace-nowrap`}
            aria-label={`${items} items`}
          >
            {items} Items
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{items} items</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="ml-auto rounded-md size-6.5 [&>svg]:size-[0.75rem] p-0.5 font-normal"
            aria-label="Private"
          >
            <Lock />
            <span className="sr-only">Only Me</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Private</p>
        </TooltipContent>
      </Tooltip>
      <MoreOptionsButton />
    </div>
  );

  // Card configurations by type
  const cardConfigs = {
    large: {
      wrapperClass: cn(
        "flex flex-col rounded-md border hover:border-muted-foreground/50 hover:shadow-xs transition-shadow ease-out duration-300 ",
        isAlternate && "bg-muted/40",
        className
      ),
      linkClass: "p-1.25 group flex flex-col gap-2.5",
      iconSize: "size-12.5", // Fixed explicit size
      iconWrapperClass: "h-26 relative bg-muted group-hover:bg-muted-foreground/15 transition-colors ease-out duration-300 p-1 grid place-content-center rounded",
      nameClass: "text-sm font-[425] line-clamp-1",
      contentClass: "mx-1 gap-1 flex flex-col flex-1",
    },
    compact: {
      wrapperClass: cn(
        "flex flex-col rounded-md border hover:border-muted-foreground/50 hover:shadow-xs transition-shadow ease-out duration-300 ",
        isAlternate && "bg-muted/40",
        className
      ),
      linkClass: "p-1.25 group flex gap-1.5",
      iconSize: "size-8.5", // Fixed explicit size
      iconWrapperClass: "relative h-full aspect-square bg-muted group-hover:bg-muted-foreground/15 transition-colors ease-out duration-300 p-1 grid place-content-center rounded",
      nameClass: "text-sm font-[425] line-clamp-1",
      contentClass: "mx-1 gap-1 flex flex-col flex-1",
    },
    list: {
      wrapperClass: cn(
        "flex flex-col rounded-md border border-transparent hover:border-muted-foreground/50 hover:shadow-xs transition-shadow ease-out duration-300 ",
        isAlternate && "bg-muted/50",
        className
      ),
      linkClass: "p-1.25 group flex lg:item-center gap-1.5",
      iconSize: "size-6.5", // Fixed explicit size
      iconWrapperClass: "relative h-full aspect-square bg-muted group-hover:bg-muted-foreground/15 transition-colors ease-out duration-300 p-1 grid place-content-center rounded",
      nameClass: "text-sm font-[425] line-clamp-1 w-full max-w-sm my-auto",
      contentClass: "mx-1 gap-1 flex flex-col lg:flex-row lg:item-center flex-1",
    },
  };

  const config = cardConfigs[type];

  const renderCard = () => (
    <div className={config.wrapperClass}>
      <a href={href} className={config.linkClass}>
        <div className={config.iconWrapperClass}>
          <Tooltip delayDuration={1000}>
            <TooltipTrigger className="cursor-pointer">
              <>
                <Folder className={config.iconSize} color={color} />
                {/* pinned indicator */}
                <div className="absolute bottom-0.5 -translate-x-1/2 left-1/2 w-1.75 bg-black rounded-full h-[2.5px]" />
              </>
            </TooltipTrigger>
            <TooltipContent>
              <p>Pinned</p>
            </TooltipContent>
          </Tooltip>
          {/* shortcut indicator */}
          <Tooltip delayDuration={1000}>
            <TooltipTrigger asChild>
              <Reply className="absolute top-0.5 right-0.5 size-4 border p-0.25 bg-background rounded-md shadow-xs stroke-[2.25]" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Shared Shortcut</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className={config.contentClass}>
          <Tooltip delayDuration={1000}>
            <TooltipTrigger asChild>
              <h3 className={config.nameClass} aria-label={name}>
                {name}
              </h3>
            </TooltipTrigger>
            <TooltipContent className="text-wrap">
              <div className="max-w-[16rem] line-clamp-2" aria-label={name} title={name}>
              {name}</div>
            </TooltipContent>
          </Tooltip>
          {type === "list" ? infoSection(true) : infoSection()}
        </div>
      </a>
    </div>
  );

  return (
    <TooltipProvider>
      <ContextMenu>
        <ContextMenuTrigger asChild>{renderCard()}</ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <MenuItems isContextMenu={true} />
        </ContextMenuContent>
      </ContextMenu>
    </TooltipProvider>
  );
}