import { FileSystemItem } from "@/types/folderDocumnet";
import { CardVariant } from "@/components/cards/FolderDocumentCard";
import { DraggableFolderCard } from "@/components/cards/DraggableFolderCard";

export interface CardGridProps {
  items: FileSystemItem[];
  viewType: CardVariant;
  onItemClick: (id: string, event: React.MouseEvent<HTMLDivElement>) => void;
  onItemOpen?: (id: string) => void;
}

export function CardGrid({ items, viewType, onItemClick, onItemOpen }: CardGridProps) {
  // Helper function to handle item opening via double click
  const handleOpen = (id: string) => {
    if (onItemOpen) {
      onItemOpen(id);
    }
  };

  return (
    <div
      className={`grid ${
        viewType === "large"
          ? "grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(13.5rem,1fr))] gap-4 md:gap-6"
          : viewType === "compact"
          ? "grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4 md:gap-6"
          : "grid-cols-1 gap-0.5"
      }`}
    >
      {items.map((item, i) => (
        <DraggableFolderCard
          key={item.id}
          item={item}
          variant={viewType}
          alternateBg={viewType === "list" && i % 2 !== 0}
          onClick={(e) => onItemClick(item.id, e)}
          onOpen={() => handleOpen(item.id)}
        />
      ))}
    </div>
  );
}