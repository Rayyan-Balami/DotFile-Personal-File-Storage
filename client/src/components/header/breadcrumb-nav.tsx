import { Folder, FolderOpen, Home, Clock, Trash2 } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useRootContents, useFolderContents, useTrashContents } from '@/api/folder/folder.query';
import { useMatches, Link } from '@tanstack/react-router';
import React from "react";

export function BreadcrumbNav() {
  const matches = useMatches();
  
  // Find current route
  const folderMatch = matches.find(match => 
    match.routeId.includes('/(user)/folder/$id')
  );
  const trashMatch = matches.find(match => 
    match.routeId.includes('/(user)/trash')
  );
  const recentMatch = matches.find(match => 
    match.routeId.includes('/(user)/recent')
  );
  
  const folderId = folderMatch?.params ? (folderMatch.params as { id: string }).id : undefined;
  
  // Get data based on current route
  const { data: rootData } = useRootContents();
  const { data: folderData } = useFolderContents(folderId || '');
  const { data: trashData } = useTrashContents();
  
  // Determine path segments and root info based on current route
  let pathSegments: Array<{id: string | null; name: string}> = [];
  let rootName = "My Drive";
  let rootIcon = Home;
  let rootPath = "/";
  
  if (recentMatch) {
    // Recent page - create custom path segments
    pathSegments = [{ id: null, name: "Recent" }];
    rootName = "Recent";
    rootIcon = Clock;
    rootPath = "/recent";
  } else if (trashMatch) {
    // Trash page - use trash data pathSegments
    pathSegments = trashData?.data?.folderContents?.pathSegments || [{ id: null, name: "Trash" }];
    rootName = pathSegments[0]?.name || "Trash";
    rootIcon = Trash2;
    rootPath = "/trash";
  } else if (folderId) {
    // Folder page - use folder data pathSegments
    pathSegments = folderData?.data?.folderContents?.pathSegments || [];
    rootName = pathSegments[0]?.name === "Root" ? "My Drive" : (pathSegments[0]?.name || "My Drive");
    rootIcon = Home;
    rootPath = "/";
  } else {
    // Root page - use root data pathSegments
    pathSegments = rootData?.data?.folderContents?.pathSegments || [];
    rootName = pathSegments[0]?.name === "Root" ? "My Drive" : (pathSegments[0]?.name || "My Drive");
    rootIcon = Home;
    rootPath = "/";
  }

  return (
    <Breadcrumb className="flex flex-grow shrink-0 bg-secondary h-9 px-4 py-2 rounded-md">
      <BreadcrumbList>
        {/* Root is always shown */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={rootPath} className="flex items-center gap-2">
              {React.createElement(rootIcon, { className: "size-4" })}
              <span className={
                folderMatch ? "sr-only" : ""
              }>
                {rootName}
              </span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Map through path segments */}
        {pathSegments.map((segment, index: number) => {
          // Skip the first segment if it's the root (Root, Recent, Trash)
          if (index === 0 && (segment.name === "Root" || segment.name === "Recent" || segment.name === "Trash")) return null;
          
          // Create path for this segment based on current route context
          let path = '/';
          if (trashMatch) {
            // For trash routes, maintain trash context
            path = segment.id ? `/trash/folder/${segment.id}` : '/trash';
          } else if (recentMatch) {
            // For recent routes, folders should navigate normally
            path = segment.id ? `/folder/${segment.id}` : '/recent';
          } else {
            // Normal folder navigation
            path = segment.id ? `/folder/${segment.id}` : '/';
          }
          
          const isLast = index === pathSegments.length - 1;
          
          return (
            <React.Fragment key={`segment-${index}`}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="flex items-center gap-2">
                    <FolderOpen className="size-4" />
                    {segment.name}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={path} className="flex items-center gap-2">
                      <Folder className="size-4" />
                      <span>{segment.name}</span>
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
