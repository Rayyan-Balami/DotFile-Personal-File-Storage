import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Settings2 } from "lucide-react";

import { useLogout } from "@/api/user/user.query";
import { ModeToggle } from "@/components/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VITE_API_URL } from "@/config/constants";
import { getInitials } from "@/utils/getInitials";
import { useAuthStore } from "@/stores/authStore";
import { getErrorMessage } from "@/utils/apiErrorHandler";
import { toast } from "sonner";

export function AdminNavUser() {
  const { user, clearAuth } = useAuthStore();
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative size-8 p-0 rounded-full hover:bg-accent"
        >
          <Avatar className="size-8 rounded-full border">
            <AvatarImage
              src={user.avatar ? `${VITE_API_URL}${user.avatar}` : undefined}
              alt={user.name}
            />
            <AvatarFallback className="rounded-full text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">Open user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64 rounded-lg"
        align="end"
        sideOffset={4}
      >
        {/* User info header */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-2 py-1.5 text-left text-sm">
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            </div>
            <Avatar className="size-8 rounded-lg">
              <AvatarImage
                src={`${VITE_API_URL}${user.avatar}`}
                alt={user.name}
              />
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Role section */}
        <DropdownMenuLabel className="font-normal flex items-center justify-between gap-2">
          <span>Role</span>
          <Badge
            variant="outline"
            className="truncate h-6 rounded-full text-xs font-normal uppercase bg-muted"
          >
            {user.role}
          </Badge>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Theme toggle */}
        <DropdownMenuLabel className="font-normal flex items-center justify-between gap-2">
          <span>Theme</span>
          <ModeToggle />
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Settings and logout */}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/admin/setting/profile" className="flex items-center gap-2">
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
  );
}
