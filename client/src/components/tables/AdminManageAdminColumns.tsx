"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Edit, Trash2, RotateCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DataTableColumnHeader } from "@/components/data-table/DataTableColumnHeader";
import { User } from "@/types/user";
import { getInitials } from "@/utils/getInitials";
import { VITE_API_URL } from "@/config/constants";

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
      <DataTableColumnHeader column={column} title="Admin" />
    ),
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8 border">
            <AvatarImage src={`${VITE_API_URL}${user.avatar}`} alt={user.name} />
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
      <Badge variant={"outline"}>{row.getValue("role")}</Badge>
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
          className={
            deletedAt
              ? "bg-orange-100 border-orange-500 text-orange-800"
              : "bg-green-100 border-green-500 text-green-800"
          }
        >
          {deletedAt ? "Soft Deleted" : "Active"}
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

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(user.id)}
            >
              Copy admin ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            {!isDeleted ? (
              <>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit admin
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete admin
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore admin
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
