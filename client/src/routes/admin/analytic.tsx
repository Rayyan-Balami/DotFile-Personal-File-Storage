import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/analytic')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/analytic"!</div>
}
