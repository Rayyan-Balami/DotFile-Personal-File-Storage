import { Bar, BarChart, XAxis, YAxis } from "recharts";

import { useUserStorageConsumptionAnalytics } from "@/api/analytics/analytics.query";
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
import { UserStorageConsumptionAnalyticsItem } from "@/types/analytics.dto";

// Chart configuration
const chartConfig = {
  count: {
    label: "Users",
  },
  "0%": {
    label: "0%",
    color: "var(--chart-1)",
  },
  "25%": {
    label: "25%",
    color: "var(--chart-2)",
  },
  "50%": {
    label: "50%",
    color: "var(--chart-3)",
  },
  "75%": {
    label: "75%",
    color: "var(--chart-4)",
  },
  "100%": {
    label: "100%",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

// Transform data for the chart
const transformDataForChart = (data: UserStorageConsumptionAnalyticsItem[]) => {
  const colorMap: Record<string, string> = {
    "0%": "var(--chart-1)",
    "25%": "var(--chart-2)",
    "50%": "var(--chart-3)",
    "75%": "var(--chart-4)",
    "100%": "var(--chart-5)",
  };

  return data.map((item) => ({
    storage: item.label,
    count: item.count,
    fill: colorMap[item.label] || "var(--chart-1)",
  }));
};

export function AdminUserStorageChart() {
  const { data, error } = useUserStorageConsumptionAnalytics();

  // Handle error state only (loading is handled by Suspense)
  if (error || !data?.data?.analytics) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>User Storage Consumption</CardTitle>
          <CardDescription>
            Distribution by storage usage percentage
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            <p>Failed to load storage analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = transformDataForChart(data.data.analytics);
  const totalUsers = chartData.reduce((acc, curr) => acc + curr.count, 0);

  // Find the category with the most users
  const maxCategory = chartData.reduce(
    (max, item) => (item.count > max.count ? item : max),
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
      <CardContent className="pb-0">
        <ChartContainer config={chartConfig} className="max-h-[250px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              left: 0,
            }}
          >
            <YAxis
              dataKey="storage"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                chartConfig[value as keyof typeof chartConfig]?.label
              }
            />
            <XAxis dataKey="count" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" layout="vertical" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-center gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Most users are at {maxCategory.storage} storage usage
        </div>
        <div className="leading-none text-muted-foreground">
          Total of {totalUsers} users across all storage categories
        </div>
      </CardFooter>
    </Card>
  );
}
