import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Folder, FolderOpen, Home, Clock, Trash2, MoreHorizontal } from "lucide-react";
import { useRootContents, useFolderContents, useTrashContents } from "@/api/folder/folder.query";
import { useMatches, Link } from "@tanstack/react-router";
import React, { useEffect, useRef, useState } from "react";
import { useDroppable, useDndMonitor } from "@dnd-kit/core";
import { useFileSystemStore } from "@/stores/useFileSystemStore";
import { FolderItem } from "@/types/folderDocumnet";

type BreadcrumbSegment = {
  id: string | null;
  name: string;
  isRoot?: boolean;
};

// DroppableBreadcrumbItem Component
function DroppableBreadcrumbItem({
  id,
  name,
  isLast,
  icon: Icon,
  linkPath,
  allowDrop,
}: {
  id: string | null;
  name: string;
  isLast: boolean;
  icon: React.ElementType;
  linkPath: string;
  allowDrop: boolean;
}) {
  const items = useFileSystemStore((state) => state.items);
  const addItem = useFileSystemStore((state) => state.addItem);

  const existingItem = id ? items[id] : items["root"];
  const folderItem: FolderItem =
    (existingItem?.cardType === "folder" ? existingItem : null) || {
      id: id ?? "root",
      type: "folder",
      cardType: "folder",
      name,
      owner: "user-1",
      color: "blue",
      parent: null,
      items: 0,
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

  useEffect(() => {
    if (!existingItem) {
      addItem(folderItem);
    }
  }, [existingItem, addItem, folderItem]);

  const { setNodeRef, isOver, active } = useDroppable({
    id: folderItem.id,
    data: {
      type: "folder",
      cardType: "folder",
      id: folderItem.id,
      name: folderItem.name,
      item: folderItem,
    },
    disabled: !allowDrop || isLast,
  });

  const showDropIndicator = !isLast && isOver && active;

  return (
    <div
      ref={setNodeRef}
      data-breadcrumb-item="true"
      className={`relative px-2 py-1 ${showDropIndicator ? "after:absolute after:inset-0 after:bg-primary/10 after:border-2 after:border-primary after:border-dashed after:rounded-md after:z-10" : ""}`}
    >
      {isLast ? (
        <BreadcrumbPage className="flex items-center gap-2">
          <Icon className="size-4" />
          {name}
        </BreadcrumbPage>
      ) : (
        <BreadcrumbLink asChild>
          <Link 
            to={linkPath} 
            params={linkPath === "/folder/$id" ? { id: id || "" } : {}} 
            className="flex items-center gap-2"
          >
            <Icon className="size-4" />
            {name}
          </Link>
        </BreadcrumbLink>
      )}
    </div>
  );
}

// BreadcrumbNav Component
export function BreadcrumbNav() {
  const matches = useMatches();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const folderMatch = matches.find((match) => match.routeId.includes("/(user)/folder/"));
  const trashMatch = matches.find((match) => match.routeId.includes("/(user)/trash"));
  const recentMatch = matches.find((match) => match.routeId.includes("/(user)/recent"));

  const folderId = folderMatch?.params ? (folderMatch.params as { id: string }).id : "";

  const { data: rootData } = useRootContents();
  const { data: folderData } = useFolderContents(folderId);
  const { data: trashData } = useTrashContents();

  let pathSegments: { id: string | null; name: string }[] = [];
  let icon = Home;
  let rootName = "My Drive";
  let rootPath = "/";

  if (recentMatch) {
    pathSegments = [];
    icon = Clock;
    rootName = "Recent";
    rootPath = "/recent";
  } else if (trashMatch && !folderMatch) {
    pathSegments = trashData?.data?.folderContents?.pathSegments || [{ id: null, name: "Trash" }];
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

  const isInRecentContext = Boolean(recentMatch);
  const allowDrop = !isInRecentContext;

  const first = pathSegments[0];

  // If we only have one item (base is last), show it inline
  if (pathSegments.length === 1) {
    return (
      <Breadcrumb ref={containerRef} className="breadcrumb-nav flex flex-grow bg-secondary h-9 px-4 py-2 rounded-md overflow-hidden">
        <BreadcrumbList className="flex items-center space-x-1 whitespace-nowrap overflow-hidden text-ellipsis">
          <BreadcrumbItem className="breadcrumb-item" data-breadcrumb-item="true">
            <DroppableBreadcrumbItem
              id={first?.id ?? null}
              name={rootName}
              isLast={true}
              icon={icon}
              linkPath={rootPath}
              allowDrop={allowDrop}
            />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // For paths with more than one segment
  const allSegments: BreadcrumbSegment[] = [
    { id: null, name: rootName, isRoot: true },
    ...pathSegments.slice(1).map(segment => ({ ...segment, isRoot: false }))
  ];
  const dropdownItems = allSegments.slice(0, -2);
  const lastTwoItems = allSegments.slice(-2);

  // State to keep dropdown open during drag
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Monitor drag state to keep dropdown open
  useDndMonitor({
    onDragStart() {
      setIsDragging(true);
      setIsDropdownOpen(true);
    },
    onDragEnd() {
      setIsDragging(false);
      // Don't close immediately to allow the drop to complete
      setTimeout(() => setIsDropdownOpen(false), 100);
    },
    onDragCancel() {
      setIsDragging(false);
      setIsDropdownOpen(false);
    },
  });

  return (
    <Breadcrumb ref={containerRef} className="breadcrumb-nav flex items-center flex-1 bg-secondary h-9 px-4 py-0.5 rounded-md overflow-hidden">
      <BreadcrumbList className="flex items-center whitespace-nowrap overflow-hidden text-ellipsis">
        {/* Show dropdown with all items except last two */}
        {dropdownItems.length > 0 && (
          <BreadcrumbItem className="breadcrumb-item" data-breadcrumb-item="true">
            <DropdownMenu open={isDragging ? isDropdownOpen : undefined}>
              <DropdownMenuTrigger className="flex items-center px-2 py-1 rounded hover:bg-muted">
                <div className="flex items-center">
                  <MoreHorizontal className="size-4" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                className="min-w-48"

              >
                {dropdownItems.map((segment) => (
                  <DropdownMenuItem key={segment.id || 'root'} asChild>
                      <DroppableBreadcrumbItem
                        id={segment.id ?? null}
                        name={segment.name}
                        isLast={false}
                        icon={segment.isRoot ? Home : Folder}
                        linkPath={segment.isRoot ? rootPath : "/folder/$id"}
                        allowDrop={allowDrop}
                      />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </BreadcrumbItem>
        )}

        {/* Show last two items inline */}
        {lastTwoItems.map((segment, index) => (
          <React.Fragment key={segment.id || 'root'}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem className="breadcrumb-item" data-breadcrumb-item="true">
              <DroppableBreadcrumbItem
                id={segment.id ?? null}
                name={segment.name}
                isLast={index === lastTwoItems.length - 1}
                icon={index === lastTwoItems.length - 1 ? FolderOpen : Folder}
                linkPath={segment.isRoot ? rootPath : "/folder/$id"}
                allowDrop={allowDrop}
              />
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}