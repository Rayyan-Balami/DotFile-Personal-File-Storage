import ErrorBoundary from "@/components/ErrorBoundary";
import { NotFound } from "@/components/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { createRootRoute, Outlet } from "@tanstack/react-router";


export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound
})

function RootComponent() {
  return (
    <ErrorBoundary>
      <Outlet />
      <Toaster />
    </ErrorBoundary>
  );
}