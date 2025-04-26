import { CardVariant } from "@/components/cards/FolderDocumentCard";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ViewPreferencesState {
  viewType: CardVariant;
  setViewType: (viewType: CardVariant) => void;
}

export const useViewPreferencesStore = create<ViewPreferencesState>()(
  persist(
    (set) => ({
      viewType: "compact", // Default view type
      setViewType: (viewType) => set({ viewType }),
    }),
    {
      name: "view-preferences",
    }
  )
);