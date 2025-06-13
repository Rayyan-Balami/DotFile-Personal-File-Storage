import { AccountActionDialog } from "@/components/dialogs/AccountActionDialog";
import SiteAdminHeader from "@/components/header/site-admin-header";
import { useAuthStore } from "@/stores/authStore";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)")({
  beforeLoad: () => {
    const { isAuthenticated, isAdmin } = useAuthStore.getState();

    if (!isAuthenticated) {
      throw redirect({
        to: "/login",
        replace: true,
      });
    }

    if (!isAdmin) {
      throw redirect({
        to: "/",
        replace: true,
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <SiteAdminHeader />
      <main className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6">
        <Outlet />
      </main>
      <AccountActionDialog />
    </>
  );
}
