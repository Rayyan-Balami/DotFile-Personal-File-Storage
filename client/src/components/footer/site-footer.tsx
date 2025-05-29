import { SortOptions } from "@/components/footer/sort-options";
import { Uploads } from "@/components/footer/uploads";
import { ViewOptions } from "@/components/footer/view-options";
import { SearchForm } from "@/components/search-form";
import { ButtonGroup } from "@/components/ui/button-group";
import GlobalMove from "./global-move";
import { GlobalDelete } from "./global-delete";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-background/80 backdrop-blur-md sticky bottom-0 z-50 border-t transition-[height]">
      <Uploads />
      <nav className="flex h-(--footer-height) items-center gap-3.5 px-4">
        <ViewOptions />
        <SearchForm />
          <ButtonGroup orientation="horizontal" className="*:border">
            <SortOptions />
            <GlobalDelete />
            <GlobalMove />
          </ButtonGroup>
      </nav>
    </footer>
  );
}
