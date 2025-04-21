import { create } from 'zustand';

export interface SelectableItem {
  id: string;
  type: 'folder' | 'document';
  title: string;
}

interface SelectionStore {
  // Selection state
  selectedIds: Set<string>;
  lastSelectedId: string | null;
  selectionAnchor: string | null;
  
  // Actions
  select: (id: string, event: React.MouseEvent) => void;
  toggle: (id: string) => void;
  clear: () => void;
  selectRange: (items: SelectableItem[]) => void;
  isSelected: (id: string) => boolean;
  
  // Item opening
  handleItemClick: (
    id: string,
    event: React.MouseEvent,
    onOpen?: () => void
  ) => void;
  
  // Double-click tracking for opening items
  lastClickTime: number;
  lastClickId: string | null;
}

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  selectedIds: new Set<string>(),
  lastSelectedId: null,
  selectionAnchor: null,
  lastClickTime: 0,
  lastClickId: null,
  
  select: (id: string, event: React.MouseEvent) => {
    const { selectedIds } = get();
    const newSelection = new Set<string>();
    
    // Handle modifier keys for multi-select
    if (event.metaKey || event.ctrlKey) {
      // Toggle selection with Cmd/Ctrl
      const newSelectedIds = new Set(selectedIds);
      if (selectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.add(id);
      }
      
      set({
        selectedIds: newSelectedIds,
        lastSelectedId: id,
        selectionAnchor: id
      });
    } else if (event.shiftKey && get().selectionAnchor) {
      // Will trigger range selection
      set({ lastSelectedId: id });
    } else {
      // Regular click - select only this item
      newSelection.add(id);
      set({
        selectedIds: newSelection,
        lastSelectedId: id,
        selectionAnchor: id
      });
    }
  },
  
  toggle: (id: string) => {
    const { selectedIds } = get();
    const newSelectedIds = new Set(selectedIds);
    
    if (selectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    
    set({
      selectedIds: newSelectedIds,
      lastSelectedId: id,
      selectionAnchor: id
    });
  },
  
  clear: () => {
    set({
      selectedIds: new Set<string>(),
      lastSelectedId: null
    });
  },
  
  selectRange: (items: SelectableItem[]) => {
    const { selectionAnchor, lastSelectedId } = get();
    if (!selectionAnchor || !lastSelectedId || selectionAnchor === lastSelectedId) return;
    
    const newSelectedIds = new Set<string>();
    
    // Find the indices of anchor and last selected items
    const ids = items.map(item => item.id);
    const anchorIndex = ids.indexOf(selectionAnchor);
    const targetIndex = ids.indexOf(lastSelectedId);
    
    if (anchorIndex === -1 || targetIndex === -1) return;
    
    // Select all items in the range
    const start = Math.min(anchorIndex, targetIndex);
    const end = Math.max(anchorIndex, targetIndex);
    
    for (let i = start; i <= end; i++) {
      newSelectedIds.add(items[i].id);
    }
    
    set({ selectedIds: newSelectedIds });
  },
  
  isSelected: (id: string) => {
    return get().selectedIds.has(id);
  },
  
  handleItemClick: (id: string, event: React.MouseEvent, onOpen?: () => void) => {
    const now = Date.now();
    const { lastClickTime, lastClickId } = get();
    
    // Check if this is a double-click (within 500ms on same item)
    if (lastClickId === id && now - lastClickTime < 500) {
      // Double-click! Open the item
      if (onOpen) onOpen();
      set({ lastClickTime: 0, lastClickId: null });
    } else {
      // Single click - handle selection
      get().select(id, event);
      set({ lastClickTime: now, lastClickId: id });
    }
  }
}));