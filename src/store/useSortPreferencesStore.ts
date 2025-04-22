import { create } from "zustand";
import { persist } from "zustand/middleware";

type SortDirection = "asc" | "desc";
type SortBy = "name" | "kind" | "dateModified" | "dateAdded" | "dateOpened" | "size" | "desk";
type FolderArrangement = "separated" | "mixed";

interface SortPreferencesState {
  sortDirection: SortDirection;
  setSortDirection: (direction: SortDirection) => void;
  sortBy: SortBy;
  setSortBy: (by: SortBy) => void;
  folderArrangement: FolderArrangement;
  setFolderArrangement: (arrangement: FolderArrangement) => void;
}

export const useSortPreferencesStore = create<SortPreferencesState>()(
  persist(
    (set) => ({
      sortDirection: "asc", // Default sort direction
      setSortDirection: (sortDirection) => set({ sortDirection }),
      sortBy: "name", // Default sort by
      setSortBy: (sortBy) => set({ sortBy }),
      folderArrangement: "separated", // Default folder arrangement
      setFolderArrangement: (folderArrangement) => set({ folderArrangement }),
    }),
    {
      name: "sort-preferences",
    }
  )
);