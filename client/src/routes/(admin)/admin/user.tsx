import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const AdminUserTable = lazy(() => import('@/components/data-table/AdminUserTable'))

export const Route = createFileRoute('/(admin)/admin/user')({
  component: AdminUserTable,
})



