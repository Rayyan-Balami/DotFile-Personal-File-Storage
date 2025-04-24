import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useEffect } from "react";
import { SiteHeader } from "@/components/header/site-header";
import { SiteFooter } from "@/components/footer/site-footer";
import { FileSystemDndProvider } from "@/components/dnd/FileSystemDndContext";
import { initializeFileSystem } from "@/store/useFileSystemStore";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import dummyData from "@/data/dummyData.json";

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  useEffect(() => {
    // Disable right click to prevent browser context menu
    const disableRightClick = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", disableRightClick);
    return () => document.removeEventListener("contextmenu", disableRightClick);
  }, []);

  useEffect(() => {
    // Initialize file system with our JSON data
    initializeFileSystem(dummyData);
  }, []);

  return (
    <SidebarProvider className="flex flex-col">
      <FileSystemDndProvider>
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset className="sidebar-container">
            <SiteHeader />
            <Outlet /> {/* Render the current route component here */}
            <SiteFooter />
          </SidebarInset>
        </div>
      </FileSystemDndProvider>
      {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools />}
    </SidebarProvider>
  );
}