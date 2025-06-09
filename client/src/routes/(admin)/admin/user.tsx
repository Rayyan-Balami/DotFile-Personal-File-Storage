import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const AdminUserTable = lazy(() => import('@/components/tables/AdminManageUserTable'))

export const Route = createFileRoute('/(admin)/admin/user')({
  component: AdminUserTable,
})



