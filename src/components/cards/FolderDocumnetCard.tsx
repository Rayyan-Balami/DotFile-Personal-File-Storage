/**
 * FolderDocumentCard Component
 *
 * A versatile card component that displays either folders or documents in three variants:
 * - Large: Vertical layout with prominent icon
 * - Compact: Horizontal layout with smaller footprint
 * - List: Row-based layout optimized for tables/lists
 *
 * The component automatically handles document previews when available.
 */

import { ColorOption } from "@/config/colors";
import { EllipsisVertical, Pin } from "lucide-react";
import { FileIcon, defaultStyles } from "react-file-icon";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { FolderIcon } from "../ui/folder-icon";
import { useSelectionStore } from "@/store/useSelectionStore";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import React from "react";

// ===== Type Definitions =====

/** Available card layout variants */
type CardVariant = "large" | "compact" | "list";

/** Content types that can be displayed */
type CardType = "folder" | "document";

/** User information for avatars */
interface User {
  /** Optional image URL for the avatar */
  image?: string;
  /** Fallback text/initials when image is unavailable */
  fallback: string;
}

/** Main props interface for the FolderDocumentCard component */
interface FolderDocumentCardProps {
  /** Unique identifier for the item */
  id: string;
  /** Layout variant to display (defaults to "large") */
  variant?: CardVariant;
  /** Content type: either folder or document */
  type: CardType;
  /** Title text displayed on the card */
  title: string;
  /** Optional count of items contained (for folders) */
  itemCount?: number;
  /** Optional array of users associated with the content */
  users?: User[];
  /** Whether the item is pinned (displays pin icon) */
  isPinned?: boolean;
  /** Optional URL for document preview images */
  previewUrl?: string;
  /** File extension for document icons (defaults to "pdf") */
  fileExtension?: string;
  /** Additional CSS classes to apply */
  className?: string;
  /** Use alternate background styling (for list views) */
  alternateBg?: boolean;
  /** Handler for when the item is opened (double-click) */
  onOpen?: () => void;
  /** Color for folder icon (from ColorOption) */
  color?: ColorOption;
}

// ===== Helper Components =====

/**
 * Displays a hover indicator appropriate for the current variant
 */
function HoverIndicator({ 
  variant, 
  selected 
}: { 
  variant: CardVariant;
  selected: boolean;
}) {

  // Determine indicator position and dimensions based on variant
  const classes = {
    list: "left-[0px] top-1/2 -translate-y-1/2 w-[3.5px] h-[38%] rounded-r-full",
    compact:
      "left-[0px] top-1/2 -translate-y-1/2 w-[3.5px] h-[28%] rounded-r-full",
    large:
      "top-[0px] left-1/2 -translate-x-1/2 h-[3.5px] w-[12%] rounded-b-full",
  };

  return (
    <div
      className={`absolute z-10 opacity-0
        ${selected ? "opacity-100 bg-primary" : "group-hover:opacity-100 "}
         
        transition-all group-hover:bg-primary/80 ${classes[variant]}`}
      aria-hidden="true"
    />
  );
}

/**
 * Renders the appropriate icon (folder, file, or preview image)
 */
function FileOrFolderIcon({
  type,
  previewUrl,
  fileExtension = "pdf",
  title,
  variant,
  color = "default",
}: {
  type: CardType;
  variant: CardVariant;
  previewUrl?: string;
  fileExtension?: string;
  title: string;
  color?: ColorOption;
}) {
  // Apply appropriate scaling based on variant and type
  let scaleClass = "";
  if (type === "folder") {
    // Folders have different scaling for large vs other variants
    scaleClass = variant === "large" ? "*:scale-45" : "*:scale-65";
  } else if (type === "document" && !previewUrl) {
    // Documents (without preview) have variant-specific scaling
    scaleClass =
      variant === "large"
        ? "*:scale-25"
        : variant === "compact"
        ? "*:scale-35"
        : "*:scale-55";
  }

  // Size class based on variant
  let sizeClass = "";
  switch (variant) {
    case "large":
      sizeClass = "aspect-[3/2] min-h-14";
      break;
    case "compact":
      sizeClass = "aspect-[3/2] h-17";
      break;
    case "list":
      sizeClass = "aspect-[1/1] h-12 lg:h-9";
      break;
  }

  // Get file styles from the library or use fallbacks
  const baseStyles =
    defaultStyles[fileExtension as keyof typeof defaultStyles] || {};

  // Create a combined style object with intelligent fallbacks
  const iconStyles = {
    // Use extension's labelColor if available, otherwise use fallback
    labelColor: baseStyles.labelColor || "#52525b",

    // Use extension's glyphColor if available, fallback to labelColor or default
    glyphColor: baseStyles.glyphColor || baseStyles.labelColor || "#52525b",

    // Use extension's color if available, fallback to labelColor or default
    color: baseStyles.color || "#e7e5e4",

    // Preserve other style properties
    ...baseStyles,
  };

  return (
    <div
      className={`bg-sidebar shrink-0 relative ${sizeClass} flex items-center justify-center overflow-hidden ${scaleClass} rounded-[0.5rem]`}
    >
      {/* Render folder icon with the specified color */}
      {type === "folder" && <FolderIcon className="size-full" color={color} />}

      {/* Render document icon (when no preview is available) */}
      {type === "document" && !previewUrl && (
        <FileIcon extension={fileExtension} {...iconStyles} />
      )}

      {/* Render preview image (when available) */}
      {type === "document" && previewUrl && (
        <img
          src={previewUrl}
          className="object-center object-cover h-full w-full"
          alt={`Preview of ${title}`}
        />
      )}
    </div>
  );
}

