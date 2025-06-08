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
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Eye, Loader, MoreHorizontal } from "lucide-react";

interface DataTableBodyProps {
  data: any[];
  columns: { key: string; label: string; render?: (row: any) => React.ReactNode }[];
  visibleColumns: string[];
  isLoading: boolean;
  actions?: boolean | { label: string; onClick: (item: any) => void }[];
  selected: string[];
  toggleSelection: (id: string) => void;
  rowCheckDisabled?: boolean | ((item: any) => boolean);
}

export default function DataTableBody({
  data,
  columns,
  visibleColumns,
  isLoading,
  actions,
  selected,
  toggleSelection,
  rowCheckDisabled,
}: DataTableBodyProps) {
  if (isLoading) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={visibleColumns.length + (actions ? 2 : 1)}>
            <div className="p-4 text-center text-gray-600">
              <Loader className="size-6 animate-spin mx-auto" />
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  if (data.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={visibleColumns.length + (actions ? 2 : 1)}>
            <div className="p-4 text-center text-gray-600">No data found</div>
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {data.map((item) => (
        <TableRow key={item.id}>
          <TableCell>
            <Checkbox
              className="rounded"
              checked={selected.includes(item.id)}
              onCheckedChange={() => toggleSelection(item.id)}
              disabled={
                typeof rowCheckDisabled === "function"
                  ? rowCheckDisabled(item)
                  : rowCheckDisabled
              }
            />
          </TableCell>
          {columns
            .filter((col) => visibleColumns.includes(col.key))
            .map((col) => (
              <TableCell key={col.key} className="capitalize">
                {col.render ? col.render(item) : item[col.key]}
              </TableCell>
            ))}
          {actions && (
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="bg-background text-black shadow-sm"
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Array.isArray(actions) ? (
                    actions.map((action) => (
                      <DropdownMenuItem
                        key={action.label}
                        onClick={() => action.onClick(item)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {action.label}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem>Action not provided</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          )}
        </TableRow>
      ))}
    </TableBody>
  );
}