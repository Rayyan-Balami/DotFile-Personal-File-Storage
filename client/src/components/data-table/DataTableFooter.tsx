import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataTableFooterProps {
  page: number;
  totalPages: number;
  limit: number;
  limitOptions: number[];
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
}

export default function DataTableFooter({
  page,
  totalPages,
  limit,
  limitOptions,
  setPage,
  setLimit
}: DataTableFooterProps) {
  return (
    <div className="flex justify-between items-center">
      {limitOptions.length > 0 && (
        <Select value={limit.toString()} onValueChange={(val) => setLimit(Number(val))}>
          <SelectTrigger className="w-fit bg-foreground text-black">
            <span>Rows:&nbsp;</span>
            <SelectValue placeholder="Rows" />
          </SelectTrigger>
          <SelectContent>
            {limitOptions.map((opt) => (
              <SelectItem key={opt} value={opt.toString()}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="flex items-center gap-2">
        <span className="bg-foreground text-black rounded-md h-9 border px-3 py-2 text-sm shadow-sm">
          Page: {page} / {totalPages}
        </span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="bg-foreground text-black shadow-sm"
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page <= 1}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="bg-foreground text-black shadow-sm"
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          disabled={page >= totalPages}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}