/**
 * Displays user avatars (up to 3) with overflow indicator
 */
function UserAvatars({ users }: { users: User[] }) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center">
      {/* Show up to 3 user avatars */}
      {users.slice(0, 3).map((user, idx) => (
        <Avatar key={idx} className="size-4.5 first:ml-0 -ml-1">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback>{user.fallback}</AvatarFallback>
        </Avatar>
      ))}

      {/* Show count indicator for additional users */}
      {users.length > 3 && (
        <span className="size-4.5 first:ml-0 -ml-0.5 bg-primary grid place-content-center rounded-full text-[0.5rem] font-medium text-background">
          +{users.length - 3}
        </span>
      )}
    </div>
  );
}

/**
 * Shows item count with appropriate singular/plural text
 */
function ItemCount({ count }: { count?: number }) {
  if (count === undefined) return null;

  return (
    <span className="flex-1 my-1.5 text-xs text-muted-foreground">
      {count} {count === 1 ? "item" : "items"}
    </span>
  );
}

/**
 * Creates context menu items based on the content type
 */
function ContextMenuItems({
  type,
  title,
  onAction,
}: {
  type: CardType;
  title: string;
  onAction: (action: string) => void;
}) {
  // Add this wrapper function to delay action execution
  const handleActionWithDelay = (action: string) => {
    // Small delay prevents accidental clicks when menu first opens
    setTimeout(() => onAction(action), 100);
  };

  // Common menu items
  const commonItems = (
    <>
      <ContextMenuItem onClick={() => handleActionWithDelay("open")}>Open</ContextMenuItem>
      <ContextMenuItem onClick={() => handleActionWithDelay("rename")}>
        Rename
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => handleActionWithDelay("share")}>Share</ContextMenuItem>
      <ContextMenuItem onClick={() => handleActionWithDelay("copy-link")}>
        Copy link
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => handleActionWithDelay("pin")}>
        Pin/Unpin
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() => handleActionWithDelay("delete")}
        className="text-destructive"
      >
        Delete
      </ContextMenuItem>
    </>
  );

  // Folder-specific items
  if (type === "folder") {
    return (
      <>
        {commonItems}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => handleActionWithDelay("create-folder")}>
          Create new folder
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleActionWithDelay("upload-file")}>
          Upload file
        </ContextMenuItem>
      </>
    );
  }

  // Document-specific items
  return (
    <>
      {commonItems}
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => handleActionWithDelay("download")}>
        Download
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleActionWithDelay("preview")}>
        Preview
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleActionWithDelay("edit")}>Edit</ContextMenuItem>
    </>
  );
}

/**
 * Creates dropdown menu items based on the content type
 */
function DropdownMenuItems({
  type,
  title,
  onAction,
}: {
  type: CardType;
  title: string;
  onAction: (action: string) => void;
}) {
  // Common menu items
  const commonItems = (
    <>
      <DropdownMenuItem onClick={() => onAction("open")}>Open</DropdownMenuItem>
      <DropdownMenuItem onClick={() => onAction("rename")}>
        Rename
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onAction("share")}>Share</DropdownMenuItem>
      <DropdownMenuItem onClick={() => onAction("copy-link")}>
        Copy link
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onAction("pin")}>
        Pin/Unpin
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => onAction("delete")}
        className="text-destructive"
      >
        Delete
      </DropdownMenuItem>
    </>
  );

  // Folder-specific items
  if (type === "folder") {
    return (
      <>
        {commonItems}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAction("create-folder")}>
          Create new folder
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("upload-file")}>
          Upload file
        </DropdownMenuItem>
      </>
    );
  }

  // Document-specific items
  return (
    <>
      {commonItems}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onAction("download")}>
        Download
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onAction("preview")}>
        Preview
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onAction("edit")}>Edit</DropdownMenuItem>
    </>
  );
}

// Then memoize it
const MemoizedDropdownMenuItems = React.memo(DropdownMenuItems);

/**
 * Renders the content section of the card based on variant
 */
