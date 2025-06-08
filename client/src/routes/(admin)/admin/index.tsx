import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Lazy load admin components to reduce initial bundle size and split recharts
const AdminSummaryCard = lazy(() => import("@/components/cards/AdminSummaryCard").then(m => ({ default: m.AdminSummaryCard })));
const AdminCreationCard = lazy(() => import("@/components/cards/AdminCreationCard").then(m => ({ default: m.AdminCreationCard })));
const AdminFileTypeCard = lazy(() => import("@/components/cards/AdminFileTypeCard").then(m => ({ default: m.AdminFileTypeCard })));
const AdminMonthlyUserRegistrationsCard = lazy(() => import("@/components/cards/AdminMonthlyUserRegistrationsCard").then(m => ({ default: m.AdminMonthlyUserRegistrationsCard })));
const AdminUserStorageCard = lazy(() => import("@/components/cards/AdminUserStorageCard"));

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
  <div className="space-y-3">
    <Skeleton className="h-[125px] w-full rounded-xl" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-4 w-[200px]" />
    </div>
  </div>
);

export const Route = createFileRoute("/(admin)/admin/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Suspense fallback={<CardSkeleton />}>
        <AdminSummaryCard />
      </Suspense>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Suspense fallback={<ChartSkeleton />}>
          <AdminCreationCard />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <AdminMonthlyUserRegistrationsCard />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <AdminFileTypeCard />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <AdminUserStorageCard />
        </Suspense>
      </div>
    </>
  );
}
