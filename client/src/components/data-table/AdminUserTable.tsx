"use client";

import { useGetUsersPaginated } from "@/api/user/user.query";
import { User } from "@/types/user";
import { DataTableServerSide } from "./DataTableServerSide";
import { userColumns } from "./userColumns";
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
  const userFilterOptions = [
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

  return (
    <DataTableServerSide
      columns={userColumns}
      data={users}
      pagination={serverPagination}
      loading={isLoading}
      onPaginationChange={setPagination}
      sorting={sorting}
      onSortingChange={setSorting}
      filters={userFilterOptions}
      filterValues={filters}
      onFiltersChange={handleFiltersChange}
      searchColumns={userSearchColumns}
      searchValue={search}
      onSearchChange={handleSearchChange}
    />
  );
}
