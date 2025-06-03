import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Folder, FolderOpen, Home, Clock, Trash2 } from "lucide-react";
import { useRootContents, useFolderContents, useTrashContents } from "@/api/folder/folder.query";
import { useMatches, Link } from "@tanstack/react-router";
import React from "react";

export function BreadcrumbNav() {
  const matches = useMatches();

  const folderMatch = matches.find(match => match.routeId.includes('/(user)/folder/'));
  const trashMatch = matches.find(match => match.routeId.includes('/(user)/trash'));
  const recentMatch = matches.find(match => match.routeId.includes('/(user)/recent'));

  const folderId = folderMatch?.params ? (folderMatch.params as { id: string }).id : "";

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

  const isOnRoot = pathSegments.length <= 1;

  return (
    <Breadcrumb className="flex flex-grow shrink-0 bg-secondary h-9 px-4 py-2 rounded-md">
      <BreadcrumbList>
        <BreadcrumbItem>
          {isOnRoot ? (
            <BreadcrumbPage className="flex items-center gap-2">
              {React.createElement(icon, { className: "size-4" })}
              {rootName}
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link to={rootPath} className="flex items-center gap-2">
                {React.createElement(icon, { className: "size-4" })}
                {rootName}
              </Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {pathSegments.slice(1).map((segment, index) => {
          const isLast = index === pathSegments.length - 2;
          const base = pathSegments[0]?.name;
          const linkPath =
            base === "Trash"
              ? `/trash/folder/${segment.id}`
              : `/folder/${segment.id}`;

          return (
            <React.Fragment key={segment.id || index}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="flex items-center gap-2">
                    <FolderOpen className="size-4" />
                    {segment.name}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={linkPath} className="flex items-center gap-2">
                      <Folder className="size-4" />
                      {segment.name}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
