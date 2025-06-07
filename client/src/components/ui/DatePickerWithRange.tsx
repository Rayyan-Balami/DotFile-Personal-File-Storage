import { format } from "date-fns"
import * as React from "react"
import { DateRange } from "react-day-picker"
 
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Calendar1 } from "lucide-react"
 
export function DatePickerWithRange({
  className,
  date,
  onDateChange,
}: React.HTMLAttributes<HTMLDivElement> & {
  date?: DateRange | undefined;
  onDateChange?: (date: DateRange | undefined) => void;
}) {
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>({
    from: new Date("2024-06-24"),
    to: new Date("2024-06-30"),
  })

  const currentDate = date ?? internalDate;
  const handleDateChange = onDateChange ?? setInternalDate;
 
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !currentDate && "text-muted-foreground"
            )}
          >
            <Calendar1 className="mr-2 h-4 w-4" />
            {currentDate?.from ? (
              currentDate.to ? (
                <>
                  {format(currentDate.from, "LLL dd, y")} -{" "}
                  {format(currentDate.to, "LLL dd, y")}
                </>
              ) : (
                format(currentDate.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={currentDate?.from}
            selected={currentDate}
            onSelect={handleDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}