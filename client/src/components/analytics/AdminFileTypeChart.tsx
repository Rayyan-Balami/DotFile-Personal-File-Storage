import * as React from "react";
import { Label, Pie, PieChart } from "recharts";

import { useFileTypeAnalytics } from "@/api/analytics/analytics.query";
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
import { FileTypeAnalyticsItem } from "@/types/analytics.dto";

// Helper function to get user-friendly labels for MIME types
const getMimeTypeLabel = (mimeType: string): string => {
  // Handle special cases for long/complex MIME types
  const specialCases: { [key: string]: string } = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "WORD",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      "EXCEL",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "POWERPOINT",
    "application/vnd.ms-excel": "EXCEL",
    "application/msword": "WORD",
    "application/vnd.ms-powerpoint": "POWERPOINT",
    "application/x-rar-compressed": "RAR",
  };

  // Check if it's a special case first
  if (specialCases[mimeType]) {
    return specialCases[mimeType];
  }

  // Split by '/' and take the subtype (second part)
  const parts = mimeType.split("/");
  if (parts.length === 2) {
    const subtype = parts[1];
    // Return uppercase
    return subtype.toUpperCase();
  }

  // Fallback to original MIME type if splitting fails
  return mimeType.toUpperCase();
};

// Chart configuration with dynamic colors
const generateChartConfig = (data: FileTypeAnalyticsItem[]): ChartConfig => {
  const config: ChartConfig = {
    count: {
      label: "Files",
    },
  };

  // Add colors for each file type
  data.forEach((item, index) => {
    const colorVar = `--chart-${(index % 6) + 1}`; // Cycle through chart-1 to chart-6
    config[item.type] = {
      label: getMimeTypeLabel(item.type),
      color: `var(${colorVar})`,
    };
  });

  return config;
};

// Transform data for the chart
const transformDataForChart = (data: FileTypeAnalyticsItem[]) => {
  return data.map((item, index) => ({
    type: item.type,
    label: getMimeTypeLabel(item.type),
    count: item.count,
    fill: `var(--chart-${(index % 6) + 1})`, // Cycle through chart colors
  }));
};

export function AdminFileTypeChart() {
  const { data: fileTypeData, isError } = useFileTypeAnalytics();

  const chartData = React.useMemo(() => {
    if (!fileTypeData?.data?.analytics) return [];
    return transformDataForChart(fileTypeData.data.analytics);
  }, [fileTypeData]);

  const chartConfig = React.useMemo(() => {
    if (!fileTypeData?.data?.analytics) return {};
    return generateChartConfig(fileTypeData.data.analytics);
  }, [fileTypeData]);

  const totalFiles = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0);
  }, [chartData]);

  const topFileType = React.useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData.reduce(
      (max, curr) => (curr.count > max.count ? curr : max),
      chartData[0]
    );
  }, [chartData]);

  // Handle error state only (loading is handled by Suspense)
  if (isError || !fileTypeData || chartData.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>File Type Distribution</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="mx-auto aspect-square max-h-[250px] flex items-center justify-center text-muted-foreground">
            No files found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>File Type Distribution</CardTitle>
        <CardDescription>Distribution of files by type</CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="label"
              innerRadius={60}
              strokeWidth={5}
              className="uppercase"
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalFiles.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Total Files
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-center gap-2 text-sm">
        {topFileType && (
          <div className="flex gap-2 leading-none font-medium">
            Most files are {topFileType.label} format with {topFileType.count}{" "}
            files
          </div>
        )}
        <div className="text-muted-foreground leading-none">
          Total of {totalFiles.toLocaleString()} files in the system
        </div>
      </CardFooter>
    </Card>
  );
}
