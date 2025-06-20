import { ChevronsUpDown, LogOut, Settings2 } from "lucide-react";

import { useLogout } from "@/api/user/user.query";
import { ModeToggle } from "@/components/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { VITE_API_URL } from "@/config/constants";
import { useAuthStore } from "@/stores/authStore";
import { getErrorMessage } from "@/utils/apiErrorHandler";
import { formatFileSize } from "@/utils/formatUtils";
import { getInitials } from "@/utils/getInitials";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export function NavUser() {
  const { user, clearAuth } = useAuthStore();
  const { isTablet } = useSidebar();
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
      toast.error(getErrorMessage(error));
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
            tooltip={"You"}
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground [&>svg]:size-4"
          >
            <Avatar className="h-8 w-8 rounded-lg border">
              <AvatarImage
                src={`${VITE_API_URL}${user.avatar}`}
                alt={user.name}
              />
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium capitalize">
                {user.name}
              </span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <ChevronsUpDown className="ml-auto" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className={`w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg ${isTablet ? "" : "mt-4"}`}
          side={isTablet ? "bottom" : "right"}
          align="end"
          sideOffset={4}
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-2 py-1.5 text-left text-sm">
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  src={`${VITE_API_URL}${user.avatar}`}
                  alt={user.name}
                />
                <AvatarFallback className="rounded-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />
          {/* Users storage usage */}
          <DropdownMenuLabel className="font-normal flex items-center justify-between gap-2">
            <span>Storage</span>
            <Badge
              variant={"secondary"}
              className="truncate h-6 rounded-full text-xs font-normal"
            >
              {((user.storageUsed / user.maxStorageLimit) * 100).toFixed(0)}%
              used
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuLabel className="font-normal flex flex-col justify-between gap-2.5 ">
            {/* progress bar */}
            <Progress
              value={Math.round(
                (user.storageUsed / user.maxStorageLimit) * 100
              )}
            />
            <span className="font-light text-xs">
              {formatFileSize(user.storageUsed)} of{" "}
              {formatFileSize(user.maxStorageLimit)}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="font-normal flex items-center justify-between gap-2">
            <span>Theme</span>
            <ModeToggle />
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link to="/setting/profile" className="flex items-center gap-2">
                <Settings2 className="mr-1 h-4 w-4" />
                Settings
              </Link>
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
  );
}
