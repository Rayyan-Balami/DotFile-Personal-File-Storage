import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <Outlet />
    </main>
  );
}
