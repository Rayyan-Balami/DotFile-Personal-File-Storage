import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { FormControl, FormItem, FormMessage } from "@/components/ui/form";
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
  error?: string;
  label?: string;
}

export function DateRangePicker({
  label = "Date Range",
  value,
  onChange,
  error,
}: DateRangePickerProps) {
  const { isMobile } = useBreakpoint();

  return (
    <FormItem className="flex flex-col">
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              className={cn(
                "w-full gap-6 justify-between text-left font-normal",
                !value?.from && "text-muted-foreground"
              )}
              size="sm"
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
                            <Badge variant={"secondary"} className="-mr-1.5 font-normal">
                {value?.from && value?.to
                  ? Math.ceil(
                      (value.to.getTime() - value.from.getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1
                  : "0"}{" "}
                Days
              </Badge>
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
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
          />
        </PopoverContent>
      </Popover>
      {error && <FormMessage>{error}</FormMessage>}
    </FormItem>
  );
}
