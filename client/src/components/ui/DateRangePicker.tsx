import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Badge } from "./badge";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  label?: string;
}

export function DateRangePicker({
  label = "Date Range",
  value,
  onChange,
}: DateRangePickerProps) {
  const { isMobile } = useBreakpoint();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "gap-6 justify-between text-left font-normal",
            !value?.from && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-4 w-4 opacity-50" />
          {value?.from ? (
            value.to ? (
              value.from.toDateString() === value.to.toDateString() ? (
                format(value.from, "MMM dd, yyyy")
              ) : (
                <>
                  {format(value.from, "MMM dd")} -{" "}
                  {format(value.to, "MMM dd, yyyy")}
                </>
              )
            ) : (
              format(value.from, "MMM dd, yyyy")
            )
          ) : (
            <span>{label}</span>
          )}
          {value?.from && value?.to && (
            <Badge variant={"secondary"} className="-mr-1.5 font-normal">
              {Math.ceil(
                (value.to.getTime() - value.from.getTime()) /
                  (1000 * 60 * 60 * 24)
              ) + 1}{" "}
              Days
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 pt-0 flex flex-col" align="end">
        <Calendar
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={(range) => {
            if (range?.from && range?.to) {
              onChange({
                from: range.from,
                to: range.to,
              });
            }
          }}
          numberOfMonths={isMobile ? 1 : 2}
          showOutsideDays={false}
        />
        {/* Clear Button */}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => onChange({ from: undefined, to: undefined })}
        >
          Clear
        </Button>
      </PopoverContent>
    </Popover>
  );
}
