import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

const AdminManageAdminTable = lazy(() => import('@/components/tables/AdminManageAdminTable'))

export const Route = createFileRoute('/(admin)/admin/admin')({
  component: AdminManageAdminTable,
})
