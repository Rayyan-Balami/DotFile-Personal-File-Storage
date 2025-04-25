import { createFileRoute } from '@tanstack/react-router'

// index.tsx is responsible for showing recent folders / Documents
export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div className='flex-1'>Hello "/recent"!</div>
}
