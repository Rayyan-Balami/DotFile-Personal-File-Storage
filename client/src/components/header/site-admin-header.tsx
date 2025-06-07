import { Search } from "lucide-react";

import { AdminNavUser } from "@/components/nav/admin-nav-user";
import AdminAppSidebar from "@/components/nav/admin-app-sidebar";
import { Input } from "@/components/ui/input";

function AdminSiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md flex h-(--header-height) w-full flex-1 items-center gap-3.5 px-4 md:px-6 border-b">
      <AdminAppSidebar />
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <form className="ml-auto flex-1 sm:flex-initial">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
            />
          </div>
        </form>
        <AdminNavUser />
      </div>
    </header>
  );
}

export default AdminSiteHeader;