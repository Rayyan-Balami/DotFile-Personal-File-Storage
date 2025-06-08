import { AdminCreationCard } from "@/components/cards/AdminCreationCard";
import { AdminSummaryCard } from "@/components/cards/AdminSummaryCard";
import { FileTypePieChart } from "@/components/cards/FileTypePieChart";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/admin/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <AdminSummaryCard />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <AdminCreationCard />
        <FileTypePieChart />
      </div>
    </>
  );
}
