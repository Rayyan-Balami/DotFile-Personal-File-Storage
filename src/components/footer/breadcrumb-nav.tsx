import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function BreadcrumbNav() {
  return (
    <Breadcrumb className="hidden sm:block bg-background flex-grow shrink-0 bg-secondary h-9 px-4 py-2 rounded-md">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">
            <Home className="size-4" />
            <span className="sr-only">Files</span>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Data Fetching</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
