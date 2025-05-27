import DirectoryView from '@/components/views/DirectoryView';
import { useTrashContents } from '@/api/folder/folder.query';
import { createFileRoute } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

// When we open our website this is the root directory
export const Route = createFileRoute('/(user)/trash')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isLoading, error } = useTrashContents();
  
  console.log('Trash Data:', data);
  console.log('Trash Error:', error);
  
  // Access the data structure correctly
  const folderContents = data?.data?.folderContents;
  console.log('Folder Contents:', folderContents);
  
  // Sort items by name before passing to DirectoryView
  const sortedItems = [...(folderContents?.folders || []), ...(folderContents?.files || [])].sort((a, b) => {
    if (!a.name || !b.name) return 0;
    return a.name.localeCompare(b.name);
  });
  
  console.log('Sorted Items:', sortedItems);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        Error loading trash contents
      </div>
    );
  }

  return (
    <>
      <DirectoryView 
        items={sortedItems} 
        directoryName="Trash" 
        parentId={null}
        showTrashActions={true}
      />
    </>
  );
}
