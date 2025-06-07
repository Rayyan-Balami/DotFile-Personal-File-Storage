import { useSortPreferencesStore } from "@/stores/useSortPreferencesStore";
import { FileSystemItem } from "@/types/folderDocumnet";
import { useMemo } from "react";

// MIME type categories for kind sorting
const MIME_CATEGORIES = {
  image: ["image/"],
  video: ["video/"],
  audio: ["audio/"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  spreadsheet: [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  presentation: [
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  archive: [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
  ],
  code: [
    "text/plain",
    "text/html",
    "text/css",
    "text/javascript",
    "application/json",
  ],
  other: [],
};

// Get MIME category for a file
export function getMimeCategory(type: string): string {
  for (const [category, patterns] of Object.entries(MIME_CATEGORIES)) {
    if (patterns.some((pattern) => type.startsWith(pattern))) {
      return category;
    }
  }
  return "other";
}

// Type for date-based groups
type DateGroup = {
  label: string;
  items: FileSystemItem[];
};

// Group items by date (Today, Yesterday, Previous 7 Days, etc.)
export function groupItemsByDate(
  items: FileSystemItem[],
  sortBy: "dateAdded" | "dateUpdated"
): DateGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setDate(lastMonth.getDate() - 30);

  const groups: DateGroup[] = [];
  const dateField = sortBy === "dateAdded" ? "createdAt" : "updatedAt";

  // Helper function to get the month year string
  const getMonthYearString = (date: Date) => {
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  };

  // Initialize group buckets
  const todayItems: FileSystemItem[] = [];
  const yesterdayItems: FileSystemItem[] = [];
  const last7DaysItems: FileSystemItem[] = [];
  const last30DaysItems: FileSystemItem[] = [];
  const olderItems: Map<string, FileSystemItem[]> = new Map(); // Key is "Month Year"

  items.forEach((item) => {
    const itemDate = new Date(item[dateField]);
    const itemDay = new Date(
      itemDate.getFullYear(),
      itemDate.getMonth(),
      itemDate.getDate()
    );

    if (itemDay.getTime() === today.getTime()) {
      todayItems.push(item);
    } else if (itemDay.getTime() === yesterday.getTime()) {
      yesterdayItems.push(item);
    } else if (itemDay > lastWeek) {
      last7DaysItems.push(item);
    } else if (itemDay > lastMonth) {
      last30DaysItems.push(item);
    } else {
      const monthYearKey = getMonthYearString(itemDate);
      if (!olderItems.has(monthYearKey)) {
        olderItems.set(monthYearKey, []);
      }
      olderItems.get(monthYearKey)!.push(item);
    }
  });

  // Add groups in chronological order
  if (todayItems.length > 0) {
    groups.push({ label: "Today", items: todayItems });
  }
  if (yesterdayItems.length > 0) {
    groups.push({ label: "Yesterday", items: yesterdayItems });
  }
  if (last7DaysItems.length > 0) {
    groups.push({ label: "Previous 7 Days", items: last7DaysItems });
  }
  if (last30DaysItems.length > 0) {
    groups.push({ label: "Previous 30 Days", items: last30DaysItems });
  }

  // Add monthly groups in reverse chronological order
  const sortedMonths = Array.from(olderItems.entries()).sort(
    (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
  );

  sortedMonths.forEach(([monthYear, monthItems]) => {
    groups.push({ label: monthYear, items: monthItems });
  });

  return groups;
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
      if (a.cardType === "folder" && b.cardType !== "folder") return -1;
      if (a.cardType !== "folder" && b.cardType === "folder") return 1;

      // For files, compare by MIME category first, then by type, then by name
      if (a.cardType === "document" && b.cardType === "document") {
        const aCategory = getMimeCategory(a.type);
        const bCategory = getMimeCategory(b.type);

        // Compare categories first
        const categoryCompare =
          sortDirection === "asc"
            ? aCategory.localeCompare(bCategory)
            : bCategory.localeCompare(aCategory);

        if (categoryCompare !== 0) return categoryCompare;

        // If same category, compare by type
        const typeCompare =
          sortDirection === "asc"
            ? a.type.localeCompare(b.type)
            : b.type.localeCompare(a.type);

        if (typeCompare !== 0) return typeCompare;
      }

      // Fall back to name comparison
      return compareDefault();

    case "size":
      // For files, compare size; for folders, compare items count
      const aSize = a.cardType === "document" ? a.size || 0 : a.items || 0;
      const bSize = b.cardType === "document" ? b.size || 0 : b.items || 0;
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
  const sortBy = useSortPreferencesStore((state) => state.sortBy);
  const sortDirection = useSortPreferencesStore((state) => state.sortDirection);
  const folderArrangement = useSortPreferencesStore(
    (state) => state.folderArrangement
  );

  return useMemo(() => {
    // Create a copy to avoid mutation
    const itemsCopy = [...items];

    // If sorting by kind, always use separated arrangement
    const effectiveArrangement =
      sortBy === "kind" ? "separated" : folderArrangement;

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
