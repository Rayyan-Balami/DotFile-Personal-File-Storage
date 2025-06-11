"use client";

import {
  useBulkPermanentDeleteUsers,
  useBulkRestoreUsers,
  useBulkSoftDeleteUsers,
} from "@/api/user/user.query";
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
import { Progress } from "@/components/ui/progress";
import { VITE_API_URL } from "@/config/constants";
import { User } from "@/types/user";
import { getErrorMessage } from "@/utils/apiErrorHandler";
import { formatFileSize } from "@/utils/formatUtils";
import { getInitials } from "@/utils/getInitials";
import { ColumnDef } from "@tanstack/react-table";
import {
  Copy,
  Delete,
  Edit3,
  Eye,
  MoreHorizontal,
  Redo,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

export const AdminManageUserColumns: ColumnDef<User>[] = [
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
      <Badge variant={"outline"} className="capitalize">{row.getValue("role")}</Badge>
    ),
  },
  {
    accessorKey: "storageUsed",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Storage Usage" />
    ),
    cell: ({ row }) => {
      const user = row.original;
      const usagePercentage = (user.storageUsed / user.maxStorageLimit) * 100;

      return (
        <div className="space-y-1">
          <div className="text-sm">
            {formatFileSize(user.storageUsed)} /{" "}
            {formatFileSize(user.maxStorageLimit)}
          </div>
          <Progress
            value={Math.min(usagePercentage, 100)}
            className="w-full h-2"
          />
          <div className="text-xs text-muted-foreground">
            {usagePercentage.toFixed(1)}% used
          </div>
        </div>
      );
    },
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

      // Mutation hooks for individual operations (using bulk with single user)
      const bulkSoftDeleteMutation = useBulkSoftDeleteUsers();
      const bulkRestoreMutation = useBulkRestoreUsers();
      const bulkPermanentDeleteMutation = useBulkPermanentDeleteUsers();

      // Handle individual operations using bulk endpoints with single user array
      const handleSoftDelete = async () => {
        try {
          const result = await bulkSoftDeleteMutation.mutateAsync([user.id]);
          const { summary } = result.data;

          if (summary.successful > 0) {
            toast.success("User soft deleted successfully");
          } else if (summary.failed > 0) {
            toast.error("Failed to soft delete user");
          }
        } catch (error) {
          toast.error(getErrorMessage(error));
        }
      };

      const handleRestore = async () => {
        try {
          const result = await bulkRestoreMutation.mutateAsync([user.id]);
          const { summary } = result.data;

          if (summary.successful > 0) {
            toast.success("User restored successfully");
          } else if (summary.failed > 0) {
            toast.error("Failed to restore user");
          }
        } catch (error) {
          toast.error(getErrorMessage(error));
        }
      };

      const handlePermanentDelete = async () => {
        try {
          const result = await bulkPermanentDeleteMutation.mutateAsync([user.id]);
          const { summary } = result.data;

          if (summary.successful > 0) {
            toast.success("User permanently deleted successfully");
          } else if (summary.failed > 0) {
            toast.error("Failed to permanently delete user");
          }
        } catch (error) {
          toast.error(getErrorMessage(error));
        }
      };

      return (
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
              Copy User ID
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {!isDeleted ? (
              <>
                <DropdownMenuItem>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit User
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSoftDelete} className="text-yellow-600 focus:text-yellow-600 focus:bg-yellow-700/20">
                  <Delete className="text-yellow-600 mr-2 h-4 w-4" />
                  Soft Delete User
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={handleRestore} className="text-green-600 focus:text-green-600 focus:bg-green-700/20">
                  <Redo className="text-green-600 mr-2 h-4 w-4" />
                  Restore User
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600 focus:bg-red-700/20"
                  onClick={handlePermanentDelete}
                >
                  <Trash2 className="text-red-600 mr-2 h-4 w-4" />
                  Permanently Delete User
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
