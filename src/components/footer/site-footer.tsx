import { DeskOptions } from "@/components/header/desk-options";
import { MoreOptions } from "@/components/header/more-options";
import { ShareOptions } from "@/components/header/share-options";
import { SortOptions } from "@/components/header/sort-options";
import { ViewOptions } from "@/components/header/view-options";
import { SearchForm } from "@/components/search-form";
import { Menubar } from "@radix-ui/react-menubar";

export function SiteFooter() {
  return (
    <footer className="bg-background/80 backdrop-blur-md sticky bottom-0 z-50 border-t">
      <nav className="flex h-(--footer-height) w-full flex-1 items-center gap-3.5 px-4">
        <ViewOptions />
        <SearchForm />
        <Menubar className="p-0 border-none gap-0 shadow-none flex flex-row">
          <SortOptions />
          <DeskOptions />
          <MoreOptions />
        </Menubar>
        <ShareOptions />
      </nav>
    </footer>
  );
}
