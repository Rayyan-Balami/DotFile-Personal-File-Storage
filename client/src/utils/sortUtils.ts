import { FileSystemItem } from "@/stores/useFileSystemStore";
import { useMemo } from "react";
import { useSortPreferencesStore } from "@/stores/useSortPreferencesStore";

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
      // First compare by file extension/type, then by name
      const aKind = a.extension || a.type;
      const bKind = b.extension || b.type;
      const kindCompare = sortDirection === "asc"
        ? aKind.localeCompare(bKind)
        : bKind.localeCompare(aKind);
      return kindCompare !== 0 ? kindCompare : compareDefault();
      
      case "size":
        // For files, compare size; for folders, compare items count
        const aSize = a.cardType === 'document' ? (a.size || 0) : (a.items || 0);
        const bSize = b.cardType === 'document' ? (b.size || 0) : (b.items || 0);
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
        if (a.cardType === "folder" && b.cardType !== "folder") return -1;
        if (a.cardType !== "folder" && b.cardType === "folder") return 1;
      }
      
      // If both are the same type or mixing is enabled, sort by chosen property
      return compareItems(a, b, sortBy, sortDirection);
    });
  }, [items, sortBy, sortDirection, folderArrangement]);
}