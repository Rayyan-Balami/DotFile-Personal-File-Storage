import { useAuthStore } from "@/stores/authStore";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)")({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();

    if (isAuthenticated) {
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
    <main className="grid min-h-svh lg:grid-cols-2">
      <Outlet />
    </main>
  );
}
