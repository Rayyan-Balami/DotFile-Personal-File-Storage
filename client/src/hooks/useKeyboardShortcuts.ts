import { useEffect } from 'react';
import { useSelectionStore } from '@/stores/useSelectionStore';

export const useKeyboardShortcuts = (onOpen?: (id: string) => void) => {
  const handleKeyDown = useSelectionStore((state) => state.handleKeyDown);
  const getSelectedItems = useSelectionStore((state) => state.getSelectedItems);

  useEffect(() => {
    const handleEnterKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && onOpen) {
        const selectedItems = getSelectedItems();
        if (selectedItems.length === 1) {
          onOpen(selectedItems[0].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleEnterKey);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleEnterKey);
    };
  }, [handleKeyDown, getSelectedItems, onOpen]);
};
