import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(admin)/admin/user')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/user"!</div>
}
