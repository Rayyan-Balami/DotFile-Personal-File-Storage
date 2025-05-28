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
  
  // Route detection
  const folderMatch = matches.find(match => match.routeId.includes('/(user)/folder/$id'));
  const trashMatch = matches.find(match => match.routeId.includes('/(user)/trash'));
  const recentMatch = matches.find(match => match.routeId.includes('/(user)/recent'));
  
  const folderId = folderMatch?.params ? (folderMatch.params as { id: string }).id : undefined;
  
  // Data queries
  const { data: rootData } = useRootContents();
  const { data: folderData } = useFolderContents(folderId || '');
  const { data: trashData } = useTrashContents();
  
  // Route config
  const getRouteConfig = () => {
    if (recentMatch) return { segments: [{ id: null, name: "Recent" }], name: "Recent", icon: Clock, path: "/recent" };
    if (trashMatch) return { 
      segments: trashData?.data?.folderContents?.pathSegments || [{ id: null, name: "Trash" }], 
      name: "Trash", icon: Trash2, path: "/trash" 
    };
    
    const segments = (folderId ? folderData : rootData)?.data?.folderContents?.pathSegments || [];
    const name = segments[0]?.name === "Root" ? "My Drive" : (segments[0]?.name || "My Drive");
    return { segments, name, icon: Home, path: "/" };
  };
  
  const { segments: pathSegments, name: rootName, icon: rootIcon, path: rootPath } = getRouteConfig();
  const isOnRootPage = pathSegments.length <= 1 && ["Root", "Recent", "Trash"].includes(pathSegments[0]?.name || "");

  return (
    <Breadcrumb className="flex flex-grow shrink-0 bg-secondary h-9 px-4 py-2 rounded-md">
      <BreadcrumbList>
        <BreadcrumbItem>
          {isOnRootPage ? (
            <BreadcrumbPage className="flex items-center gap-2">
              {React.createElement(rootIcon, { className: "size-4" })}
              {rootName}
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link to={rootPath} className="flex items-center gap-2">
                {React.createElement(rootIcon, { className: "size-4" })}
                <span className={folderMatch ? "sr-only" : ""}>{rootName}</span>
              </Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {pathSegments.map((segment: {id: string | null; name: string}, index: number) => {
          if (index === 0 && ["Root", "Recent", "Trash"].includes(segment.name)) return null;
          
          const getPath = () => {
            if (trashMatch) return segment.id ? `/trash/folder/${segment.id}` : '/trash';
            if (recentMatch) return segment.id ? `/folder/${segment.id}` : '/recent';
            return segment.id ? `/folder/${segment.id}` : '/';
          };
          
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
                    <Link to={getPath()} className="flex items-center gap-2">
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
