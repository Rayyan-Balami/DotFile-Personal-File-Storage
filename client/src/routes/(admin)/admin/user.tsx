import DemoPage from '@/components/data-table/AdminUserTable'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(admin)/admin/user')({
  component: DemoPage,
})



