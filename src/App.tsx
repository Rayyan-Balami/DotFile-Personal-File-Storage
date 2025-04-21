import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/header/site-header";
import { SidebarFooter, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import FolderDocumentCard from "./components/cards/FolderDocumnetCard";
import { SiteFooter } from "./components/footer/site-footer";
import { useEffect } from "react";
import { SelectableItem, useSelectionStore } from "./store/useSelectionStore";

export default function Page() {
  // Sample data with unique IDs
  const cardData = [
    // Folders
    {
      id: "folder-1",
      type: "folder" as const,
      color: "default",
      title: "Project Assets",
      itemCount: 12,
      previewUrl: "",
    },
    {
      id: "folder-2",
      type: "folder" as const,
      color: "blue",
      title: "Design Files",
      itemCount: 8,
      previewUrl: "",
    },
    // Documents without preview
    {
      id: "doc-1",
      type: "document" as const,
      title: "Financial Report.pdf",
      itemCount: 1,
      fileExtension: "doc",
      previewUrl: "",
    },
    {
      id: "doc-2",
      type: "document" as const,
      title: "Presentation.ppt",
      itemCount: 1,
      fileExtension: "pdf",
      previewUrl: "",
    },
    {
      id: "doc-3",
      type: "document" as const,
      title: "Spreadsheet.xlsx",
      itemCount: 1,
      fileExtension: "png",
      previewUrl: "",
    },
    // Documents with preview
    {
      id: "doc-4",
      type: "document" as const,
      title: "Product Photo.jpg",
      itemCount: 1,
      fileExtension: "jpg",
      previewUrl: "https://images.unsplash.com/photo-1741732311526-093a69d005d9?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHw0NHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: "doc-5",
      type: "document" as const,
      title: "Marketing Image.png",
      itemCount: 1,
      fileExtension: "png",
      previewUrl: "https://images.unsplash.com/photo-1682687982167-d7fb3ed8541d?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDF8MHxlZGl0b3JpYWwtZmVlZHwxfHx8ZW58MHx8fHx8",
    },
  ];

  const users = [
    { image: "https://github.com/shadcn.png", fallback: "CN" },
    { image: "https://github.com/shadcn.png", fallback: "CN" },
    { image: "https://github.com/shadcn.png", fallback: "CN" },
    { fallback: "+3" },
  ];

  const selectRange = useSelectionStore(state => state.selectRange);
  
  // Support for shift+click range selection
  useEffect(() => {
    selectRange(cardData as SelectableItem[]);
  }, [useSelectionStore(state => state.lastSelectedId)]);

  const handleOpen = (id: string) => {
    console.log(`Opening item with id: ${id}`);
  };

  return (
    <SidebarProvider className="flex flex-col">
      <div className="flex flex-1">
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <section className="flex flex-1 flex-col gap-4 p-4 md:p-6">
            {/* large folders section */}
            <section className="flex flex-1 flex-col gap-4">
              <h2 className="text-lg font-medium">Large</h2>
              <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4 lg:gap-6">
                {cardData.map((item) => (
                  <FolderDocumentCard
                    key={item.id}
                    id={item.id}
                    variant="large"
                    type={item.type}
                    color={item.color ?? "default"}
                    title={item.title}
                    itemCount={item.itemCount}
                    users={users}
                    isPinned={item.id.includes("-2")}
                    fileExtension={item.fileExtension || "pdf"}
                    previewUrl={item.previewUrl}
                    onOpen={() => handleOpen(item.id)}
                  />
                ))}
              </div>
            </section>
            
            {/* compact folders section */}
            <section className="flex flex-1 flex-col gap-4 mt-8">
              <h2 className="text-lg font-medium">Compact</h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4 lg:gap-6">
                {cardData.map((item) => (
                  <FolderDocumentCard
                    key={item.id}
                    id={item.id}
                    variant="compact"
                    type={item.type}
                    title={item.title}
                    itemCount={item.itemCount}
                    users={users}
                    isPinned={item.id.includes("-2")}
                    fileExtension={item.fileExtension || "pdf"}
                    previewUrl={item.previewUrl}
                    onOpen={() => handleOpen(item.id)}
                  />
                ))}
              </div>
            </section>
            
            {/* list folders section */}
            <section className="flex flex-1 flex-col gap-4 mt-8">
              <h2 className="text-lg font-medium">List</h2>
              <div className="grid">
                {cardData.map((item) => (
                  <FolderDocumentCard
                    key={item.id}
                    id={item.id}
                    variant="list"
                    type={item.type}
                    title={item.title}
                    itemCount={item.itemCount}
                    users={users}
                    isPinned={item.id.includes("-2")}
                    fileExtension={item.fileExtension || "pdf"}
                    alternateBg={parseInt(item.id.split("-")[1]) % 2 === 0}
                    previewUrl={item.previewUrl}
                    onOpen={() => handleOpen(item.id)}
                  />
                ))}
              </div>
            </section>
          </section>
          <SiteFooter />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
