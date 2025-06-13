import { useSearchContents } from "@/api/folder/folder.query";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchStore } from "@/stores/useSearchStore";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo } from "react";

const DirectoryView = lazy(() => import("@/components/views/DirectoryView"));

export const Route = createFileRoute("/(user)/search")({
  component: RouteComponent,
});

function RouteComponent() {
  const { query, filters, setIsSearching } = useSearchStore();

  // Debounce search to avoid too many API calls
  const debouncedQuery = useDebounce(query, 300);
  const debouncedFilters = useDebounce(filters, 500);

  // Prepare search parameters
  const searchParams = useMemo(
    () => ({
      query: debouncedQuery,
      itemType: debouncedFilters.itemType,
      fileTypes: debouncedFilters.fileType,
      location: debouncedFilters.location,
      isPinned: debouncedFilters.isPinned,
      dateFrom: debouncedFilters.dateRange.from?.toISOString(),
      dateTo: debouncedFilters.dateRange.to?.toISOString(),
    }),
    [debouncedQuery, debouncedFilters]
  );

  // Fetch search results
  const { data, isLoading, error } = useSearchContents(searchParams);

  // Update searching state
  useEffect(() => {
    setIsSearching(isLoading);
  }, [isLoading, setIsSearching]);

  const searchResults = data?.data?.folderContents;
  const sortedItems = useMemo(() => {
    if (!searchResults) return [];
    return [
      ...(searchResults.folders || []),
      ...(searchResults.files || []),
    ].sort((a, b) => {
      if (!a.name || !b.name) return 0;
      return a.name.localeCompare(b.name);
    });
  }, [searchResults]);

  // Check if we should show search prompt
  const shouldShowPrompt =
    !debouncedQuery.trim() &&
    debouncedFilters.itemType === "all" &&
    debouncedFilters.fileType.length === 0 &&
    !debouncedFilters.dateRange.from &&
    !debouncedFilters.dateRange.to &&
    !debouncedFilters.isPinned &&
    debouncedFilters.location === "myDrive";

  // Handle different states
  if (shouldShowPrompt) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
        <div className="max-w-md">
          <h2 className="text-2xl font-semibold mb-4">Search your files</h2>
          <p className="text-sm">
            Enter a search term or apply filters to find your files and folders.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Searching...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-destructive">
          <h2 className="text-lg font-semibold mb-2">Search Error</h2>
          <p className="text-sm">Failed to search. Please try again.</p>
        </div>
      </div>
    );
  }

  const searchTitle = debouncedQuery
    ? `Search results for "${debouncedQuery}"`
    : "Filtered results";

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <DirectoryView
        items={sortedItems}
        directoryName={searchTitle}
        parentId={null}
      />
    </Suspense>
  );
}
