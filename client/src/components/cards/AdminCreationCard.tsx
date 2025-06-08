import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { z } from "zod";

import { useCreationAnalytics } from "@/api/analytics/analytics.query";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";
import { CreationAnalyticsItem } from "@/types/analytics.dto";
import { formatDateString } from "@/utils/formatUtils";
import { creationAnalyticsSchema } from "@/validation/analytics.validaton";

const description = "Showing files and folders creation";
const chartConfig = {
  creation: {
    label: "Creations",
  },
  file: {
    label: "Files",
    color: "var(--primary)",
  },
  folder: {
    label: "Folders",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function AdminCreationCard() {
  const { isMobile } = useBreakpoint();

  // Form schema that extends your existing schema to handle Date objects for the calendar
  const FormSchema = z.object({
    dateRange: z.object({
      from: z.date({
        required_error: "A start date is required.",
      }),
      to: z.date({
        required_error: "An end date is required.",
      }),
    }),
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      dateRange: {
        from: new Date(new Date().setDate(new Date().getDate() - 7)), // 7 days ago
        to: new Date(), // today
      },
    },
  });

  // State for the actual date range used for API call
  const [dateRange, setDateRange] = React.useState(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    return {
      startDate: formatDateString(startDate), // YYYY-MM-DD format
      endDate: formatDateString(endDate), // YYYY-MM-DD format
    };
  });

  // Debounced auto-submit when date range changes
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (
        name === "dateRange" &&
        value.dateRange?.from &&
        value.dateRange?.to
      ) {
        // Debounce the API call by 500ms
        const timeoutId = setTimeout(() => {
          // Type guard to ensure values exist
          if (value.dateRange && value.dateRange.from && value.dateRange.to) {
            const apiDateRange = {
              startDate: formatDateString(value.dateRange.from),
              endDate: formatDateString(value.dateRange.to),
            };

            // Validate using your existing schema
            const validatedData = creationAnalyticsSchema.parse(apiDateRange);

            console.log("Date range auto-submitted:", validatedData);
            setDateRange(validatedData);
          }
        }, 500);

        return () => clearTimeout(timeoutId);
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Fetch analytics data
  const {
    data: analyticsData,
    isLoading,
    error,
  } = useCreationAnalytics(dateRange);

  // Filter and format data for the chart
  const chartData = React.useMemo(() => {
    if (!analyticsData?.data?.analytics) return [];

    const apiData = analyticsData.data.analytics.map(
      (item: CreationAnalyticsItem) => ({
        date: item.date,
        file: item.file,
        folder: item.folder,
        total: item.total,
      })
    );

    // Create a complete range of dates with zero values
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const completeData = [];

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];

      // Find if we have data for this date
      const existingData = apiData.find(
        (item: CreationAnalyticsItem) => item.date === dateStr
      );

      completeData.push({
        date: dateStr,
        file: existingData?.file || 0,
        folder: existingData?.folder || 0,
        total: existingData?.total || 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log("Chart data with all dates:", completeData);
    return completeData;
  }, [analyticsData, dateRange]);

  // Handle loading and error states
  if (isLoading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>{chartConfig.creation.label}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex h-[250px] items-center justify-center">
            <Loader2 className="animate-spin mx-auto text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>{chartConfig.creation.label}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex h-[250px] items-center justify-center">
            <div className="text-destructive">
              Failed to load analytics data
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <div className="flex flex-wrap justify-between px-6 gap-6">
        <div>
          <CardTitle>{chartConfig.creation.label}</CardTitle>
          <CardDescription>
            {description} from{" "}
            {format(new Date(dateRange.startDate), "MMM dd, yyyy")} to{" "}
            {format(new Date(dateRange.endDate), "MMM dd, yyyy")}
          </CardDescription>
        </div>
        <div className="">
          <Form {...form}>
            <FormField
              control={form.control}
              name="dateRange"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          id="date"
                          variant={"outline"}
                          className={cn(
                            "w-full gap-6 justify-between text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          size="sm"
                        >
                          <CalendarIcon className="h-4 w-4 opacity-50" />
                          {field.value?.from ? (
                            field.value.to ? (
                              <>
                                {format(field.value.from, "MMM dd")} -{" "}
                                {format(field.value.to, "MMM dd, yyyy")}
                              </>
                            ) : (
                              format(field.value.from, "MMM dd, yyyy")
                            )
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="range"
                        defaultMonth={field.value?.from}
                        selected={field.value}
                        onSelect={field.onChange}
                        numberOfMonths={isMobile ? 1 : 2}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Form>
        </div>
      </div>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <defs>
              <linearGradient id="fillFile" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-file)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-file)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillFolder" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-folder)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-folder)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              defaultIndex={isMobile ? -1 : 10}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="folder"
              type="natural"
              fill="url(#fillFolder)"
              stroke="var(--color-folder)"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              dataKey="file"
              type="natural"
              fill="url(#fillFile)"
              stroke="var(--color-file)"
              strokeWidth={2}
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-center gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Created {chartData.reduce((acc, curr) => acc + curr.total, 0)} items with{" "}
          {chartData.reduce((acc, curr) => acc + curr.file, 0)} files and{" "}
          {chartData.reduce((acc, curr) => acc + curr.folder, 0)} folders
        </div>
        <div className="leading-none text-muted-foreground">
          Showing creation activity for files and folders
        </div>
      </CardFooter>
    </Card>
  );
}
