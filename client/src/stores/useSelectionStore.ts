import { create } from 'zustand';
import { useEffect } from 'react';
import type { FileSystemItem } from '@/types/folderDocumnet';

export type SelectableItem = FileSystemItem;

interface SelectionState {
  selectedIds: Set<string>;
  lastSelectedId: string | null;
  selectionAnchor: string | null;
  lastClickTime: number;
  lastClickId: string | null;
  itemPositions: Map<string, number>;
  visibleItems: SelectableItem[];
}

interface SelectionActions {
  select: (id: string, event: React.MouseEvent) => void;
  toggle: (id: string) => void;
  clear: () => void;
  selectRange: (startId: string, endId: string) => void;
  isSelected: (id: string) => boolean;
  updateItemPositions: (items: SelectableItem[]) => void;
  handleItemClick: (id: string, event: React.MouseEvent, onOpen?: () => void) => void;
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
  selectedIds: new Set<string>(),
  lastSelectedId: null,
  selectionAnchor: null,
  lastClickTime: 0,
  lastClickId: null,
  itemPositions: new Map<string, number>(),
  visibleItems: [],
  
  setVisibleItems: (items: SelectableItem[]) => {
    set({ visibleItems: items });
    get().updateItemPositions(items);
  },
  
  selectAll: () => {
    const { visibleItems } = get();
    if (!visibleItems.length) return;
    
    const newSelectedIds = new Set<string>();
    for (const item of visibleItems) {
      newSelectedIds.add(item.id);
    }
    
    set({
      selectedIds: newSelectedIds,
      lastSelectedId: visibleItems[visibleItems.length - 1].id,
      selectionAnchor: visibleItems[0].id
    });
  },
  
  getSelectedItems: () => {
    const { selectedIds, visibleItems } = get();
    return visibleItems.filter(item => selectedIds.has(item.id));
  },
  
  logSelection: () => {
    const selectedItems = get().getSelectedItems();
    if (selectedItems.length === 0) {
      console.log("No items selected");
      return;
    }
    
    console.group(`${selectedItems.length} item(s) selected:`);
    
    // Group by type for better organization
    const folders = selectedItems.filter(item => item.type === 'folder');
    const documents = selectedItems.filter(item => item.type === 'document');
    
    if (folders.length > 0) {
      console.group(`Folders (${folders.length}):`);
      folders.forEach(folder => console.log(`- ${folder.name}`));
      console.groupEnd();
    }
    
    if (documents.length > 0) {
      console.group(`Documents (${documents.length}):`);
      documents.forEach(doc => console.log(`- ${doc.name}`));
      console.groupEnd();
    }
    
    console.groupEnd();
  },
  
  deleteSelected: (onDelete?: (id: string) => void) => {
    const { selectedIds } = get();
    if (selectedIds.size === 0) return;
    
    // Log items being deleted
    console.log(`Deleting ${selectedIds.size} items:`);
    get().logSelection();
    
    if (onDelete) {
      // Call onDelete for each selected ID
      selectedIds.forEach(id => onDelete(id));
    } else {
      console.log('Delete action for items:', Array.from(selectedIds));
    }
    
    set({
      selectedIds: new Set<string>(),
      lastSelectedId: null,
      selectionAnchor: null
    });
  },
  
  handleKeyDown: (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }
    
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      e.preventDefault();
      get().selectAll();
    }
    
    if (e.key === 'Escape') {
      get().clear();
    }
  },
  
  select: (id: string, event: React.MouseEvent) => {
    if (event.metaKey || event.ctrlKey) {
      // Toggle selection with Ctrl/Cmd
      set(state => ({
        selectedIds: state.selectedIds.has(id) 
          ? removeFromSet(state.selectedIds, id)
          : addToSet(state.selectedIds, id),
        lastSelectedId: id,
        selectionAnchor: id
      }));
    } else if (event.shiftKey && get().selectionAnchor) {
      // Shift-select for range
      const anchorId = get().selectionAnchor;
      if (anchorId) {
        get().selectRange(anchorId, id);
      }
    } else {
      // Normal single selection
      set({
        selectedIds: new Set([id]),
        lastSelectedId: id,
        selectionAnchor: id
      });
    }
  },
  
  toggle: (id: string) => {
    set(state => ({
      selectedIds: state.selectedIds.has(id)
        ? removeFromSet(state.selectedIds, id)
        : addToSet(state.selectedIds, id),
      lastSelectedId: id,
      selectionAnchor: id
    }));
  },
  
  clear: () => {
    const { selectedIds } = get();
    if (selectedIds.size === 0) return;
    
    set({
      selectedIds: new Set<string>(),
      lastSelectedId: null,
      selectionAnchor: null
    });
    console.log("Selection cleared");
  },
  
  updateItemPositions: (items: SelectableItem[]) => {
    const itemPositions = new Map<string, number>();
    items.forEach((item, index) => {
      itemPositions.set(item.id, index);
    });
    set({ itemPositions });
  },
  
  selectRange: (startId: string, endId: string) => {
    const { itemPositions, visibleItems } = get();
    
    const startIndex = itemPositions.get(startId);
    const endIndex = itemPositions.get(endId);
    
    if (startIndex === undefined || endIndex === undefined) return;
    
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    
    const newSelectedIds = new Set<string>();
    for (let i = start; i <= end; i++) {
      if (visibleItems[i]) {
        newSelectedIds.add(visibleItems[i].id);
      }
    }
    
    set({ 
      selectedIds: newSelectedIds,
      lastSelectedId: endId
    });
  },
  
  isSelected: (id: string) => {
    return get().selectedIds.has(id);
  },
  
  handleItemClick: (id: string, event: React.MouseEvent, onOpen?: () => void) => {
    const now = Date.now();
    const { lastClickTime, lastClickId } = get();
    
    if (lastClickId === id && now - lastClickTime < 350) {
      // Double click
      if (onOpen) onOpen();
    } else {
      // Single click
      get().select(id, event);
    }
    
    set({ 
      lastClickTime: now,
      lastClickId: id
    });
  }
}));

export function useKeyboardShortcuts(onDelete?: (id: string) => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = useSelectionStore.getState();
      store.handleKeyDown(e);
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete) {
        store.deleteSelected(onDelete);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDelete]);
}

export const useSelectedIds = () => 
  useSelectionStore(state => state.selectedIds);

export const useSelectionCount = () =>
  useSelectionStore(state => state.selectedIds.size);

export const selectedIdsEqual = (prev: Set<string>, next: Set<string>) => {
  if (prev.size !== next.size) return false;
  for (const id of prev) {
    if (!next.has(id)) return false;
  }
  return true;
};