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
import { Folder } from "@/components/ui/icons-svg-repo";
import { FileIcon, defaultStyles } from "react-file-icon";
import { cn } from "@/lib/utils";
import {
  Copy,
  Download,
  Lock,
  LockOpen,
  MoreHorizontal,
  Pencil,
  Pin,
  Reply,
  Share,
  Squircle,
  Trash2,
} from "lucide-react";
import React, { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { ColorOption, tagColorMap, getBgColorClass, getBgColor } from "@/config/colors";

// Types
interface BaseCardProps {
  name: string;
  href?: string;
  isShared?: boolean;
  isSelected?: boolean;
  isShortcut?: boolean;
  isPinned?: boolean;
  onSelect?: (selected: boolean) => void;
  className?: string;
  view?: "list" | "compact" | "large";
  isAlternate?: boolean;
  modified?: string;
  tag?: string;
}

interface FolderCardProps extends BaseCardProps {
  type: "folder";
  items?: string;
}

interface DocumentCardProps extends BaseCardProps {
  type: "document";
  size?: string;
  extension: keyof typeof defaultStyles;
  previewUrl?: string;
}

type ItemCardProps = FolderCardProps | DocumentCardProps;

// Configuration
const menuActions = [
  { icon: Pencil, label: "Rename" },
  { icon: Share, label: "Share" },
  { icon: Download, label: "Download" },
  { icon: Copy, label: "Duplicate" },
  { icon: Trash2, label: "Delete", separator: true },
];

const VIEW_CONFIGS = {
  large: {
    wrapperClass:
      "flex flex-col rounded-md border bg-muted hover:border-muted-foreground/50 hover:bg-muted-foreground/15 hover:shadow-xs transition-shadow ease-out duration-300",
    linkClass: "group flex flex-col gap-2.5",
    padding: "p-1.25",
    iconWrapperClass: "aspect-video shrink-0 grid",
    iconSize: "w-12.5",
    nameClass: "text-sm font-[425] flex-1 line-clamp-1",
    contentClass: "mx-1 gap-1 flex flex-col flex-1",
    pinWidth: "w-7",
  },
  compact: {
    wrapperClass:
      "flex flex-col rounded-md border hover:border-muted-foreground/50 hover:shadow-xs transition-shadow ease-out duration-300",
    linkClass: "group flex gap-1.5",
    padding: "p-1.25",
    iconWrapperClass: "h-12.5 shrink-0 aspect-square grid place-content-center",
    iconSize: "size-full",
    nameClass: "text-sm font-[425] flex-1 line-clamp-1",
    contentClass: "mx-1 gap-1 flex flex-col flex-1",
    pinWidth: "w-6",
  },
  list: {
    wrapperClass:
      "flex flex-col rounded-md border border-transparent hover:border-muted-foreground/50 hover:shadow-xs transition-shadow ease-out duration-300",
    linkClass: "group flex lg:items-center gap-1.5",
    padding: "p-1.25",
    iconWrapperClass:
      "h-12.5 lg:h-10.5 shrink-0 aspect-square grid place-content-center",
    iconSize: "size-full",
    nameClass: "text-sm font-[425] flex-1 line-clamp-1 w-full max-w-sm my-auto",
    contentClass: "mx-1 gap-1 flex flex-col lg:flex-row lg:items-center flex-1",
    pinWidth: "w-5",
  },
};

// Utility functions
const COLOR_OPTIONS = Object.keys(tagColorMap) as ColorOption[];

function getTagColor(tag: string): ColorOption {
  const hash = tag.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLOR_OPTIONS[hash % COLOR_OPTIONS.length];
}

function lightenColor(hex: string, percent: number) {
  const adjustColor = (value: number) =>
    Math.min(255, value + (255 - value) * percent);
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  return `#${((1 << 24) | (adjustColor(r) << 16) | (adjustColor(g) << 8) | adjustColor(b)).toString(16).slice(1)}`;
}

// Sub-components
const MenuItems = React.memo(({ isContextMenu = true }) => {
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
});
MenuItems.displayName = "MenuItems";

const MoreOptionsButton = React.memo(() => {
  const [open, setOpen] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div onClick={handleClick}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="rounded-md size-5.5 [&>svg]:size-[0.75rem] p-0.5 shadow-none text-muted-foreground hover:bg-secondary-foreground/10 hover:text-foreground"
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
});
MoreOptionsButton.displayName = "MoreOptionsButton";

const InfoSection = React.memo(
  ({
    includeDate = false,
    modified,
    itemType,
    itemSize,
    itemsCount,
    isShared,
    isPinned,
  }: {
    includeDate?: boolean;
    modified: string;
    itemType: "folder" | "document";
    itemSize?: string;
    itemsCount?: string;
    isShared: boolean;
    isPinned: boolean;
  }) => {
    const details = itemType === "folder" ? `${itemsCount} Items` : itemSize;
    const tooltip =
      itemType === "folder" ? `${itemsCount} items` : `File size: ${itemSize}`;

    return (
      <div className="flex-1 h-full flex items-center gap-2.25 text-xs text-muted-foreground">
        {includeDate && (
          <Tooltip delayDuration={1000}>
            <TooltipTrigger asChild>
              <span className="text-xs w-full max-w-xs text-muted-foreground whitespace-nowrap line-clamp-1">
                {modified}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Last modified on {modified}</p>
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip delayDuration={1000}>
          <TooltipTrigger asChild>
            <span
              className={`${includeDate ? "" : "line-clamp-1"} whitespace-nowrap flex-1`}
            >
              {details}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>

        <MoreOptionsButton />
      </div>
    );
  }
);
InfoSection.displayName = "InfoSection";

// Main component
export function ItemCard(props: ItemCardProps) {
  const {
    name,
    href = "#",
    className,
    view = "large",
    isAlternate = false,
    isShared = false,
    isShortcut = false,
    isPinned = false,
    modified = "Mar 1, 2023・12:00 PM",
    tag,
  } = props;

  // Extract type-specific props
  const isFolder = props.type === "folder";
  const items = isFolder ? (props as FolderCardProps).items : undefined;
  const size = !isFolder ? (props as DocumentCardProps).size : undefined;
  const extension = !isFolder
    ? (props as DocumentCardProps).extension
    : undefined;
  const previewUrl = !isFolder
    ? (props as DocumentCardProps).previewUrl
    : undefined;
  const hasPreview = Boolean(previewUrl) && view === "large";

  // Get color based on tag
  const tagColor = useMemo(() => (tag ? getTagColor(tag) : "default"), [tag]);

  console.log("Tag Color:", tagColor);

  // Get view configuration
  const config = VIEW_CONFIGS[view];
  const wrapperClass = cn(
    config.wrapperClass,
    isAlternate && "bg-muted/40",
    className
  );
  const iconWrapperPadding = hasPreview
    ? "p-0"
    : view === "large"
      ? "p-10 place-content-center"
      : "p-2.5";

  // Render file/folder icon
  const renderIcon = () => {
    if (isFolder) {
      return (
        <div className={cn(config.iconSize, "relative")}>
          <Folder className={config.iconSize} color={tagColor} />
        </div>
      );
    }

    // Only show preview in large view
    if (previewUrl && view === "large") {
      return (
        <img
          src={previewUrl}
          alt={`Preview of ${name}`}
          className={cn(
            config.iconSize,
            "w-full h-full object-cover object-center relative rounded"
          )}
        />
      );
    }

    const {
      labelColor = "#52525b",
      glyphColor = labelColor,
      color = lightenColor(labelColor, 0.8),
      ...rest
    } = defaultStyles[extension!] || {};

    return (
      <div className={cn(config.iconSize, "relative")}>
        <FileIcon
          extension={extension!}
          {...rest}
          color={color}
          glyphColor={glyphColor}
          labelColor={labelColor}
        />
      </div>
    );
  };

  // Card content
  const cardContent = (
    <div className={wrapperClass}>
      <a href={href} className={cn(config.linkClass, config.padding)}>
        {/* Icon section */}
        <div
          className={cn(
            config.iconWrapperClass,
            iconWrapperPadding,
            "relative bg-background transition-colors ease-out duration-300 cursor-pointer rounded overflow-hidden"
          )}
        >
          <Tooltip delayDuration={1000}>
            <TooltipTrigger>
              {renderIcon()}
              {tag && (
                <div
                  className={`
                  absolute bottom-0 left-1/2 transform -translate-x-1/2
                  ${config.pinWidth}
                  rounded-t-full border-[3px] border-b-0 border-muted 
                  h-[6px]`}
                  style={getBgColor(tagColor)}
                />
              )}
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isFolder ? "Folder" : `${extension?.toUpperCase()} File`}
                {isPinned ? " (Pinned)" : ""}
                {tag ? ` • ${tag}` : ""}
              </p>
            </TooltipContent>
          </Tooltip>

          {isShortcut && (
            <Tooltip delayDuration={1000}>
              <TooltipTrigger asChild>
                <Reply className="absolute top-0.5 right-0.5 size-4 border p-0.25 bg-background rounded-md shadow-xs stroke-[2.25]" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Shared Shortcut</p>
              </TooltipContent>
            </Tooltip>
          )}

        </div>

        {/* Content section */}
        <div className={config.contentClass}>
          {/* File/folder name and tag */}
          <div className="flex-1 flex items-center gap-2.25">
            <Tooltip delayDuration={1000}>
              <TooltipTrigger asChild>
                <h3 className={config.nameClass}>{name}</h3>
              </TooltipTrigger>
              <TooltipContent className="text-wrap">
                <div className="max-w-[16rem] line-clamp-2">{name}</div>
              </TooltipContent>
            </Tooltip>

            {isPinned && (
              <Tooltip delayDuration={1000}>
                <TooltipTrigger className="rounded-md w-5.5 [&>svg]:size-[0.75rem] font-normal grid place-content-center">
                  <Pin className="rotate-[25deg]" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Pinned</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* File/folder info and actions */}
          <InfoSection
            includeDate={view === "list"}
            modified={modified}
            itemType={props.type}
            itemSize={size}
            itemsCount={items}
            isShared={isShared}
            isPinned={isPinned}
          />
        </div>
      </a>
    </div>
  );

  // Wrap with context menu
  return (
    <TooltipProvider>
      <ContextMenu>
        <ContextMenuTrigger asChild>{cardContent}</ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <MenuItems isContextMenu={true} />
        </ContextMenuContent>
      </ContextMenu>
    </TooltipProvider>
  );
}
