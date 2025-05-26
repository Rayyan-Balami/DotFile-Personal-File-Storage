import DirectoryView from '@/components/views/DirectoryView';
import { useRootContents } from '@/api/folder/folder.query';
import { createFileRoute } from '@tanstack/react-router';

// When we open our website this is the root directory
export const Route = createFileRoute('/(user)/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = useRootContents();
  const folderContents = data?.data?.folderContents;
  
  // Sort items by name before passing to DirectoryView
  const sortedItems = [...(folderContents?.folders || []), ...(folderContents?.files || [])].sort((a, b) => {
    if (!a.name || !b.name) return 0;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <DirectoryView 
        items={sortedItems} 
        directoryName="My Drive" 
        parentId={null}
      />
    </>
  );
}
