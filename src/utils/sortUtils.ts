import { FileSystemItem } from "@/store/useFileSystemStore";
import { useMemo } from "react";
import { useSortPreferencesStore } from "@/store/useSortPreferencesStore";

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
      ? a.title.localeCompare(b.title)
      : b.title.localeCompare(a.title);
  };

  // Handle different sort types
  switch (sortBy) {
    case "name":
      return sortDirection === "asc" 
        ? a.title.localeCompare(b.title) 
        : b.title.localeCompare(a.title);
      
    case "kind":
      // First compare by file extension/type, then by name
      const aKind = a.fileExtension || a.type;
      const bKind = b.fileExtension || b.type;
      const kindCompare = sortDirection === "asc"
        ? aKind.localeCompare(bKind)
        : bKind.localeCompare(aKind);
      return kindCompare !== 0 ? kindCompare : compareDefault();
      
    case "size":
      // Compare by item count (for folders) or just 1 for files
      const aSize = a.itemCount || 1;
      const bSize = b.itemCount || 1;
      return sortDirection === "asc" ? aSize - bSize : bSize - aSize;
      
    // You would need to add date fields to your FileSystemItem interface
    case "dateModified":
    case "dateAdded":
    case "dateOpened":
      // Assuming items have these date properties
      return compareDefault(); // Replace with actual date comparison when you have those fields
      
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
    
    // Sort based on selected preferences
    return itemsCopy.sort((a, b) => {
      // Handle folder arrangement
      if (folderArrangement === "separated") {
        // If folders should be separated (displayed first)
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (a.type !== "folder" && b.type === "folder") return 1;
      }
      
      // If both are the same type or mixing is enabled, sort by chosen property
      return compareItems(a, b, sortBy, sortDirection);
    });
  }, [items, sortBy, sortDirection, folderArrangement]);
}