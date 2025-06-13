import {
  useFolderContents,
  useRootContents,
  useTrashContents,
} from "@/api/folder/folder.query";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFileSystemStore } from "@/stores/useFileSystemStore";
import { FolderItem } from "@/types/folderDocumnet";
import { useDndMonitor, useDroppable } from "@dnd-kit/core";
import { Link, useMatches } from "@tanstack/react-router";
import {
  Clock,
  Folder,
  FolderOpen,
  Home,
  Search,
  Settings2,
  Trash2,
  UserRound,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

// Droppable component for dropdown menu items
function DroppableDropdownItem({
  id,
  name,
  icon: Icon,
  linkPath,
  isReadOnlyContext,
}: {
  id: string | null;
  name: string;
  icon: React.ElementType;
  linkPath: string;
  isReadOnlyContext: boolean;
}) {
  const items = useFileSystemStore((state) => state.items);
  const addItem = useFileSystemStore((state) => state.addItem);

  // Create a folder item for the dropdown item
  const existingItem = items[id || "root"];
  const folderItem: FolderItem = useMemo(() => {
    if (existingItem?.cardType === "folder") {
      return existingItem;
    }
    return {
      id: id || "root",
      type: "folder",
      cardType: "folder",
      name: name,
      owner: "user-1",
      color: "default",
      parent: null,
      items: 0,
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
  }, [existingItem, id, name]);

  // Add to store if doesn't exist
  useEffect(() => {
    if (!existingItem && folderItem) {
      addItem(folderItem);
    }
  }, [existingItem, addItem, folderItem]);
  const { setNodeRef, isOver, active } = useDroppable({
    id: `breadcrumb-dropdown-${id || "root"}`,
    data: {
      type: "folder",
      cardType: "folder",
      id: folderItem.id,
      name: folderItem.name,
      item: folderItem,
    },
    disabled: isReadOnlyContext,
  });

  const showDropIndicator = isOver && active;

  return (
    <div
      ref={setNodeRef}
      data-breadcrumb="true"
      data-breadcrumb-dropdown="true"
      className={`relative w-full ${showDropIndicator ? "after:absolute after:inset-0 after:bg-primary/10 after:border-2 after:border-primary after:border-dashed after:rounded-md after:z-10" : ""}`}
    >
      <Link
        to={linkPath}
        className="flex items-center gap-2 px-2 py-1 w-full rounded-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-muted-foreground text-sm"
      >
        <Icon className="size-4" />
        {name}
      </Link>
    </div>
  );
}

// Separate component for droppable breadcrumb items
function DroppableBreadcrumbItem({
  id,
  name,
  isLast,
  icon: Icon,
  linkPath,
  isReadOnlyContext,
}: {
  id: string | null;
  name: string;
  isLast: boolean;
  icon: React.ElementType;
  linkPath: string;
  isReadOnlyContext: boolean;
}) {
  const items = useFileSystemStore((state) => state.items);
  const addItem = useFileSystemStore((state) => state.addItem);

  // Create a folder item for the breadcrumb
  const existingItem = items[id || "root"];
  const folderItem: FolderItem = useMemo(() => {
    if (existingItem?.cardType === "folder") {
      return existingItem;
    }
    return {
      id: id || "root",
      type: "folder",
      cardType: "folder",
      name: name,
      owner: "user-1",
      color: "default",
      parent: null,
      items: 0,
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
  }, [existingItem, id, name]);

  // Add to store if doesn't exist using useEffect
  useEffect(() => {
    if (!existingItem && folderItem) {
      addItem(folderItem);
    }
  }, [existingItem, addItem, folderItem]);

  const { setNodeRef, isOver, active } = useDroppable({
    id: id || "root",
    data: {
      type: "folder",
      cardType: "folder",
      id: folderItem.id,
      name: folderItem.name,
      item: folderItem,
    },
    disabled: isReadOnlyContext || isLast,
  });

  const showDropIndicator = !isLast && isOver && active;

  return (
    <div
      ref={setNodeRef}
      className={`relative px-2 py-1 ${showDropIndicator ? "after:absolute after:inset-0 after:bg-primary/10 after:border-2 after:border-primary after:border-dashed after:rounded-md after:z-10" : ""}`}
    >
      {isLast ? (
        <BreadcrumbPage className="flex-grow flex items-center gap-2">
          <Icon className="size-4" />
          <span className="max-w-[60px] sm:max-w-[200px] truncate">{name}</span>
        </BreadcrumbPage>
      ) : (
        <BreadcrumbLink asChild>
          <Link to={linkPath} className="flex items-center gap-2">
            <Icon className="size-4" />
            <span className="max-w-[60px] sm:max-w-[200px] truncate">
              {name}
            </span>
          </Link>
        </BreadcrumbLink>
      )}
    </div>
  );
}

export function NavBreadcrumb() {
  const matches = useMatches();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Monitor drag events to manage dropdown behavior
  useDndMonitor({
    onDragStart() {
      // Keep dropdown closed at start
    },
    onDragOver(event) {
      const { over } = event;

      // Auto-open dropdown when dragging over trigger
      if (over?.id === "breadcrumb-dropdown-trigger" && !dropdownOpen) {
        setDropdownOpen(true);
      }

      // Keep dropdown open when over content or dropdown items
      if (
        over?.id === "breadcrumb-dropdown-content" ||
        String(over?.id).startsWith("breadcrumb-dropdown-")
      ) {
        setDropdownOpen(true);
      }

      // Close dropdown when dragging over other areas (with delay to prevent flickering)
      if (
        over &&
        over.id !== "breadcrumb-dropdown-trigger" &&
        over.id !== "breadcrumb-dropdown-content" &&
        !String(over.id).startsWith("breadcrumb-dropdown-") &&
        dropdownOpen
      ) {
        setTimeout(() => {
          setDropdownOpen(false);
        }, 150);
      }
    },
    onDragEnd() {
      // Close dropdown when drag ends
      setTimeout(() => {
        setDropdownOpen(false);
      }, 200);
    },
  });

  const folderMatch = matches.find((match) =>
    match.routeId.includes("/(user)/folder/")
  );
  const trashMatch = matches.find((match) =>
    match.routeId.includes("/(user)/trash")
  );
  const recentMatch = matches.find((match) =>
    match.routeId.includes("/(user)/recent")
  );
  const searchMatch = matches.find((match) =>
    match.routeId.includes("/(user)/search")
  );
  const settingsMatch = matches.find((match) =>
    match.routeId.includes("/(user)/setting")
  );

  const folderId = folderMatch?.params
    ? (folderMatch.params as { id: string }).id
    : "";

  // Query data
  const { data: rootData } = useRootContents();
  const { data: folderData } = useFolderContents(folderId);
  const { data: trashData } = useTrashContents();

  // Initial values
  let pathSegments: { id: string | null; name: string }[] = [];
  let icon = Home;
  let rootName = "My Drive";
  let rootPath = "/";

  // Determine current view
  if (settingsMatch) {
    // Handle settings routes
    const routeId = settingsMatch.routeId;
    pathSegments = [{ id: null, name: "Settings" }];

    if (routeId.includes("/setting/profile")) {
      pathSegments.push({ id: "profile", name: "Profile" });
    }
    // Add more settings sub-routes here as needed

    icon = Settings2;
    rootName = "Settings";
    rootPath = "/setting/profile"; // Default settings path
  } else if (recentMatch) {
    pathSegments = [];
    icon = Clock;
    rootName = "Recent";
    rootPath = "/recent";
  } else if (searchMatch) {
    pathSegments = [];
    icon = Search;
    rootName = "Search";
    rootPath = "/search";
  } else if (trashMatch && !folderMatch) {
    pathSegments = trashData?.data?.folderContents?.pathSegments || [
      { id: null, name: "Trash" },
    ];
    icon = Trash2;
    rootName = "Trash";
    rootPath = "/trash";
  } else if (folderMatch) {
    pathSegments = folderData?.data?.folderContents?.pathSegments || [];

    const base = pathSegments[0]?.name;
    if (base === "Trash") {
      icon = Trash2;
      rootName = "Trash";
      rootPath = "/trash";
    } else {
      icon = Home;
      rootName = "My Drive";
      rootPath = "/";
    }
  } else {
    pathSegments = rootData?.data?.folderContents?.pathSegments || [];
  }

  const isInTrashContext =
    Boolean(trashMatch) || pathSegments[0]?.name === "Trash";
  const isInRecentContext = Boolean(recentMatch);
  const isInSearchContext = Boolean(searchMatch);
  const isInSettingsContext = Boolean(settingsMatch);
  const isReadOnlyContext =
    isInTrashContext || isInRecentContext || isInSearchContext || isInSettingsContext;

  // Create array of all breadcrumb items for dropdown logic
  const allItems = [
    {
      id: null,
      name: rootName,
      isRoot: true,
      icon: icon,
      linkPath: rootPath,
    },
    ...pathSegments.slice(1).map((segment, index) => {
      const base = pathSegments[0]?.name;
      let linkPath = "";
      let itemIcon = Folder;

      if (base === "Trash") {
        linkPath = `/folder/${segment.id}`;
        itemIcon = index === pathSegments.length - 2 ? FolderOpen : Folder;
      } else if (base === "Settings") {
        // Handle settings sub-routes
        if (segment.name === "Profile") {
          linkPath = `/setting/profile`;
          itemIcon = UserRound;
        }
        // Add more settings sub-routes here as needed
      } else {
        linkPath = `/folder/${segment.id}`;
        itemIcon = index === pathSegments.length - 2 ? FolderOpen : Folder;
      }

      return {
        id: segment.id,
        name: segment.name,
        isRoot: false,
        icon: itemIcon,
        linkPath,
      };
    }),
  ];

  // Show last 2 items directly, rest in dropdown
  const ITEMS_TO_DISPLAY = 2;
  const visibleItems = allItems.slice(-ITEMS_TO_DISPLAY);
  const dropdownItems = allItems.slice(0, -ITEMS_TO_DISPLAY);
  const hasDropdownItems = dropdownItems.length > 0;

  // Droppable component for the dropdown trigger
  const DroppableDropdownTrigger = () => {
    const { setNodeRef } = useDroppable({
      id: "breadcrumb-dropdown-trigger",
      data: {
        type: "dropdown-trigger",
        action: "open-dropdown",
      },
      disabled: isReadOnlyContext,
    });

    return (
      <DropdownMenuTrigger
        ref={setNodeRef}
        className="flex items-center gap-1 px-2"
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        <BreadcrumbEllipsis className="size-4" />
      </DropdownMenuTrigger>
    );
  };

  // Droppable component for the dropdown content area
  const DroppableDropdownContent = ({
    children,
  }: {
    children: React.ReactNode;
  }) => {
    const { setNodeRef } = useDroppable({
      id: "breadcrumb-dropdown-content",
      data: {
        type: "dropdown-content",
        action: "keep-open",
      },
      disabled: isReadOnlyContext,
    });

    return (
      <DropdownMenuContent ref={setNodeRef} align="start">
        {children}
      </DropdownMenuContent>
    );
  };

  return (
    <Breadcrumb
      className="flex flex-grow shrink-0 bg-secondary h-9 px-2 py-0.5 rounded-md"
      data-breadcrumb="true"
    >
      <BreadcrumbList className="gap-0 sm:gap-0">
        {/* Show dropdown for hidden items */}
        {hasDropdownItems && (
          <>
            <BreadcrumbItem>
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DroppableDropdownTrigger />
                <DroppableDropdownContent>
                  {dropdownItems.map((item, index) => (
                    <DroppableDropdownItem
                      key={item.id || index}
                      id={item.id}
                      name={item.name}
                      icon={item.icon}
                      linkPath={item.linkPath}
                      isReadOnlyContext={isReadOnlyContext}
                    />
                  ))}
                </DroppableDropdownContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}

        {/* Show visible items */}
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1;

          return (
            <React.Fragment key={item.id || `visible-${index}`}>
              <BreadcrumbItem>
                <DroppableBreadcrumbItem
                  id={item.id}
                  name={item.name}
                  isLast={isLast}
                  icon={item.icon}
                  linkPath={item.linkPath}
                  isReadOnlyContext={isReadOnlyContext}
                />
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
