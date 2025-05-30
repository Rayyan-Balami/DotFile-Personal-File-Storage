import { BreadcrumbNav } from "@/components/header/breadcrumb-nav";
import { NavigationControls } from "@/components/header/navigation-controls";

export function SiteHeader() {
  return (
    <header className="bg-background/80 backdrop-blur-md sticky top-0 z-[99]">
      <nav className="flex h-(--header-height) w-full flex-1 items-center gap-3.5 p-4">
        <NavigationControls />
        <BreadcrumbNav />
      </nav>
    </header>
  );
}
