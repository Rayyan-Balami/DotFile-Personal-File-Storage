import { createRootRoute, Outlet } from "@tanstack/react-router";
import ErrorBoundary from "../components/ErrorBoundary";
import { NotFound, Illustration } from "../components/NotFound";
import { Toaster } from "sonner";

// Custom NotFoundPage wrapper combining the components
function NotFoundPage() {
  return (
    <div className="relative flex flex-col w-full justify-center min-h-svh bg-background p-6 md:p-10">
      <div className="relative max-w-5xl mx-auto w-full">
        <Illustration className="absolute inset-0 w-full h-[50vh] opacity-[0.04] dark:opacity-[0.08] text-foreground" />
        <NotFound
          title="Oops! Page not found"
          description="Hey explorer, it seems like you have ventured into uncharted territory."
        />
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundPage
})

function RootComponent() {
  return (
    <ErrorBoundary>
      <Outlet />
      <Toaster />
    </ErrorBoundary>
  );
}