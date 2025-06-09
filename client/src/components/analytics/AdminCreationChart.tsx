import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { z } from "zod";

import { useCreationAnalytics } from "@/api/analytics/analytics.query";
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
import { Form, FormControl, FormField } from "@/components/ui/form";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useDebounce } from "@/hooks/use-debounce";
import { CreationAnalyticsItem } from "@/types/analytics.dto";
import { formatDateString } from "@/utils/formatUtils";
import { creationAnalyticsSchema } from "@/validation/analytics.validaton";
import { DateRangePicker } from "../ui/DateRangePicker";

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

export function AdminCreationChart() {
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

  // Watch form values and prepare date range for debouncing
  const formDateRange = form.watch("dateRange");

  // Create API-ready date range from form values
  const apiDateRange = React.useMemo(() => {
    if (formDateRange?.from && formDateRange?.to) {
      return {
        startDate: formatDateString(formDateRange.from),
        endDate: formatDateString(formDateRange.to),
      };
    }
    return dateRange; // fallback to current state
  }, [formDateRange, dateRange]);

  // Debounce the API date range
  const debouncedDateRange = useDebounce(apiDateRange, 500);

  // Update the actual date range when debounced value changes
  React.useEffect(() => {
    // Validate using your existing schema
    try {
      const validatedData = creationAnalyticsSchema.parse(debouncedDateRange);
      console.log("Date range debounced and validated:", validatedData);
      setDateRange(validatedData);
    } catch (error) {
      console.error("Invalid date range:", error);
    }
  }, [debouncedDateRange]);

  // Fetch analytics data
  const { data: analyticsData, error } = useCreationAnalytics(dateRange);

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

  // Handle error state only (loading is handled by Suspense)
  if (error) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>File & Folder Creation</CardTitle>
          <CardDescription>
            Showing creation of files and folders in system
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            <p>Failed to load creation data</p>
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
            Showing creation of files and folders in system
          </CardDescription>
        </div>
        <Form {...form}>
          <FormField
            control={form.control}
            name="dateRange"
            render={({ field }) => (
              <FormControl>
                <DateRangePicker
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                  }}
                />
              </FormControl>
              
            )}
          />
        </Form>
      </div>
      <CardContent className="pb-0">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
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
          {(() => {
            if (chartData.length === 0) return "No data available";
            const peakDay = chartData.reduce((max, curr) =>
              curr.total > max.total ? curr : max
            );
            const peakDate = new Date(peakDay.date);
            const formattedDate = peakDate.toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            });
            return `Peak creation was ${peakDay.total} creations on ${formattedDate}`;
          })()}
        </div>
        <div className="leading-none text-muted-foreground">
          Total of {chartData.reduce((acc, curr) => acc + curr.file, 0)} files
          and {chartData.reduce((acc, curr) => acc + curr.folder, 0)} folders
          created in {chartData.length} days
        </div>
      </CardFooter>
    </Card>
  );
}
