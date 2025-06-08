"use client";

import * as React from "react";
import { TrendingUp } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

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
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStorageConsumptionAnalytics } from "@/api/analytics/analytics.query";
import { UserStorageConsumptionAnalyticsItem } from "@/types/analytics.dto";

export const description = "User storage consumption horizontal bar chart";

// Chart configuration
const chartConfig = {
  count: {
    label: "Users",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

// Transform data for the chart
const transformDataForChart = (data: UserStorageConsumptionAnalyticsItem[]) => {
  return data.map((item) => ({
    label: item.label,
    count: item.count,
    fill: "var(--color-count)",
  }));
};

export function UserStorageChart() {
  const { data, isLoading, error } = useUserStorageConsumptionAnalytics();

  // Loading state
  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex h-[250px] items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardFooter>
      </Card>
    );
  }

  // Error state
  if (error || !data?.analytics) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>User Storage Consumption</CardTitle>
          <CardDescription>Distribution by storage usage percentage</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            <p>Failed to load storage analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = transformDataForChart(data.analytics);
  const totalUsers = chartData.reduce((acc, curr) => acc + curr.count, 0);

  // Find the category with the most users
  const maxCategory = chartData.reduce((max, item) => 
    item.count > max.count ? item : max, 
    chartData[0]
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>User Storage Consumption</CardTitle>
        <CardDescription>
          Storage usage distribution across {totalUsers} total users
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <BarChart
            data={chartData}
            layout="horizontal"
            margin={{
              left: 40,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <XAxis 
              type="number" 
              dataKey="count"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
              formatter={(value) => [
                <div className="flex items-center gap-2 text-sm">
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-[--color-count]"
                    style={{
                      "--color-count": "var(--color-count)",
                    } as React.CSSProperties}
                  />
                  {`${value} users`}
                </div>
              ]}
            />
            <Bar 
              dataKey="count" 
              fill="var(--color-count)" 
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Most users are at {maxCategory.label} storage usage
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing storage consumption distribution across all active users
        </div>
      </CardFooter>
    </Card>
  );
}

export default UserStorageChart;
