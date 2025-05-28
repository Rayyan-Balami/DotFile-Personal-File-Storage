import { FileSystemItem } from "@/types/folderDocumnet";
import { useMemo } from "react";
import { useSortPreferencesStore } from "@/stores/useSortPreferencesStore";

// MIME type categories for kind sorting
const MIME_CATEGORIES = {
  'image': ['image/'],
  'video': ['video/'],
  'audio': ['audio/'],
  'document': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  'spreadsheet': ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  'presentation': ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  'archive': ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
  'code': ['text/plain', 'text/html', 'text/css', 'text/javascript', 'application/json'],
  'other': []
};

// Get MIME category for a file
export function getMimeCategory(type: string): string {
  for (const [category, patterns] of Object.entries(MIME_CATEGORIES)) {
    if (patterns.some(pattern => type.startsWith(pattern))) {
      return category;
    }
  }
  return 'other';
}

// Compare function for sorting items
function compareItems(
  a: FileSystemItem, 
  b: FileSystemItem, 
  sortBy: string, 
  sortDirection: "asc" | "desc"
): number {
  // Default comparison for when values are missing
  const compareDefault = () => {
    return sortDirection === "asc" 
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name);
  };

  // Handle different sort types
  switch (sortBy) {
    case "name":
      return sortDirection === "asc" 
        ? a.name.localeCompare(b.name) 
        : b.name.localeCompare(a.name);
      
    case "kind":
      // For folders, always sort them first
      if (a.cardType === 'folder' && b.cardType !== 'folder') return -1;
      if (a.cardType !== 'folder' && b.cardType === 'folder') return 1;
      
      // For files, compare by MIME category first, then by type, then by name
      if (a.cardType === 'document' && b.cardType === 'document') {
        const aCategory = getMimeCategory(a.type);
        const bCategory = getMimeCategory(b.type);
        
        // Compare categories first
        const categoryCompare = sortDirection === "asc"
          ? aCategory.localeCompare(bCategory)
          : bCategory.localeCompare(aCategory);
        
        if (categoryCompare !== 0) return categoryCompare;
        
        // If same category, compare by type
        const typeCompare = sortDirection === "asc"
          ? a.type.localeCompare(b.type)
          : b.type.localeCompare(a.type);
        
        if (typeCompare !== 0) return typeCompare;
      }
      
      // Fall back to name comparison
      return compareDefault();
      
    case "size":
      // For files, compare size; for folders, compare items count
      const aSize = a.cardType === 'document' ? (a.size || 0) : (a.items || 0);
      const bSize = b.cardType === 'document' ? (b.size || 0) : (b.items || 0);
      return sortDirection === "asc" ? aSize - bSize : bSize - aSize;
      
    case "dateModified":
      return sortDirection === "asc"
        ? new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      
    case "dateAdded":
      return sortDirection === "asc"
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      
    case "dateOpened":
      // TODO: Implement when we have last opened date
      return compareDefault();
      
    default:
      return compareDefault();
  }
}

// Hook to get sorted file system items
export function useSortedItems(items: FileSystemItem[]): FileSystemItem[] {
  const sortBy = useSortPreferencesStore(state => state.sortBy);
  const sortDirection = useSortPreferencesStore(state => state.sortDirection);
  const folderArrangement = useSortPreferencesStore(state => state.folderArrangement);

  return useMemo(() => {
    // Create a copy to avoid mutation
    const itemsCopy = [...items];
    
    // If sorting by kind, always use separated arrangement
    const effectiveArrangement = sortBy === "kind" ? "separated" : folderArrangement;
    
    // Sort based on selected preferences
    return itemsCopy.sort((a, b) => {
      // Handle folder arrangement
      if (effectiveArrangement === "separated") {
        // If folders should be separated (displayed first)
        if (a.cardType === "folder" && b.cardType !== "folder") return -1;
        if (a.cardType !== "folder" && b.cardType === "folder") return 1;
      }
      
      // If both are the same type or mixing is enabled, sort by chosen property
      return compareItems(a, b, sortBy, sortDirection);
    });
  }, [items, sortBy, sortDirection, folderArrangement]);
}