import AdminAppSidebar from "@/components/nav/admin-app-sidebar";
import { AdminNavUser } from "@/components/nav/admin-nav-user";

function AdminSiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md flex h-(--header-height) w-full flex-1 items-center gap-3.5 px-4 md:px-6 border-b">
      <AdminAppSidebar />
      <AdminNavUser />
    </header>
  );
}

export default AdminSiteHeader;
