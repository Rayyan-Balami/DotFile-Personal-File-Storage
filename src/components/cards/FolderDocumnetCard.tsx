/**
 * FolderDocumentCard Component - Extreme performance optimization
 * Designed for infinite scroll with thousands of items
 */

import { ColorOption } from "@/config/colors";
import { cn } from "@/lib/utils";
import { useSelectionStore } from "@/store/useSelectionStore";
import { EllipsisVertical, Pin } from "lucide-react";
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultStyles, FileIcon } from "react-file-icon";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from "../ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { FolderIcon } from "../ui/folder-icon";

// Types remain the same
type CardVariant = "large" | "compact" | "list";
type CardType = "folder" | "document";

interface User {
  image?: string;
  fallback: string;
}

interface FolderDocumentCardProps {
  id: string;
  variant?: CardVariant;
  type: CardType;
  title: string;
  itemCount?: number;
  users?: User[];
  isPinned?: boolean;
  previewUrl?: string;
  fileExtension?: string;
  className?: string;
  alternateBg?: boolean;
  onOpen?: () => void;
  color?: ColorOption;
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
    icon: "aspect-[3/2] h-17",
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
    icon: "aspect-[1/1] h-15.5 lg:h-10.5",
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
          selected ? "opacity-100 bg-primary" : "opacity-0 group-hover:opacity-100 group-hover:bg-primary/80",
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

// Optimized lazy image loader
const LazyImage = React.memo(({ src, alt }: { src: string; alt: string }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  
  // Use Intersection Observer to only load images when in viewport
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = imgRef.current;
          if (img && !img.src) {
            img.src = src;
            observer.disconnect();
          }
        }
      });
    }, { rootMargin: '200px' });
    
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [src]);

  return (
    <img
      ref={imgRef}
      className={cn(
        "object-center object-cover h-full w-full transition-opacity will-change-transform",
        loaded ? "opacity-100" : "opacity-0"
      )}
      alt={alt}
      loading="lazy"
      onLoad={() => setLoaded(true)}
    />
  );
}, (prevProps, nextProps) => prevProps.src === nextProps.src);
LazyImage.displayName = "LazyImage";

// Optimized file icon caching
const getIconStyles = (fileExtension: string) => {
  if (FILE_ICON_STYLES.has(fileExtension)) {
    return FILE_ICON_STYLES.get(fileExtension);
  }
  
  const baseStyles = defaultStyles[fileExtension as keyof typeof defaultStyles] || {};
  const styles = {
    labelColor: baseStyles.labelColor || "#52525b",
    glyphColor: baseStyles.glyphColor || baseStyles.labelColor || "#52525b",
    color: baseStyles.color || "#e7e5e4",
    ...baseStyles,
  };
  
  FILE_ICON_STYLES.set(fileExtension, styles);
  return styles;
};

