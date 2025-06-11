"use client";

import { DataTableColumnHeader } from "@/components/data-table/DataTableColumnHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VITE_API_URL } from "@/config/constants";
import { useAuthStore } from "@/stores/authStore";
import { useDialogStore } from "@/stores/useDialogStore";
import { User } from "@/types/user";
import { getInitials } from "@/utils/getInitials";
import { Link } from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";
import {
  Copy,
  Delete,
  Edit3,
  MoreHorizontal,
  Redo,
  Trash2
} from "lucide-react";

type AccountActionType = "soft-delete" | "restore" | "permanent-delete";

export const AdminManageAdminColumns: ColumnDef<User>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="User" />
    ),
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8 border">
            <AvatarImage
              src={`${VITE_API_URL}${user.avatar}`}
              alt={user.name}
            />
            <AvatarFallback className="text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Role" />
    ),
    cell: ({ row }) => (
      <Badge variant={"outline"} className="capitalize">
        {row.getValue("role")}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Join Date" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return (
        <div className="text-sm">
          {date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      );
    },
  },
  {
    accessorKey: "deletedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const deletedAt = row.getValue("deletedAt");
      return (
        <Badge
          className={`border capitalize ${
            deletedAt
              ? "bg-orange-100 border-orange-500 text-orange-800"
              : "bg-green-100 border-green-500 text-green-800"
          }`}
        >
          {deletedAt ? "soft Deleted" : "active"}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      if (!value) return true; // Show all when no filter
      const deletedAt = row.getValue(id);
      if (value === "active") return !deletedAt;
      if (value === "deleted") return !!deletedAt;
      return true;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const user = row.original;
      const isDeleted = !!user.deletedAt;
      const currentUser = useAuthStore((state) => state.user);
      const isCurrentUser = currentUser?.id === user.id;
      const { openAccountActionDialog } = useDialogStore();

      const handleAction = (type: AccountActionType) => {
        openAccountActionDialog(user, type, "admin");
      };

      return (
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(user.id)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Admin ID
              </DropdownMenuItem>
              {isCurrentUser ? (
                <DropdownMenuItem asChild>
                  <Link to={`/admin/setting/profile`}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Your Profile
                  </Link>
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuSeparator />
                  {isDeleted ? (
                    <>
                      <DropdownMenuItem 
                        onClick={() => handleAction("restore")}
                        className="text-green-600 focus:text-green-600 focus:bg-green-700/20"
                      >
                        <Redo className="text-green-600 mr-2 h-4 w-4" />
                        Restore Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAction("permanent-delete")}
                        className="text-red-600 focus:text-red-600 focus:bg-red-700/20"
                      >
                        <Trash2 className="text-red-600 mr-2 h-4 w-4" />
                        Permanently Delete Admin
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/$id/edit" params={{ id: user.id }}>
                          <Edit3 className="mr-2 h-4 w-4" />
                          Edit Admin
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleAction("soft-delete")}
                        className="text-yellow-600 focus:text-yellow-600 focus:bg-yellow-700/20"
                      >
                        <Delete className="text-yellow-600 mr-2 h-4 w-4" />
                        Soft Delete Admin
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
