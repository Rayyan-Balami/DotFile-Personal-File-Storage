import DirectoryView from '@/components/views/DirectoryView';
import { createFileRoute } from '@tanstack/react-router';
import dummyData from '@/data/dummyData.json';

// When we open our website this is the root directory
export const Route = createFileRoute('/')({
  component: RouteComponent,
  loader: async () => {
    // Get the root directory data (folders and files)
    const rootItems = dummyData.rootItems.map(id => dummyData.items[id]);
    return {
      items: rootItems,
      currentPath: '/',
      directoryName: 'Root Directory'
    };
  }
})

function RouteComponent() {
  const { items, currentPath, directoryName } = Route.useLoaderData();
  return <DirectoryView items={items} currentPath={currentPath} directoryName={directoryName} />;
}
