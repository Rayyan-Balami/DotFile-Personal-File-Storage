/**
 * FolderDocumentCard Component - Extreme performance optimization
 * Designed for infinite scroll with thousands of items
 */

import { useFilePreview } from "@/hooks/useFilePreview";
import { cn } from "@/lib/utils";
import { useSelectionStore } from "@/stores/useSelectionStore";
import {
  DocumentItem,
  FileSystemItem,
  FolderItem,
} from "@/types/folderDocumnet";
import {
  formatChildCount,
  formatFileSize,
  formatDate,
} from "@/utils/formatUtils";
import { EllipsisVertical, Loader2, Pin } from "lucide-react";
import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { defaultStyles, FileIcon } from "react-file-icon";
import { Button } from "../ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { FolderIcon } from "../ui/folder-icon";
import { ColorOption } from "@/config/colors";
import { useIsMobile } from "@/hooks/use-mobile";

// Types remain the same
export type CardVariant = "large" | "compact" | "list";
type CardType = "folder" | "document";

// Update the FolderDocumentCardProps interface to match our types
interface FolderDocumentCardProps {
  item: FileSystemItem;
  variant?: CardVariant;
  className?: string;
  alternateBg?: boolean;
  onOpen?: () => void;
}

// Pre-computed style maps
const VARIANT_STYLES = {
  large: {
    container: "flex flex-col gap-3.5",
    indicator: {
      position: "top-[0px] left-1/2 -translate-x-1/2 rounded-b-full",
      selected: "h-[3.5px] w-[12%]",
      hover: "h-0 group-hover:h-[3.5px] w-0 group-hover:w-[12%]",
    },
    icon: "aspect-[3/2] min-h-14",
    iconScale: "*:scale-45",
    docIconScale: "*:scale-25",
  },
  compact: {
    container: "flex gap-4",
    indicator: {
      position: "left-[0px] top-1/2 -translate-y-1/2 rounded-r-full",
      selected: "w-[3.5px] h-[28%]",
      hover: "w-0 group-hover:w-[3.5px] h-0 group-hover:h-[28%]",
    },
    icon: "aspect-[4/3] h-19.5",
    iconScale: "*:scale-65",
    docIconScale: "*:scale-35",
  },
  list: {
    container: "flex gap-4",
    indicator: {
      position: "left-[0px] top-1/2 -translate-y-1/2 rounded-r-full",
      selected: "w-[3.5px] h-[38%]",
      hover: "w-0 group-hover:w-[3.5px] h-0 group-hover:h-[38%]",
    },
    icon: "aspect-[1/1] h-15.5 lg:h-12.5",
    iconScale: "*:scale-55",
    docIconScale: "*:scale-55",
  },
};

// Precomputed icon style cache
const FILE_ICON_STYLES = new Map();

// Optimized HoverIndicator with static styles
const HoverIndicator = React.memo(
  ({ variant, selected }: { variant: CardVariant; selected: boolean }) => {
    const styles = VARIANT_STYLES[variant];

    return (
      <div
        className={cn(
          "absolute z-10 transition-all",
          selected
            ? "opacity-100 bg-primary"
            : "opacity-0 group-hover:opacity-100 group-hover:bg-primary/80",
          styles.indicator.position,
          selected ? styles.indicator.selected : styles.indicator.hover
        )}
        aria-hidden="true"
      />
    );
  },
  (prevProps, nextProps) =>
    prevProps.variant === nextProps.variant &&
    prevProps.selected === nextProps.selected
);
HoverIndicator.displayName = "HoverIndicator";

// Optimized file icon caching
const getIconStyles = (fileExtension: string) => {
  if (FILE_ICON_STYLES.has(fileExtension)) {
    return FILE_ICON_STYLES.get(fileExtension);
  }

  const baseStyles =
    defaultStyles[fileExtension as keyof typeof defaultStyles] || {};
  const styles = {
    labelColor: baseStyles.labelColor || "#52525b",
    glyphColor: baseStyles.glyphColor || baseStyles.labelColor || "#52525b",
    color: baseStyles.color || "#e7e5e4",
    labelUppercase: true,
    ...baseStyles,
  };

  FILE_ICON_STYLES.set(fileExtension, styles);
  return styles;
};

