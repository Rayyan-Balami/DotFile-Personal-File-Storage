import DirectoryView from '@/components/views/DirectoryView';
import { useFolderContents } from '@/api/folder/folder.query';
import { createFileRoute } from '@tanstack/react-router';

// When we go inside a folder we use a dynamic route
export const Route = createFileRoute('/(user)/folder/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams();
  const { data } = useFolderContents(id);
  const folderContents = data?.data?.folderContents;
  
  // Sort items by name
  const sortedItems = [...(folderContents?.folders || []), ...(folderContents?.files || [])].sort((a, b) => {
    if (!a.name || !b.name) return 0;
    return a.name.localeCompare(b.name);
  });

  return (
    <DirectoryView 
      items={sortedItems} 
      directoryName={folderContents?.pathSegments?.[folderContents.pathSegments.length - 1]?.name || 'Loading...'}
      currentPath={`/folder/${id}`}
    />
  );
}