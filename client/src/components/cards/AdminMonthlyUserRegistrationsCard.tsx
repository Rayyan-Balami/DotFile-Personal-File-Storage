"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import { useMonthlyUserRegistrationsAnalytics } from "@/api/analytics/analytics.query";
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
import { UserGrowthAnalytics } from "@/types/analytics.dto";

export const description = "Monthly user registrations radar chart showing all 12 months";

const chartConfig = {
  users: {
    label: "Users",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

interface ChartDataItem {
  month: string;
  users: number;
}

export function AdminMonthlyUserRegistrationsCard() {
  const { data, isLoading, error } = useMonthlyUserRegistrationsAnalytics();
  
  const chartData: ChartDataItem[] = data?.data?.analytics?.map((item: UserGrowthAnalytics) => ({
    month: item.month,
    users: item.count,
  })) || [];

  const totalUsers = chartData.reduce((acc: number, curr: ChartDataItem) => acc + curr.users, 0);
  
  const peakMonth = chartData.length > 0 
    ? chartData.reduce((max: ChartDataItem, curr: ChartDataItem) => (curr.users > max.users ? curr : max), chartData[0])
    : null;

  const currentYear = new Date().getFullYear();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="items-center pb-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="pb-0">
          <div className="mx-auto aspect-square max-h-[250px] flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-full" />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardFooter>
      </Card>
    );
  }

  if (error || !data?.data?.analytics) {
    return (
      <Card>
        <CardHeader className="items-center pb-4">
          <CardTitle>Monthly User Registrations</CardTitle>
          <CardDescription>User registrations throughout {currentYear}</CardDescription>
        </CardHeader>
        <CardContent className="pb-0">
          <div className="mx-auto aspect-square max-h-[250px] flex items-center justify-center text-muted-foreground">
            <p>Failed to load registration data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="items-center pb-0">
        <CardTitle>Monthly User Registrations</CardTitle>
        <CardDescription>
          User registrations throughout {currentYear}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadarChart data={chartData}>
            <ChartTooltip 
              cursor={false} 
              content={<ChartTooltipContent hideLabel />} 
            />
            <PolarAngleAxis dataKey="month" />
            <PolarGrid />
            <Radar
              dataKey="users"
              fill="var(--color-users)"
              fillOpacity={0.6}
              stroke="var(--color-users)"
              strokeWidth={2}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-center gap-2 text-sm">
        {peakMonth && (
          <div className="flex items-center gap-2 leading-none font-medium">
            Peak registration was {peakMonth.users} users in {peakMonth.month}
          </div>
        )}
        <div className="leading-none text-muted-foreground items-center">
          Total of {totalUsers} users registered in {currentYear}
        </div>
      </CardFooter>
    </Card>
  );
}
