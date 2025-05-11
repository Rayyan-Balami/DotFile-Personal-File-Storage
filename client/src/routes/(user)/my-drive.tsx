import DirectoryView from '@/components/views/DirectoryView';
import { createFileRoute } from '@tanstack/react-router';
import dummyData from '@/data/dummyData.json';
import { initializeFileSystem, useFileSystemStore } from '@/stores/useFileSystemStore';
import { useEffect } from 'react';

// When we open our website this is the root directory
export const Route = createFileRoute('/(user)/my-drive')({
  component: RouteComponent,
  loader: async () => {
    // Initialize file system with our dummy data
    initializeFileSystem(dummyData);
    
    // Get root items from the dummy data
    const { folders = [], files = [] } = dummyData.data.folderContents;
    const rootFolders = folders.filter(folder => folder.parent === null);
    const rootFiles = files.filter(file => file.folder === null);
    
    // Combined root items
    const rootItems = [...rootFolders, ...rootFiles];
    
    // Sort items by name instead of title to avoid errors
    rootItems.sort((a, b) => {
      if (!a.name || !b.name) return 0;
      return a.name.localeCompare(b.name);
    });
    
    return {
      items: rootItems,
      currentPath: '/',
      directoryName: 'My Drive',
    };
  }
})

function RouteComponent() {
  const { items, currentPath, directoryName } = Route.useLoaderData();
  
  // Make sure file system is initialized
  useEffect(() => {
    initializeFileSystem(dummyData);
  }, []);
  
  return <DirectoryView items={items} currentPath={currentPath} directoryName={directoryName} />;
}
