import { useDialogStore } from "@/stores/useDialogStore";
import type { FileSystemItem } from "@/types/folderDocumnet";
import { useEffect } from "react";
import { create } from "zustand";

export type SelectableItem = FileSystemItem;

interface SelectionState {
  selectedIds: Set<string>;
  lastSelectedId: string | null;
  selectionAnchor: string | null;
  lastClickTime: number;
  lastClickId: string | null;
  itemPositions: Map<string, number>;
  visibleItems: SelectableItem[];
  isDeleting: boolean;
}

interface SelectionActions {
  select: (id: string, event: React.MouseEvent) => void;
  toggle: (id: string) => void;
  clear: () => void;
  selectRange: (startId: string, endId: string) => void;
  isSelected: (id: string) => boolean;
  updateItemPositions: (items: SelectableItem[]) => void;
  handleItemClick: (
    id: string,
    event: React.MouseEvent,
    onOpen?: () => void
  ) => void;
  selectAll: () => void;
  setVisibleItems: (items: SelectableItem[]) => void;
  deleteSelected: (onDelete?: (id: string) => void) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  getSelectedItems: () => SelectableItem[];
  logSelection: () => void;
}

type SelectionStore = SelectionState & SelectionActions;

const addToSet = <T>(set: Set<T>, item: T): Set<T> => {
  const newSet = new Set(set);
  newSet.add(item);
  return newSet;
};

