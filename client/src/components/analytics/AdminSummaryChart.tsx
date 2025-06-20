import { TrendingDown, TrendingUp } from "lucide-react";
import React from "react";

import { useSummaryAnalytics } from "@/api/analytics/analytics.query";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SummaryAnalyticsItem } from "@/types/analytics.dto";
import { formatFileSize } from "@/utils/formatUtils";

export function AdminSummaryChart() {
  const { data: summaryData, isError, isLoading } = useSummaryAnalytics();

  // Helper function to format growth rate display
  const formatGrowthRate = (rate: number) => {
    if (rate === 0) return "0%";
    return rate > 0 ? `+${rate}%` : `${rate}%`;
  };

  // Helper function to get trend icon and variant
  const getTrendProps = (rate: number) => {
    if (rate > 0) {
      return {
        icon: TrendingUp,
        variant: "outline" as const,
        color: "text-green-600",
      };
    } else if (rate < 0) {
      return {
        icon: TrendingDown,
        variant: "outline" as const,
        color: "text-red-600",
      };
    } else {
      return {
        icon: TrendingUp,
        variant: "outline" as const,
        color: "text-gray-600",
      };
    }
  };

  // Handle error state only (loading is handled by Suspense for component, but data loading shows nothing)
  if (isError) {
    return (
      <div className="text-center text-red-600 p-4">
        Failed to load analytics data
      </div>
    );
  }

  // Don't render anything while loading - let Suspense handle it
  if (isLoading || !summaryData?.data?.analytics) {
    return null;
  }

  const analytics = summaryData.data.analytics;

  // Helper function to get appropriate descriptions for each metric type
  const getMetricDescription = (type: string, growthRate: number) => {
    switch (type) {
      case "users":
        return growthRate > 0
          ? "Growing this month"
          : growthRate < 0
            ? "Declining this month"
            : "No change this month";
      case "files":
        return growthRate > 0
          ? "Upload activity increasing"
          : growthRate < 0
            ? "Upload activity decreasing"
            : "Stable upload activity";
      case "storage":
        return growthRate > 0
          ? "Storage consumption up"
          : growthRate < 0
            ? "Storage freed"
            : "Storage usage stable";
      case "activity":
        return growthRate > 0
          ? "User engagement growing"
          : growthRate < 0
            ? "User engagement declining"
            : "Stable user engagement";
      default:
        return "No change";
    }
  };

  // Helper function to format values based on type
  const formatValue = (value: number, type: string) => {
    if (type === "storage") {
      return formatFileSize(value);
    }
    return value.toLocaleString();
  };

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {analytics.map((item: SummaryAnalyticsItem) => (
        <Card key={item.type} className="@container/card">
          <CardHeader>
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatValue(item.currentMonth, item.type)}
            </CardTitle>
            <CardAction>
              <Badge variant={getTrendProps(item.growthRate).variant}>
                {React.createElement(getTrendProps(item.growthRate).icon, {
                  className: "w-4 h-4",
                })}
                {formatGrowthRate(item.growthRate)}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {getMetricDescription(item.type, item.growthRate)}
              {React.createElement(getTrendProps(item.growthRate).icon, {
                className: "size-4",
              })}
            </div>
            <div className="text-muted-foreground">
              {formatValue(item.previousMonth, item.type)}{" "}
              {item.type === "activity" ? "active users" : item.type} last month
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
