import { createRootRoute, Outlet } from "@tanstack/react-router";
import ErrorBoundary from "../components/ErrorBoundary";
import { NotFound } from "../components/NotFound";
import { Toaster } from "@/components/ui/sonner"


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