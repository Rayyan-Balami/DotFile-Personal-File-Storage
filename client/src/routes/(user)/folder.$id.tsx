import DirectoryView from '@/components/views/DirectoryView';
import { useFolderContents } from '@/api/folder/folder.query';
import { createFileRoute } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useFolderById } from '@/api/folder/folder.query';
import { useFileSystemStore } from '@/stores/useFileSystemStore';
import { useEffect } from 'react';

// When we go inside a folder we use a dynamic route
export const Route = createFileRoute('/(user)/folder/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams();
  const { data: folderData } = useFolderById(id);
  const isDeletedFolder = folderData?.data?.folder?.deletedAt != null;
  const hasDeletedAncestor = folderData?.data?.folder?.hasDeletedAncestor;
  const { data, isLoading } = useFolderContents(id, { includeDeleted: isDeletedFolder || hasDeletedAncestor });
  const folderContents = data?.data?.folderContents;
  const setFolderReadOnly = useFileSystemStore(state => state.setFolderReadOnly);
  const isFolderReadOnly = useFileSystemStore(state => state.isFolderReadOnly(id));
  
  useEffect(() => {
    setFolderReadOnly(id, isDeletedFolder || hasDeletedAncestor || false);
  }, [id, isDeletedFolder, hasDeletedAncestor, setFolderReadOnly]);

  // Sort items by name
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
      directoryName={folderContents?.pathSegments?.[folderContents.pathSegments.length - 1]?.name || 'Loading...'}
      currentPath={`/folder/${id}`}
      parentId={id}
    />
  );
}