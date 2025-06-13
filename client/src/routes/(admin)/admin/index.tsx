import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// Lazy load admin components to reduce initial bundle size and split recharts
const AdminSummaryChart = lazy(() =>
  import("@/components/analytics/AdminSummaryChart").then((m) => ({
    default: m.AdminSummaryChart,
  }))
);
const AdminCreationChart = lazy(() =>
  import("@/components/analytics/AdminCreationChart").then((m) => ({
    default: m.AdminCreationChart,
  }))
);
const AdminFileTypeChart = lazy(() =>
  import("@/components/analytics/AdminFileTypeChart").then((m) => ({
    default: m.AdminFileTypeChart,
  }))
);
const AdminMonthlyUserRegistrationsChart = lazy(() =>
  import("@/components/analytics/AdminMonthlyUserRegistrationsChart").then(
    (m) => ({
      default: m.AdminMonthlyUserRegistrationsChart,
    })
  )
);
const AdminUserStorageChart = lazy(() =>
  import("@/components/analytics/AdminUserStorageChart").then((m) => ({
    default: m.AdminUserStorageChart,
  }))
);

// Chart loading skeleton
const ChartSkeleton = () => (
  <Card className="flex flex-col">
    <CardHeader className="items-center pb-0">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64 mt-2" />
    </CardHeader>
    <CardContent className="flex-1 pb-0">
      <div className="h-[250px] flex items-center justify-center">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    </CardContent>
  </Card>
);

// Fallback component for loading state
const CardSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
    {[...Array(4)].map((_, i) => (
      <Card key={i} className="@container/card">
        <CardHeader className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-[50%]" />
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-[70%]" />
        </CardFooter>
      </Card>
    ))}
  </div>
);
export const Route = createFileRoute("/(admin)/admin/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Suspense fallback={<CardSkeleton />}>
        <AdminSummaryChart />
      </Suspense>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Suspense fallback={<ChartSkeleton />}>
          <AdminMonthlyUserRegistrationsChart />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <AdminCreationChart />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <AdminFileTypeChart />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <AdminUserStorageChart />
        </Suspense>
      </div>
    </>
  );
}
