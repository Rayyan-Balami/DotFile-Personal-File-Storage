import DirectoryView from '@/components/views/DirectoryView';
import { createFileRoute } from '@tanstack/react-router';
import dummyData from '@/data/dummyData.json';

// When we go inside a folder we use a dynamic route
export const Route = createFileRoute('/folder/$id')({
  component: RouteComponent,
  loader: async ({ params }) => {
    // Get the folderId from the route params
    const folderId = params.id;
    
    if (!folderId || !dummyData.items[folderId] || dummyData.items[folderId].type !== 'folder') {
      throw new Error('Invalid folder ID');
    }
    
    const folderData = dummyData.items[folderId];
    const folderItems = folderData.children?.map(childId => dummyData.items[childId]) || [];
    
    return {
      items: folderItems,
      currentPath: `/folder/${folderId}`,
      directoryName: folderData.title,
      parentId: folderData.parentId
    };
  }
})

function RouteComponent() {
  const { items, currentPath, directoryName, parentId } = Route.useLoaderData();
  return <DirectoryView 
    items={items} 
    currentPath={currentPath} 
    directoryName={directoryName} 
    parentId={parentId}
  />;
}