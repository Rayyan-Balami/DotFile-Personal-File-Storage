import { useAuthStore } from "@/stores/authStore";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();

    if (!isAuthenticated) {
      throw redirect({
        to: "/login",
        replace: true,
      });
    }
  },
  component: Dashboard,
});

function RouteComponent() {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <Outlet />
    </main>
  );
}


import { SectionCards } from "@/components/cards/SectionCards";
import { ChartAreaInteractive } from "@/components/cards/ChartAreaInteractive";
import SiteAdminHeader from "@/components/header/site-admin-header";

export const description =
  "An application shell with a header and main content area. The header has a navbar, a search input and and a user nav dropdown. The user nav is toggled by a button with an avatar image.";

export function Dashboard() {
  return (
    <>
    <SiteAdminHeader />
        <main className="flex flex-1 flex-col gap-4 md:gap-6 p-4 md:p-6">
          <SectionCards />
          <ChartAreaInteractive />
        </main>
    </>
  );
}
