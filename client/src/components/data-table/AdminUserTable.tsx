"use client";

import { useGetUsersPaginated } from "@/api/user/user.query";
import { User } from "@/types/user";
import { DataTableServerSide } from "./DataTableServerSide";
import { userColumns } from "./userColumns";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useState } from "react";

interface AdminUserTableProps {
  includeDeleted?: boolean;
}

export default function AdminUserTable({
  includeDeleted = false,
}: AdminUserTableProps) {
  // State for server-side table operations
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>(
    []
  );
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [searchFields, setSearchFields] = useState<string[]>(["name", "email"]);

  // Build query parameters
  const queryParams = {
    page: pagination.pageIndex + 1, // Convert to 1-based indexing
    pageSize: pagination.pageSize,
    sortBy: sorting[0]?.id || "createdAt",
    sortOrder: (sorting[0]?.desc ? "desc" : "asc") as "desc" | "asc",
    search: search || undefined,
    searchFields: searchFields.length > 0 ? searchFields : undefined,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  };

  const { data, isLoading, error } = useGetUsersPaginated(queryParams);

  // Suppress unused variable warning for future feature
  void includeDeleted;

  // Handle search changes
  const handleSearchChange = (
    searchValue: string,
    searchColumns?: string[]
  ) => {
    setSearch(searchValue);
    if (searchColumns) {
      setSearchFields(searchColumns);
    }
    // Reset to first page when searching
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
    // Reset to first page when filtering
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-destructive">Failed to load users</div>
        </div>
      </div>
    );
  }
  const users: User[] = data?.data?.data || [];
  const paginationInfo = data?.data?.pagination;
  const totalCount = paginationInfo?.totalItems || 0;
  const pageCount = paginationInfo?.totalPages || 1;

  // Construct server-side pagination object using API response
  const serverPagination = {
    page: paginationInfo?.page || 1,
    pageSize: paginationInfo?.pageSize || 10,
    totalItems: totalCount,
    totalPages: pageCount,
    hasNextPage: paginationInfo?.hasNextPage || false,
    hasPreviousPage: paginationInfo?.hasPreviousPage || false,
  };

  // Configuration for AdminUserTable filters and search columns
  const userFilterColumns = [
    {
      column: "role",
      label: "Role",
      options: [
        { label: "All", value: "" },
        { label: "Admin", value: "admin" },
        { label: "User", value: "user" },
      ],
    },
    {
      column: "deletedAt",
      label: "Status",
      options: [
        { label: "All", value: "" },
        { label: "Active", value: "active" },
        { label: "Deleted", value: "deleted" },
      ],
    },
  ];

  const userCalendarColumns = [
    {
      label: "Created Date",
      column: "createdAt",
      type: "dateRange" as const,
    },
  ];

  const userSearchColumns = [
    {
      column: "name",
      label: "Name",
    },
    {
      column: "email",
      label: "Email",
    },
  ];

  const userActionDialogs = {
    delete: {
      title: "Delete Users",
      description:
        "Are you sure you want to delete the selected users? This action cannot be undone.",
      trigger: (
        <Button variant={"outline"} size={"icon"} className="size-8">
          <Trash2 className="h-4 w-4" />{" "}
        </Button>
      ),
      confirmButtonText: "Delete",
      onConfirm: async (selectedIds: string[]) => {
        console.log("Delete user action triggered for IDs:", selectedIds);
        // TODO: Replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      },
    },
  };

  return (
    <DataTableServerSide
      columns={userColumns}
      data={users}
      pagination={serverPagination}
      loading={isLoading}
      onPaginationChange={setPagination}
      sorting={sorting}
      onSortingChange={setSorting}
      filters={userFilterColumns}
      dateRangeFilters={userCalendarColumns}
      filterValues={filters}
      onFiltersChange={handleFiltersChange}
      searchColumns={userSearchColumns}
      searchValue={search}
      onSearchChange={handleSearchChange}
      actionDialogs={userActionDialogs}
    />
  );
}
