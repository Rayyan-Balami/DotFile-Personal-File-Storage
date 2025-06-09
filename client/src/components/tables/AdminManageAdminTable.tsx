"use client";

import {
  useGetUsersPaginated,
  useBulkSoftDeleteUsers,
  useBulkRestoreUsers,
  useBulkPermanentDeleteUsers,
} from "@/api/user/user.query";
import { User } from "@/types/user";
import { DataTableServerSide } from "@/components/data-table/DataTableServerSide";
import { AdminManageAdminColumns } from "@/components/tables/AdminManageAdminColumns";
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, Redo, Delete } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/apiErrorHandler";

interface AdminAdminTableProps {
  includeDeleted?: boolean;
}

export default function AdminManageAdminTable({
  includeDeleted = false,
}: AdminAdminTableProps) {
  // Mutation hooks for bulk operations
  const bulkSoftDeleteMutation = useBulkSoftDeleteUsers();
  const bulkRestoreMutation = useBulkRestoreUsers();
  const bulkPermanentDeleteMutation = useBulkPermanentDeleteUsers();

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

  // Build filters object with proper mapping
  const buildFilters = () => {
    const builtFilters: Record<string, any> = {};

    // Always filter to show only users with role "admin"
    builtFilters.role = "admin";

    // Handle status filter from UI (deletedAt column)
    if (filters.deletedAt) {
      builtFilters.status = filters.deletedAt; // Maps "active"/"deleted" to status
    } else {
      // Use includeDeleted prop to determine default behavior
      builtFilters.includeDeleted = includeDeleted;
    }

    // Handle date range filters
    if (filters.createdAtStart) {
      builtFilters.createdAtStart = filters.createdAtStart;
    }
    if (filters.createdAtEnd) {
      builtFilters.createdAtEnd = filters.createdAtEnd;
    }

    return builtFilters;
  };

  // Build query parameters
  const queryParams = {
    page: pagination.pageIndex + 1, // Convert to 1-based indexing
    pageSize: pagination.pageSize,
    sortBy: sorting[0]?.id || "createdAt",
    sortOrder: (sorting[0]?.desc ? "desc" : "asc") as "desc" | "asc",
    search: search || undefined,
    searchFields: searchFields.length > 0 ? searchFields : undefined,
    filters: buildFilters(),
  };

  const { data, isLoading, error } = useGetUsersPaginated(queryParams);

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
          <div className="text-destructive">Failed to load admins</div>
        </div>
      </div>
    );
  }
  const admins: User[] = data?.data?.data || [];
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

  // Configuration for AdminManageAdminTable filters and search columns
  const adminFilterColumns = [
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

  const adminCalendarColumns = [
    {
      label: "Created Date",
      column: "createdAt",
      type: "dateRange" as const,
    },
  ];

  const adminSearchColumns = [
    {
      column: "name",
      label: "Name",
    },
    {
      column: "email",
      label: "Email",
    },
  ];

  const adminActionDialogs = {
    softDelete: {
      title: "Soft Delete Admins",
      description:
        "Are you sure you want to soft delete the selected admins? They will be moved to the deleted state but can be restored later.",
      trigger: (
        <Button variant={"outline"} size={"icon"}>
          <Delete className="h-4 w-4" />{" "}
        </Button>
      ),
      confirmButtonText: "Soft Delete",
      onConfirm: async (selectedIds: string[]) => {
        try {
          const result = await bulkSoftDeleteMutation.mutateAsync(selectedIds);
          const { summary } = result.data;

          if (summary.successful > 0) {
            toast.success(
              `Successfully soft deleted ${summary.successful} admin${summary.successful > 1 ? "s" : ""}`
            );
          }

          if (summary.failed > 0) {
            toast.error(
              `Failed to soft delete ${summary.failed} admin${summary.failed > 1 ? "s" : ""}`
            );
          }
        } catch (error) {
          toast.error(getErrorMessage(error));
        }
      },
    },
    restore: {
      title: "Restore Admins",
      description:
        "Are you sure you want to restore the selected admins? They will be moved back to the active state.",
      trigger: (
        <Button variant={"outline"} size={"icon"}>
          <Redo className="h-4 w-4" />{" "}
        </Button>
      ),
      confirmButtonText: "Restore",
      onConfirm: async (selectedIds: string[]) => {
        try {
          const result = await bulkRestoreMutation.mutateAsync(selectedIds);
          const { summary } = result.data;

          if (summary.successful > 0) {
            toast.success(
              `Successfully restored ${summary.successful} admin${summary.successful > 1 ? "s" : ""}`
            );
          }

          if (summary.failed > 0) {
            toast.error(
              `Failed to restore ${summary.failed} admin${summary.failed > 1 ? "s" : ""}`
            );
          }
        } catch (error) {
          toast.error(getErrorMessage(error));
        }
      },
    },
    delete: {
      title: "Permanently Delete Admins",
      description:
        "Are you sure you want to permanently delete the selected admins? This action cannot be undone and will remove all their data.",
      trigger: (
        <Button variant={"outline"} size={"icon"}>
          <Trash2 className="h-4 w-4" />{" "}
        </Button>
      ),
      confirmButtonText: "Delete Permanently",
      onConfirm: async (selectedIds: string[]) => {
        try {
          const result =
            await bulkPermanentDeleteMutation.mutateAsync(selectedIds);
          const { summary } = result.data;

          if (summary.successful > 0) {
            toast.success(
              `Successfully deleted ${summary.successful} admin${summary.successful > 1 ? "s" : ""}`
            );
          }

          if (summary.failed > 0) {
            toast.error(
              `Failed to delete ${summary.failed} admin${summary.failed > 1 ? "s" : ""}`
            );
          }
        } catch (error) {
          toast.error(getErrorMessage(error));
        }
      },
    },
  };

  return (
    <DataTableServerSide
      columns={AdminManageAdminColumns}
      data={admins}
      pagination={serverPagination}
      loading={isLoading}
      onPaginationChange={setPagination}
      sorting={sorting}
      onSortingChange={setSorting}
      filters={adminFilterColumns}
      dateRangeFilters={adminCalendarColumns}
      filterValues={filters}
      onFiltersChange={handleFiltersChange}
      searchColumns={adminSearchColumns}
      searchValue={search}
      onSearchChange={handleSearchChange}
      actionDialogs={adminActionDialogs}
    />
  );
}
