"use client";

import { useGetAllUsers } from "@/api/user/user.query";
import { User } from "@/types/user";
import { DataTable } from "./data-table";
import { userColumns } from "./userColumns";
import { userFilterOptions, userSearchColumns } from "./userTableConfig";

interface AdminUserTableProps {
  includeDeleted?: boolean;
}

export default function AdminUserTable({ includeDeleted = false }: AdminUserTableProps) {
  // TODO: Use includeDeleted parameter when implementing deleted users filter
  const { data, isLoading, error } = useGetAllUsers();
  
  // Suppress unused variable warning for future feature
  void includeDeleted;

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading users...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-destructive">Failed to load users</div>
        </div>
      </div>
    );
  }

  const users: User[] = data?.data?.users || [];

  return (
      <DataTable 
        columns={userColumns} 
        data={users} 
        filterColumn="name"
        filterPlaceholder="Filter users..."
        filters={userFilterOptions}
        searchColumns={userSearchColumns}
      />
  );
}