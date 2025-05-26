import { Folder, FolderOpen, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useRootContents, useFolderContents } from '@/api/folder/folder.query';
import { useMatches, Link } from '@tanstack/react-router';
import React from "react";

export function BreadcrumbNav() {
  const matches = useMatches();
  
  // Find if we're in a folder route by checking the matches
  const folderMatch = matches.find(match => 
    match.routeId.includes('/(user)/folder/$id')
  );
  
  const folderId = folderMatch?.params ? (folderMatch.params as { id: string }).id : undefined;
  
  // Get data based on current route
  const { data: rootData } = useRootContents();
  const { data: folderData } = useFolderContents(folderId || '');
  
  // Get path segments based on current location
  const pathSegments: Array<{id: string | null; name: string}> = folderId 
    ? folderData?.data?.folderContents?.pathSegments || []
    : rootData?.data?.folderContents?.pathSegments || [];

  return (
    <Breadcrumb className="flex flex-grow shrink-0 bg-secondary h-9 px-4 py-2 rounded-md">
      <BreadcrumbList>
        {/* Root is always shown */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="flex items-center gap-2">
              <Home className="size-4" />
              <span className={
                folderMatch ? "sr-only" : ""
              }>
                My Drive
              </span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Map through path segments */}
        {pathSegments.map((segment, index: number) => {
          // Skip the first "Root" item since we already show home icon
          if (index === 0 && segment.name === "Root") return null;
          
          // Create path for this segment
          const path = segment.id ? `/folder/${segment.id}` : '/';
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
