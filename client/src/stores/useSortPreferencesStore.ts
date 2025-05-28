import { create } from "zustand";
import { persist } from "zustand/middleware";

type SortDirection = "asc" | "desc";
// Update sortBy to use 'name' instead of 'title'
type SortBy = "name" | "kind" | "dateAdded" | "dateUpdated" | "size" | "desk";
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
      setSortBy: (sortBy) => set((state) => {
        // If sorting by kind, force separated arrangement
        if (sortBy === "kind") {
          return { sortBy, folderArrangement: "separated" };
        }
        return { sortBy };
      }),
      folderArrangement: "separated", // Default folder arrangement
      setFolderArrangement: (folderArrangement) => set((state) => {
        // Don't allow mixed arrangement when sorting by kind
        if (state.sortBy === "kind" && folderArrangement === "mixed") {
          return state;
        }
        return { folderArrangement };
      }),
    }),
    {
      name: "sort-preferences",
    }
  )
);