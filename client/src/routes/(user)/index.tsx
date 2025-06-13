import { useRootContents } from "@/api/folder/folder.query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";

const DirectoryView = lazy(() => import("@/components/views/DirectoryView"));

// When we open our website this is the root directory
export const Route = createFileRoute("/(user)/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isLoading } = useRootContents();
  const folderContents = data?.data?.folderContents;

  // Sort items by name before passing to DirectoryView
  const sortedItems = [
    ...(folderContents?.folders || []),
    ...(folderContents?.files || []),
  ].sort((a, b) => {
    if (!a.name || !b.name) return 0;
    return a.name.localeCompare(b.name);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <DirectoryView
          items={sortedItems}
          directoryName="My Drive"
          parentId={null}
        />
      </Suspense>
    </>
  );
}
