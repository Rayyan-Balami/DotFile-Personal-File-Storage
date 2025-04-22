import React from 'react';
import { useSelectionStore } from '../store/useSelectionStore';

export const SelectionBox: React.FC = () => {
  const selectionBox = useSelectionStore(state => state.selectionBox);
  
  if (!selectionBox.active) return null;
  
  // Calculate selection box position and dimensions
  const left = Math.min(selectionBox.startX, selectionBox.endX);
  const top = Math.min(selectionBox.startY, selectionBox.endY);
  const width = Math.abs(selectionBox.endX - selectionBox.startX);
  const height = Math.abs(selectionBox.endY - selectionBox.startY);
  
  return (
    <div
      className="fixed bg-primary/10 border border-primary/40 z-50 pointer-events-none"
      style={{
        left,
        top,
        width, 
        height
      }}
    />
  );
};