import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
import { useEffect } from 'react';

export interface SelectableItem {
  id: string;
  type: 'folder' | 'document';
  title: string;
}

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
  selectRange: (items: SelectableItem[]) => void;
  isSelected: (id: string) => boolean;
  updateItemPositions: (items: SelectableItem[]) => void;
  handleItemClick: (
    id: string,
    event: React.MouseEvent,
    onOpen?: () => void
  ) => void;
  selectAll: () => void;
  setVisibleItems: (items: SelectableItem[]) => void;
  deleteSelected: (onDelete?: (ids: Set<string>) => void) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
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
  
  deleteSelected: (onDelete?: (ids: Set<string>) => void) => {
    const { selectedIds } = get();
    if (selectedIds.size === 0) return;
    
    if (onDelete) {
      onDelete(selectedIds);
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
    
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const { selectedIds } = get();
      if (selectedIds.size > 0) {
        e.preventDefault();
        get().deleteSelected();
      }
    }
    
    if (e.key === 'Escape') {
      get().clear();
    }
  },
  
  select: (id: string, event: React.MouseEvent) => {
    const { selectedIds } = get();
    
    if (event.metaKey || event.ctrlKey) {
      set(state => ({
        selectedIds: state.selectedIds.has(id) 
          ? removeFromSet(state.selectedIds, id)
          : addToSet(state.selectedIds, id),
        lastSelectedId: id,
        selectionAnchor: id
      }));
    } else if (event.shiftKey && get().selectionAnchor) {
      set({ lastSelectedId: id });
    } else {
      const newSelection = new Set<string>([id]);
      set({
        selectedIds: newSelection,
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
    set({
      selectedIds: new Set<string>(),
      lastSelectedId: null
    });
  },
  
  updateItemPositions: (items: SelectableItem[]) => {
    const itemPositions = new Map<string, number>();
    items.forEach((item, index) => {
      itemPositions.set(item.id, index);
    });
    set({ itemPositions });
  },
  
  selectRange: (items: SelectableItem[]) => {
    const { selectionAnchor, lastSelectedId, itemPositions } = get();
    if (!selectionAnchor || !lastSelectedId || selectionAnchor === lastSelectedId) return;
    
    let anchorIndex = itemPositions.get(selectionAnchor) ?? -1;
    let targetIndex = itemPositions.get(lastSelectedId) ?? -1;
    
    if (anchorIndex === -1 || targetIndex === -1) {
      const ids = items.map(item => item.id);
      anchorIndex = ids.indexOf(selectionAnchor);
      targetIndex = ids.indexOf(lastSelectedId);
      
      if (anchorIndex !== -1) itemPositions.set(selectionAnchor, anchorIndex);
      if (targetIndex !== -1) itemPositions.set(lastSelectedId, targetIndex);
    }
    
    if (anchorIndex === -1 || targetIndex === -1) return;
    
    const rangeSize = Math.abs(targetIndex - anchorIndex);
    if (rangeSize > 1000) {
      console.warn('Range selection too large, limiting to 1000 items');
      targetIndex = anchorIndex + (targetIndex > anchorIndex ? 1000 : -1000);
    }
    
    const start = Math.min(anchorIndex, targetIndex);
    const end = Math.max(anchorIndex, targetIndex);
    
    const newSelectedIds = new Set<string>();
    for (let i = start; i <= end; i++) {
      if (i < items.length) {
        newSelectedIds.add(items[i].id);
      }
    }
    
    set({ selectedIds: newSelectedIds });
  },
  
  isSelected: (id: string) => {
    return get().selectedIds.has(id);
  },
  
  handleItemClick: (id: string, event: React.MouseEvent, onOpen?: () => void) => {
    const now = Date.now();
    const { lastClickTime, lastClickId } = get();
    
    if (lastClickId === id && now - lastClickTime < 350) {
      if (onOpen) {
        requestAnimationFrame(() => onOpen());
      }
      set({ lastClickTime: 0, lastClickId: null });
    } else {
      get().select(id, event);
      set({ lastClickTime: now, lastClickId: id });
    }
  }
}));

export function useKeyboardShortcuts(onDelete?: (ids: Set<string>) => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      useSelectionStore.getState().handleKeyDown(e);
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete) {
        const selectedIds = useSelectionStore.getState().selectedIds;
        if (selectedIds.size > 0) {
          onDelete(selectedIds);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
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