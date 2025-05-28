import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(user)/recent')({
  component: About,
})

function About() {
  return <div>Hello "/about"!</div>
}