const FileOrFolderIcon = React.memo(
  ({
    cardType,
    fileId,
    fileType,
    fileExtension = "pdf",
    title,
    variant,
    color,
  }: {
    cardType: CardType;
    variant: CardVariant;
    fileId?: string;
    fileType?: string;
    fileExtension?: string;
    title: string;
    color?: string;
  }) => {
    const styles = VARIANT_STYLES[variant];
    const memoKey = `${cardType}-${variant}`;
    const scaleClass = useMemo(() => {
      if (cardType === "folder") return styles.iconScale;
      if (cardType === "document" && fileType && !fileType.startsWith("image/"))
        return styles.docIconScale;
      return "";
    }, [memoKey]);
    const iconStyles =
      cardType === "document" ? getIconStyles(fileExtension) : null;

    // Use file preview hook for images only
    let preview: React.ReactNode = null;
    if (
      cardType === "document" &&
      fileId &&
      fileType &&
      typeof fileType === "string" &&
      fileType.startsWith("image/")
    ) {
      preview = useFilePreview({ fileId, mimeType: fileType });
    }

    return (
      <div
        className={cn(
          "bg-sidebar shrink-0 relative flex items-center justify-center overflow-hidden rounded-[0.5rem] content-visibility-auto contain-intrinsic-size",
          styles.icon,
          scaleClass
        )}
      >
        {cardType === "folder" && (
          <FolderIcon className="size-full" color={color as ColorOption} />
        )}
        {cardType === "document" && preview}
        {cardType === "document" && !preview && iconStyles && (
          <FileIcon extension={fileExtension} {...iconStyles} />
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.cardType === nextProps.cardType &&
      prevProps.variant === nextProps.variant &&
      prevProps.fileId === nextProps.fileId &&
      prevProps.fileExtension === nextProps.fileExtension
    );
  }
);
FileOrFolderIcon.displayName = "FileOrFolderIcon";

const ItemCount = React.memo(
  ({
    cardType,
    childCount,
    byteCount,
  }: {
    cardType: CardType;
    childCount?: number;
    byteCount?: number;
  }) => {
    if (cardType === "folder") {
      if (childCount === undefined) return null;
      return (
        <span className="text-xs text-muted-foreground capitalize whitespace-nowrap">
          {formatChildCount(childCount)}
        </span>
      );
    } else {
      if (byteCount === undefined) return null;
      return (
        <span className="text-xs text-muted-foreground capitalize whitespace-nowrap">
          {formatFileSize(byteCount)}
        </span>
      );
    }
  }
);
ItemCount.displayName = "ItemCount";

// Lazy-loaded menu content components with better defaults
const LazyContextMenuItems = lazy(() =>
  import("@/components/menuItems/FolderDocumentMenuItems").then((module) => ({
    default: module.default || module.ContextMenuItems,
  }))
);

const LazyDropdownMenuItems = lazy(() =>
  import("@/components/menuItems/FolderDocumentMenuItems").then((module) => ({
    default: module.DropdownMenuItems,
  }))
);

// The CardContent component with optimized menu rendering
/**
 * CardContent renders the content of a folder/document card
 * Note: The title variable is intentionally used in JSX and in the memo comparison function
 */
const CardContent = React.memo(
  ({
    id,
    title,
    cardType,
    childCount,
    byteCount,
    isPinned = false,
    variant,
    extension,
    deletedAt,
    createdAt,
    hasDeletedAncestor,
  }: {
    id: string;
    title: string;
    cardType: CardType;
    childCount?: number;
    byteCount?: number;
    isPinned: boolean;
    variant: CardVariant;
    extension?: string;
    dateModified?: string;
    deletedAt?: Date | null;
    createdAt?: string | Date;
    hasDeletedAncestor?: boolean;
  }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const isMobile = useIsMobile();

    // Only render dropdown content when menu is open
    const dropdownMenu = (
      <DropdownMenu onOpenChange={setMenuOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={"ghost"}
            className="size-4.75 hover:bg-muted-foreground/10 cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label="More options"
          >
            <EllipsisVertical className="size-3.75" />
          </Button>
        </DropdownMenuTrigger>
        {menuOpen && (
          <DropdownMenuContent align="end" className="w-48">
            <Suspense
              fallback={
                <DropdownMenuItem disabled>
                  <Loader2 className="animate-spin mx-auto" />
                </DropdownMenuItem>
              }
            >
              <LazyDropdownMenuItems
                cardType={cardType}
                title={title}
                id={id}
                isPinned={isPinned}
                deletedAt={
                  deletedAt instanceof Date
                    ? deletedAt.toISOString()
                    : deletedAt
                }
                hasDeletedAncestor={hasDeletedAncestor}
              />
            </Suspense>
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    );

    if (variant === "list") {
      return (
        <div className="px-1 flex-1 flex gap-6">
          <div className="flex-1 flex max-lg:flex-col lg:items-center">
            <h3 className="text-sm font-[425] line-clamp-1 break-all mb-1.5 lg:max-w-sm w-full">
              {cardType === "document" && extension
                ? `${title}.${extension}`
                : title}
            </h3>
            <div className="flex-1 flex items-center max-sm:gap-4 *:flex-1">
              <ItemCount
                cardType={cardType}
                childCount={childCount}
                byteCount={byteCount}
              />
              <span className="text-xs text-muted-foreground text-left whitespace-nowrap">
                {formatDate(createdAt, isMobile ? false : true)}
              </span>
            </div>
          </div>
          <div className="flex flex-col-reverse lg:flex-row-reverse justify-between items-center gap-4 max-lg:mb-1.5 max-lg:mt-0.75">
            {dropdownMenu}
            {isPinned ? (
              <Pin
                className="size-3.75 rotate-20 text-primary"
                aria-hidden={!isPinned}
              />
            ) : (
              // Placeholder for empty space for alignment
              <div className="size-3.75" />
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="px-1 flex-1 flex gap-6 mb-0.5">
        <div className="flex-1 flex flex-col">
          <h3 className="text-sm font-[425] line-clamp-1 break-all mb-1.5">
            {cardType === "document" && extension
              ? `${title}.${extension}`
              : title}
          </h3>
          <ItemCount
            cardType={cardType}
            childCount={childCount}
            byteCount={byteCount}
          />
          <span className="text-xs font-light text-muted-foreground pt-3 mt-auto">
            {formatDate(createdAt, isMobile ? false : true)}
          </span>
        </div>
        <div className="flex flex-col-reverse justify-between items-center mt-0.75">
          {dropdownMenu}
          {isPinned && (
            <Pin
              className="size-3.75 text-primary rotate-20"
              aria-label="Pinned"
            />
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.title === nextProps.title &&
      prevProps.childCount === nextProps.childCount &&
      prevProps.byteCount === nextProps.byteCount &&
      prevProps.isPinned === nextProps.isPinned &&
      prevProps.variant === nextProps.variant &&
      prevProps.cardType === nextProps.cardType &&
      prevProps.extension === nextProps.extension &&
      prevProps.deletedAt === nextProps.deletedAt &&
      prevProps.createdAt === nextProps.createdAt &&
      prevProps.hasDeletedAncestor === nextProps.hasDeletedAncestor
    );
  }
);
CardContent.displayName = "CardContent";

// Main optimized component with DOM recycling
const FolderDocumentCard = React.memo(
  (props: FolderDocumentCardProps) => {
    const {
      item,
      variant = "large",
      className = "",
      alternateBg = false,
      onOpen,
    } = props;

    // Extract properties from item based on type
    const {
      id,
      type,
      cardType,
      name,
      isPinned,
      updatedAt,
      deletedAt,
      createdAt,
    } = item;

    // Extract type-specific properties
    let items: number | undefined;
    let color: string | undefined;
    let size: number | undefined;
    let extension: string | undefined;
    let fileId: string | undefined;

    if (item.cardType === "folder") {
      const folderItem = item as FolderItem;
      items = folderItem.items;
      color = folderItem.color;
    } else {
      const documentItem = item as DocumentItem;
      size = documentItem.size;
      extension = documentItem.extension;
      fileId = documentItem.id;
    }

    // Direct state access with optimized selector
    const isSelected = useSelectionStore(
      useCallback((state) => state.isSelected(id), [id])
    );

    const handleItemClick = useSelectionStore((state) => state.handleItemClick);

    // Create stable references to handlers
    const actionHandlerRef = useRef<(action: string) => void>(() => {});
    actionHandlerRef.current = useCallback(
      (action: string) => {
        if (action === "open" && onOpen) {
          onOpen();
          return;
        }
      },
      [id, onOpen, name, type]
    );

    // Optimize container class calculation
    const containerClass = useMemo(
      () =>
        cn(
          "relative group transition-colors ease-out duration-100 focus:outline-none focus:ring-1 focus:ring-primary/40 select-none",
          "hover:bg-sidebar-foreground/4 border hover:shadow-xs p-2.5 rounded-md",
          isSelected
            ? "border-primary hover:border-primary"
            : "hover:border-muted-foreground/15",
          "contain-intrinsic-size",
          className
        ),
      [isSelected, className]
    );

    // Optimize card style calculation
    const cardStyle = useMemo(() => {
      const base = VARIANT_STYLES[variant].container;
      if (variant !== "list") return `${base} bg-sidebar border-muted`;

      return `${base} ${
        alternateBg
          ? `bg-background ${
              isSelected ? "border-primary/80" : "border-background"
            }`
          : `bg-sidebar ${isSelected ? "border-primary/80" : "border-muted"}`
      }`;
    }, [variant, alternateBg, isSelected]);

    // Optimize event handlers
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        const isDeleting = useSelectionStore.getState().isDeleting;
        if (isDeleting) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        // Only handle navigation keys
        if (e.key === "Enter" && onOpen) {
          e.preventDefault();
          onOpen();
        }
        if (e.key === " ") {
          e.preventDefault();
          handleItemClick(id, e as any, onOpen);
        }
      },
      [id, onOpen, handleItemClick]
    );

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        const isDeleting = useSelectionStore.getState().isDeleting;
        if (isDeleting) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        handleItemClick(id, e, onOpen);
      },
      [id, onOpen, handleItemClick]
    );

    // Use global click handler only once
    useEffect(() => {
      if (!window.__cardSelectionHandler) {
        window.__cardSelectionHandler = (e: MouseEvent) => {
          const target = e.target as Element;
          // Don't clear selection if clicking on UI controls
          if (target.closest('button') || target.closest('[role="button"]')) {
            return;
          }
          if (!target.closest("[data-folder-card]")) {
            useSelectionStore.getState().clear();
          }
        };
        document.addEventListener("mousedown", window.__cardSelectionHandler, {
          passive: true,
        });
      }
    }, []);

    return (
      <ContextMenu modal={false}>
        <ContextMenuTrigger>
          <div
            data-folder-card
            className={`${containerClass} ${cardStyle} active:scale-[0.98] active:bg-sidebar-foreground/8 transition-transform duration-100 ease-out`}
            onClick={handleClick}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onOpen) {
                onOpen();
              }
            }}
            role="button"
            tabIndex={0}
            aria-selected={isSelected}
            onKeyDown={handleKeyDown}
          >
            <HoverIndicator variant={variant} selected={isSelected} />
            <FileOrFolderIcon
              cardType={cardType}
              fileId={fileId}
              fileType={type}
              fileExtension={extension || ""}
              title={name}
              variant={variant}
              color={color}
            />
            <CardContent
              id={id}
              title={name}
              cardType={cardType}
              childCount={items}
              byteCount={size}
              isPinned={isPinned}
              variant={variant}
              extension={extension}
              dateModified={
                updatedAt instanceof Date
                  ? updatedAt.toISOString()
                  : String(updatedAt)
              }
              deletedAt={deletedAt}
              createdAt={
                createdAt instanceof Date
                  ? createdAt.toISOString()
                  : String(createdAt)
              }
              hasDeletedAncestor={item.hasDeletedAncestor ?? false}
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <Suspense
            fallback={
              <ContextMenuItem disabled>
                <Loader2 className="animate-spin mx-auto" />
              </ContextMenuItem>
            }
          >
            <LazyContextMenuItems
              cardType={cardType}
              title={name}
              id={id}
              isPinned={isPinned}
              deletedAt={
                deletedAt instanceof Date ? deletedAt.toISOString() : deletedAt
              }
              hasDeletedAncestor={item.hasDeletedAncestor ?? false}
            />
          </Suspense>
        </ContextMenuContent>
      </ContextMenu>
    );
  },
  (prevProps, nextProps) => {
    // Deep comparison for critical props
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.variant === nextProps.variant &&
      prevProps.item.type === nextProps.item.type &&
      prevProps.item.name === nextProps.item.name &&
      prevProps.item.isPinned === nextProps.item.isPinned &&
      prevProps.item.updatedAt === nextProps.item.updatedAt &&
      prevProps.item.deletedAt === nextProps.item.deletedAt &&
      prevProps.className === nextProps.className &&
      prevProps.alternateBg === nextProps.alternateBg &&
      prevProps.onOpen === nextProps.onOpen
    );
  }
);
FolderDocumentCard.displayName = "FolderDocumentCard";

// Add type definition for the global handler
declare global {
  interface Window {
    __cardSelectionHandler?: (e: MouseEvent) => void;
  }
}

export default FolderDocumentCard;