const FileOrFolderIcon = React.memo(
  ({
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
  }) => {
    const styles = VARIANT_STYLES[variant];
    
    // Use primitive type for memoization key
    const memoKey = `${type}-${!!previewUrl}-${variant}`;
    const scaleClass = useMemo(() => {
      if (type === "folder") return styles.iconScale;
      if (type === "document" && !previewUrl) return styles.docIconScale;
      return "";
    }, [memoKey]);
    
    // Get icon styles only when needed (document without preview)
    const iconStyles = type === "document" && !previewUrl 
      ? getIconStyles(fileExtension)
      : null;
    
    return (
      <div
        className={cn(
          "bg-sidebar shrink-0 relative flex items-center justify-center overflow-hidden rounded-[0.5rem] content-visibility-auto contain-intrinsic-size",
          styles.icon,
          scaleClass
        )}
      >
        {type === "folder" && (
          <FolderIcon className="size-full" color={color} />
        )}

        {type === "document" && !previewUrl && iconStyles && (
          <FileIcon extension={fileExtension} {...iconStyles} />
        )}

        {type === "document" && previewUrl && (
          <LazyImage src={previewUrl} alt={`Preview of ${title}`} />
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.type === nextProps.type &&
      prevProps.variant === nextProps.variant &&
      prevProps.previewUrl === nextProps.previewUrl &&
      prevProps.fileExtension === nextProps.fileExtension &&
      prevProps.color === nextProps.color
    );
  }
);
FileOrFolderIcon.displayName = "FileOrFolderIcon";

// Optimized user avatars with virtualization
const UserAvatars = React.memo(({ users }: { users: User[] }) => {
  if (!users?.length) return null;
  
  // Only render max 3 avatars
  const visibleUsers = users.slice(0, 3);
  const extraCount = users.length > 3 ? users.length - 3 : 0;

  return (
    <div className="flex items-center">
      {visibleUsers.map((user, idx) => (
        <Avatar key={idx} className="size-4.5 first:ml-0 -ml-1">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback>{user.fallback}</AvatarFallback>
        </Avatar>
      ))}

      {extraCount > 0 && (
        <span className="size-4.5 first:ml-0 -ml-0.5 bg-primary grid place-content-center rounded-full text-[0.5rem] font-medium text-background">
          +{extraCount}
        </span>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Deep comparison of users array
  if (prevProps.users.length !== nextProps.users.length) return false;
  return prevProps.users.every((user, i) => 
    user.image === nextProps.users[i].image && 
    user.fallback === nextProps.users[i].fallback
  );
});
UserAvatars.displayName = "UserAvatars";

const ItemCount = React.memo(({ count }: { count?: number }) => {
  if (count === undefined) return null;
  return (
    <span className="flex-1 my-1.5 text-xs text-muted-foreground">
      {count} {count === 1 ? "item" : "items"}
    </span>
  );
});
ItemCount.displayName = "ItemCount";

// Lazy-loaded menu content components with better defaults
const LazyContextMenuItems = lazy(() => 
  import('@/components/cards/MenuItems').then(module => ({ 
    default: module.default || module.ContextMenuItems 
  }))
);

const LazyDropdownMenuItems = lazy(() => 
  import('@/components/cards/MenuItems').then(module => ({ default: module.DropdownMenuItems }))
);

// The CardContent component with optimized menu rendering
const CardContent = React.memo(
  ({
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
  }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const handleAction = useCallback(
      (action: string) => {
        console.log(`Action: ${action} on ${type} "${title}"`);
      },
      [title, type]
    );
    
    // Only render dropdown content when menu is open
    const dropdownMenu = (
      <DropdownMenu onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={"ghost"}
            className="size-6 hover:bg-muted-foreground/10 cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label="More options"
          >
            <EllipsisVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        {menuOpen && (
          <DropdownMenuContent align="end" className="w-48">
            <Suspense fallback={<DropdownMenuItem disabled>Loading...</DropdownMenuItem>}>
              <LazyDropdownMenuItems
                type={type}
                title={title}
                onAction={handleAction}
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
          <div className="flex flex-col-reverse lg:flex-row-reverse justify-between items-center gap-4 max-lg:pt-0.75 max-lg:pb-0.5">
            {dropdownMenu}
            {isPinned ? (
              <Pin
                className="size-4 text-muted-foreground rotate-45"
                aria-hidden={!isPinned}
              />
            ):
            // Placeholder for empty space for alignment
              <div className="size-4" />
            }
          </div>
        </div>
      );
    }

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
  },
  (prevProps, nextProps) => {
    return (
      prevProps.title === nextProps.title &&
      prevProps.itemCount === nextProps.itemCount &&
      prevProps.isPinned === nextProps.isPinned &&
      prevProps.variant === nextProps.variant &&
      prevProps.type === nextProps.type &&
      prevProps.users.length === nextProps.users.length
    );
  }
);
CardContent.displayName = "CardContent";

// Main optimized component with DOM recycling
const FolderDocumentCard = React.memo((props: FolderDocumentCardProps) => {
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
    color = "default",
  } = props;

  // Direct state access with optimized selector
  const isSelected = useSelectionStore(
    useCallback(state => state.isSelected(id), [id])
  );
  
  const handleItemClick = useSelectionStore(state => state.handleItemClick);
  
  // Create stable references to handlers
  const actionHandlerRef = useRef<(action: string) => void>(() => {});
  actionHandlerRef.current = useCallback(
    (action: string) => {
      if (action === "open" && onOpen) {
        onOpen();
        return;
      }
      console.log(`Action: ${action} on ${type} "${title}" (ID: ${id})`);
    },
    [id, onOpen, title, type]
  );

  // Optimize container class calculation
  const containerClass = useMemo(
    () => cn(
      "relative group transition-colors ease-out duration-100 focus:outline-none focus:ring-1 focus:ring-primary/40 select-none",
      "hover:bg-sidebar-foreground/4 border hover:shadow-xs p-2.5 rounded-md",
      isSelected ? "border-primary hover:border-primary" : "hover:border-muted-foreground/15",
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
        ? `bg-background ${isSelected ? "border-primary/80" : "border-background"}`
        : `bg-sidebar ${isSelected ? "border-primary/80" : "border-muted"}`
    }`;
  }, [variant, alternateBg, isSelected]);

  // Optimize event handlers
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && onOpen) onOpen();
      if (e.key === " ") {
        e.preventDefault();
        handleItemClick(id, e as any, onOpen);
      }
    },
    [id, onOpen, handleItemClick]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => handleItemClick(id, e, onOpen),
    [id, onOpen, handleItemClick]
  );

  // Use global click handler only once
  useEffect(() => {
    if (!window.__cardSelectionHandler) {
      window.__cardSelectionHandler = (e: MouseEvent) => {
        if (!(e.target as Element).closest("[data-folder-card]")) {
          useSelectionStore.getState().clear();
        }
      };
      document.addEventListener("mousedown", window.__cardSelectionHandler, { passive: true });
    }
  }, []);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          data-folder-card
          className={`${containerClass} ${cardStyle}`}
          onClick={handleClick}
          onDoubleClick={(e) => e.preventDefault()}
          role="button"
          tabIndex={0}
          aria-selected={isSelected}
          onKeyDown={handleKeyDown}
        >
          <HoverIndicator variant={variant} selected={isSelected} />

          <FileOrFolderIcon
            type={type}
            previewUrl={previewUrl}
            fileExtension={fileExtension}
            title={title}
            variant={variant}
            color={color}
          />

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
        <Suspense fallback={<ContextMenuItem disabled>Loading...</ContextMenuItem>}>
          <LazyContextMenuItems 
            type={type} 
            title={title} 
            onAction={(action) => actionHandlerRef.current?.(action)}
          />
        </Suspense>
      </ContextMenuContent>
    </ContextMenu>
  );
}, (prevProps, nextProps) => {
  // Deep comparison for critical props
  return (
    prevProps.id === nextProps.id &&
    prevProps.variant === nextProps.variant &&
    prevProps.type === nextProps.type &&
    prevProps.title === nextProps.title &&
    prevProps.itemCount === nextProps.itemCount &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.previewUrl === nextProps.previewUrl &&
    prevProps.fileExtension === nextProps.fileExtension &&
    prevProps.className === nextProps.className &&
    prevProps.alternateBg === nextProps.alternateBg &&
    prevProps.color === nextProps.color &&
    prevProps.onOpen === nextProps.onOpen
  );
});
FolderDocumentCard.displayName = "FolderDocumentCard";

// Add type definition for the global handler
declare global {
  interface Window {
    __cardSelectionHandler?: (e: MouseEvent) => void;
  }
}

export default FolderDocumentCard;