function CardContent({
  title,
  itemCount,
  users = [],
  isPinned = false,
  variant,
  type,
}: {
  title: string;
  itemCount?: number;
  users: User[];
  isPinned: boolean;
  variant: CardVariant;
  type: CardType;
}) {
  const handleAction = (action: string) => {
    console.log(`Action: ${action} on ${type} "${title}"`);
  };

  const dropdownMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={"ghost"}
          className="size-6 hover:bg-muted-foreground/10  cursor-pointer text-muted-foreground hover:text-foreground"
          aria-label="More options"
        >
          <EllipsisVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <MemoizedDropdownMenuItems type={type} title={title} onAction={handleAction} />
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // List variant has a unique horizontal layout
  if (variant === "list") {
    return (
      <div className="px-1 flex-1 flex gap-6">
        <div className="flex-1 flex max-lg:flex-col lg:items-center">
          <h3 className="text-sm font-[425] line-clamp-1 break-all max-w-sm w-full">
            {title}
          </h3>
          <div className="flex-1 flex items-center">
            <ItemCount count={itemCount} />
            {users.length > 0 && (
              <div className="lg:flex-1">
                <UserAvatars users={users} />
              </div>
            )}
          </div>
          <div className="flex-1 text-xs text-muted-foreground max-xl:hidden">
            2023-10-10 | 10:00 AM
          </div>
        </div>
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 pt-0.5">
          <Pin
            className={`size-4 text-muted-foreground ${
              isPinned ? "opacity-100" : "opacity-0"
            } rotate-45`}
            aria-hidden={!isPinned}
          />
          {/* dropdown trigger */}
          {dropdownMenu}
        </div>
      </div>
    );
  }

  // Large and compact variants share a similar vertical layout
  return (
    <div className="px-1 flex-1 flex gap-6">
      <div className="flex-1 flex flex-col">
        <h3 className="text-sm font-[425] line-clamp-1 break-all">{title}</h3>
        <ItemCount count={itemCount} />
        {users.length > 0 && (
          <div className="mt-auto">
            <UserAvatars users={users} />
          </div>
        )}
      </div>
      <div className="flex flex-col-reverse justify-between items-center gap-4 pt-0.75 pb-0.5">
        {dropdownMenu}
        {isPinned && (
          <Pin
            className="size-4 text-muted-foreground rotate-45"
            aria-label="Pinned"
          />
        )}
      </div>
    </div>
  );
}

/**
 * FolderDocumentCard - The main component
 *
 * Displays folders or documents in various layouts with consistent styling
 */
function FolderDocumentCard(props: FolderDocumentCardProps) {
  const {
    id,
    variant = "large",
    type,
    title,
    itemCount,
    users = [],
    isPinned = false,
    previewUrl,
    fileExtension = "pdf",
    className = "",
    alternateBg = false,
    onOpen,
    color = "default", // Default color
  } = props;

  const { isSelected, handleItemClick } = useSelectionStore();
  const selected = isSelected(id);

  const handleAction = (action: string) => {
    if (action === "open" && onOpen) {
      onOpen();
      return;
    }
    console.log(`Action: ${action} on ${type} "${title}" (ID: ${id})`);
  };

  // Selection styling

  // Common classes for all variants
  const containerClass = cn(
    `
    relative group 
    hover:bg-sidebar-foreground/3 
    border hover:border-muted-foreground/15 
    hover:shadow-xs p-2.5 
    rounded-md
    transition-colors ease-out duration-300
    focus:outline-none focus:ring-2 focus:ring-primary/20`,
    selected ? "border-primary/80 hover:border-primary/80" : "hover:border-muted-foreground/15 ",
    className
  );
  // Variant-specific layout classes
const cardStyles = {
  large: "flex flex-col gap-3.5 bg-sidebar border-muted",
  compact: "flex gap-4 bg-sidebar border-muted",
  list: `flex gap-4 ${
    alternateBg
      ? `bg-background ${selected ? "border-primary/80" : "border-background"}`
      : `bg-sidebar ${selected ? "border-primary/80" : "border-muted"}`
  }`,
};


  // Handle outside clicks (to clear selection)
  useEffect(() => {
    // Only add listener when there's at least one selected item
    if (useSelectionStore.getState().selectedIds.size === 0) return;
    
    const handleOutsideClick = (e: MouseEvent) => {
      // Use a more efficient selector
      if (!(e.target as Element).closest('[data-folder-card]')) {
        useSelectionStore.getState().clear();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [useSelectionStore(state => state.selectedIds.size > 0)]);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          data-folder-card
          className={`${containerClass} ${cardStyles[variant]}`}
          onClick={(e) => handleItemClick(id, e, onOpen)}
          onDoubleClick={(e) => e.preventDefault()}
          role="button"
          tabIndex={0}
          aria-selected={selected}
          onKeyDown={(e) => {
            // Handle keyboard navigation
            if (e.key === "Enter" && onOpen) onOpen();
            if (e.key === " ") {
              e.preventDefault();
              useSelectionStore.getState().toggle(id);
            }
          }}
        >
          {/* Hover indicator shows when card is hovered */}
          <HoverIndicator variant={variant} selected={selected} />

          {/* Icon section - folder, document or preview */}
          <FileOrFolderIcon
            type={type}
            previewUrl={previewUrl}
            fileExtension={fileExtension}
            title={title}
            variant={variant}
            color={color}
          />

          {/* Content section with title, metadata and actions */}
          <CardContent
            title={title}
            itemCount={itemCount}
            users={users}
            isPinned={isPinned}
            variant={variant}
            type={type}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItems type={type} title={title} onAction={handleAction} />
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default FolderDocumentCard;
