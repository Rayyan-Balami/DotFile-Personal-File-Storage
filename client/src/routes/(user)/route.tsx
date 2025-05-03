import { AppSidebar } from "@/components/app-sidebar";
import { FileSystemDndProvider } from "@/components/dnd/FileSystemDndContext";
import { SiteFooter } from "@/components/footer/site-footer";
import { SiteHeader } from "@/components/header/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import dummyData from "@/data/dummyData.json";
import { initializeFileSystem } from "@/store/useFileSystemStore";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";

export const Route = createFileRoute('/(user)')({
  component: RouteComponent,
})

function RouteComponent() {
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
    <SidebarProvider>
      <FileSystemDndProvider>
          <AppSidebar />
          <SidebarInset className="sidebar-container">
            <SiteHeader />
            <Outlet /> {/* Render the current route component here */}
            <SiteFooter />
          </SidebarInset>
      </FileSystemDndProvider>
      {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools position="top-right" />}
    </SidebarProvider>
  );
}