const removeFromSet = <T>(set: Set<T>, item: T): Set<T> => {
  const newSet = new Set(set);
  newSet.delete(item);
  return newSet;
};

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  selectedIds: new Set(),
  lastSelectedId: null,
  selectionAnchor: null,
  lastClickTime: 0,
  lastClickId: null,
  itemPositions: new Map(),
  visibleItems: [],
  isDeleting: false,

  setVisibleItems: (items) => {
    set({ visibleItems: items });
    get().updateItemPositions(items);
  },

  selectAll: () => {
    const { visibleItems, selectedIds } = get();
    if (!visibleItems.length) return;

    const allIds = new Set(visibleItems.map((item) => item.id));

    // Check if all items are already selected (toggle behavior)
    const allSelected =
      visibleItems.length === selectedIds.size &&
      visibleItems.every((item) => selectedIds.has(item.id));

    if (allSelected) {
      // If all are selected, clear selection
      set({
        selectedIds: new Set(),
        lastSelectedId: null,
        selectionAnchor: null,
      });
    } else {
      // If not all are selected, select all
      set({
        selectedIds: allIds,
        lastSelectedId: visibleItems.at(-1)?.id ?? null,
        selectionAnchor: visibleItems[0].id,
      });
    }
  },

  getSelectedItems: () => {
    const { selectedIds, visibleItems } = get();
    const items = visibleItems.filter((item) => selectedIds.has(item.id));
    return items;
  },

  logSelection: () => {
    const selected = get().getSelectedItems();
    if (!selected.length) return console.log("[LOG] No items selected");

    console.group(`[LOG] ${selected.length} selected`);
    const folders = selected.filter((i) => i.cardType === "folder");
    const documents = selected.filter((i) => i.cardType === "document");

    if (folders.length) {
      console.group(`Folders (${folders.length})`);
      folders.forEach((f) => console.log(`- ${f.name}`));
      console.groupEnd();
    }

    if (documents.length) {
      console.group(`Documents (${documents.length})`);
      documents.forEach((d) => console.log(`- ${d.name}`));
      console.groupEnd();
    }

    console.groupEnd();
  },

  deleteSelected: (onDelete) => {
    const { selectedIds } = get();
    if (!selectedIds.size) return;

    console.log(`[DELETE] ${selectedIds.size} item(s)`);
    get().logSelection();
    set({ isDeleting: true });

    onDelete
      ? selectedIds.forEach((id) => onDelete(id))
      : console.log("[DELETE] No callback");

    set({
      selectedIds: new Set(),
      lastSelectedId: null,
      selectionAnchor: null,
      isDeleting: false,
    });
  },

  handleKeyDown: (e) => {
    const target = e.target as HTMLElement;
    if (
      ["INPUT", "TEXTAREA"].includes(target.tagName) ||
      target.isContentEditable
    )
      return;

    const store = get();

    if ((e.metaKey || e.ctrlKey) && e.key === "a") {
      e.preventDefault();
      store.selectAll();
    }

    if (e.key === "Escape") {
      store.clear();
    }

    if ((e.metaKey || e.ctrlKey) && e.key === "Delete") {
      e.preventDefault();
      const items = store.getSelectedItems();
      if (!items.length) return;

      const folders = items.filter((i) => i.cardType === "folder");
      const docs = items.filter((i) => i.cardType === "document");
      const { openDeleteDialog } = useDialogStore.getState();

      openDeleteDialog(
        [...folders, ...docs].map((i) => i.id),
        folders.length ? "folder" : "document",
        [...folders, ...docs].map((i) => i.name),
        null,
        e.shiftKey
      );
    }
  },

  select: (id, event) => {
    if (event.metaKey || event.ctrlKey) {
      set((state) => ({
        selectedIds: state.selectedIds.has(id)
          ? removeFromSet(state.selectedIds, id)
          : addToSet(state.selectedIds, id),
        lastSelectedId: id,
        selectionAnchor: id,
      }));
    } else if (event.shiftKey && get().selectionAnchor) {
      get().selectRange(get().selectionAnchor!, id);
    } else {
      set({
        selectedIds: new Set([id]),
        lastSelectedId: id,
        selectionAnchor: id,
      });
    }
  },

  toggle: (id) => {
    set((state) => ({
      selectedIds: state.selectedIds.has(id)
        ? removeFromSet(state.selectedIds, id)
        : addToSet(state.selectedIds, id),
      lastSelectedId: id,
      selectionAnchor: id,
    }));
  },

  clear: () => {
    const { selectedIds } = get();
    if (!selectedIds.size) return;
    console.log("[CLEAR] Selection cleared");
    set({
      selectedIds: new Set(),
      lastSelectedId: null,
      selectionAnchor: null,
    });
  },

  updateItemPositions: (items) => {
    const posMap = new Map<string, number>();
    items.forEach((item, i) => posMap.set(item.id, i));
    set({ itemPositions: posMap });
  },

  selectRange: (startId, endId) => {
    const { itemPositions, visibleItems } = get();
    const start = itemPositions.get(startId);
    const end = itemPositions.get(endId);
    if (start === undefined || end === undefined) return;

    const range = visibleItems.slice(
      Math.min(start, end),
      Math.max(start, end) + 1
    );
    const rangeIds = new Set(range.map((item) => item.id));
    set({ selectedIds: rangeIds, lastSelectedId: endId });
  },

  isSelected: (id) => get().selectedIds.has(id),

  handleItemClick: (id, event, onOpen) => {
    if (get().isDeleting) return event.stopPropagation();

    const now = Date.now();
    const { lastClickId, lastClickTime } = get();

    if (lastClickId === id && now - lastClickTime < 350) {
      onOpen?.();
    } else {
      get().select(id, event);
    }

    set({ lastClickTime: now, lastClickId: id });
  },
}));

export function useKeyboardShortcuts(onDelete?: (id: string) => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) =>
      useSelectionStore.getState().handleKeyDown(e);

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onDelete]);
}

export const useSelectedIds = () =>
  useSelectionStore((state) => state.selectedIds);

export const useSelectionCount = () =>
  useSelectionStore((state) => state.selectedIds.size);

export const selectedIdsEqual = (prev: Set<string>, next: Set<string>) => {
  if (prev.size !== next.size) return false;
  for (const id of prev) if (!next.has(id)) return false;
  return true;
};
