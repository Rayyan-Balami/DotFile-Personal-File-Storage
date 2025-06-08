import { useRecentFiles } from '@/api/file/file.query';
import { createFileRoute } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { lazy, Suspense } from 'react';

const DirectoryView = lazy(() => import('@/components/views/DirectoryView'));

export const Route = createFileRoute('/(user)/recent')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isLoading } = useRecentFiles();
  const files = data?.data?.files || [];
  
  // Sort files by last modified date
  const sortedItems = [...files].sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
        directoryName="Recent" 
        parentId={null}
      />
    </Suspense>
  );
}
