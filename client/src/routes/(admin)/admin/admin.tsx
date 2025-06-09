import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(admin)/admin/admin')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(admin)/admin/admin"!</div>
}
