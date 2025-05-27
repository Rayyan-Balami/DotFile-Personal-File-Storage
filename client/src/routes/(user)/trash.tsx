import DirectoryView from '@/components/views/DirectoryView';
import { useTrashContents } from '@/api/folder/folder.query';
import { createFileRoute } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/(user)/trash')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isLoading } = useTrashContents();
  const folderContents = data?.data?.folderContents;

  const sortedItems = [...(folderContents?.folders || []), ...(folderContents?.files || [])].sort((a, b) => {
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
    <DirectoryView 
      items={sortedItems} 
      directoryName="Trash" 
      parentId={null}
      showTrashActions={true}
    />
  );
}
