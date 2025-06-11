import AdminEditUserProfile from '@/components/profile/AdminEditUserProfile'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(admin)/admin/$id/edit')({
  component: AdminEditUserProfile,
})
