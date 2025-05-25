import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  LogOut,
  Sparkles
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar"
import { ModeToggle } from "./mode-toggle"
import { useAuthStore } from "@/stores/authStore"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { useLogout } from "@/api/user/user.query"
import { getInitials } from "@/lib/utils"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"
import { VITE_API_URL } from "@/config/constants"
import { formatBytes } from "@/lib/utils"

export function NavUser() {
  const { user, clearAuth } = useAuthStore();
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const logout = useLogout();

  // Handle logout function
  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      clearAuth();
      toast.success("Logged out successfully");
      navigate({ to: "/login" });
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout. Please try again.");
      // Still clear auth in case API fails but we want to logout anyway
      clearAuth();
      navigate({ to: "/login" });
    }
  };

  // If no user is authenticated, don't render the component
  if (!user) return null;

  // Get user initials for avatar fallback
  const initials = getInitials(user.name);

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            tooltip={"Your Account"}
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={`${VITE_API_URL}${user.avatar}`}
               alt={user.name} />
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className={`w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg ${isMobile ? "" : "mt-4"}`}
          side={isMobile ? "bottom" : "right"}
          align="end"
          sideOffset={4}
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-2 py-1.5 text-left text-sm">
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
              </div>
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={`${VITE_API_URL}${user.avatar}`} alt={user.name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />
          {/* Users storage usage */}
          <DropdownMenuLabel className="font-normal flex items-center justify-between gap-2">
            <span>Storage</span>
            <Badge variant={"secondary"} className="truncate h-6 rounded-full text-xs font-normal">
              {((user.storageUsed / user.maxStorageLimit) * 100).toFixed(0)}% used
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuLabel className="font-normal flex flex-col justify-between gap-2.5 ">
            {/* progress bar */}
            <Progress value={Math.round((user.storageUsed / user.maxStorageLimit) * 100)} />
            <span className="font-light text-xs">
              {formatBytes(user.storageUsed)} of {formatBytes(user.maxStorageLimit)}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="font-normal flex items-center justify-between gap-2">
            <span>Theme</span>
            <ModeToggle />
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <BadgeCheck className="mr-1 h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-1 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}
