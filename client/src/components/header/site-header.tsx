import { NavBreadcrumb } from "@/components/header/nav-breadcrumb";
import { NavigationControls } from "@/components/header/navigation-controls";

export function SiteHeader() {
  return (
    <header className="bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <nav className="flex h-(--header-height) w-full flex-1 items-center gap-3.5 p-4 overflow-hidden">
        <NavigationControls />
        <NavBreadcrumb />
      </nav>
    </header>
  );
}
