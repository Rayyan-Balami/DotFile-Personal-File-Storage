import AdminProfile from '@/components/profile/AdminProfile'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(admin)/admin/setting/profile')({
  component: AdminProfile,
})
