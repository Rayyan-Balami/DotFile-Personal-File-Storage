import { DraggableFolderCard } from "@/components/cards/DraggableFolderCard";
import { CardVariant } from "@/components/cards/FolderDocumentCard";

interface CardGridProps {
  items: any[];
  viewType: CardVariant;
  users: any[];
  onOpen: (id: string) => void;
}

export function CardGrid({ items, viewType, users, onOpen }: CardGridProps) {
  return (
    <div
      className={`grid ${
        viewType === "large"
          ? "grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4 md:gap-6"
          : viewType === "compact"
          ? "grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4 md:gap-6"
          : "grid-cols-1 gap-0.5"
      }`}
    >
      {items.map((item, i) => (
        <DraggableFolderCard
          key={item.id}
          id={item.id}
          variant={viewType}
          alternateBg={viewType === "list" && i % 2 !== 0}
          type={item.type}
          color={item.color ?? "default"}
          title={item.title}
          childCount={item.type === 'folder' ? item.childCount : undefined}
          byteCount={item.type === 'document' ? item.byteCount : undefined}
          users={users}
          isPinned={item.id.includes("-2")}
          fileExtension={item.fileExtension || "pdf"}
          previewUrl={item.previewUrl}
          onOpen={() => onOpen(item.id)}
        />
      ))}
    </div>
  );
}