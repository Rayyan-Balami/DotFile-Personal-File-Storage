import { CreationChartCard } from "@/components/cards/CreationChartCard";
import { SectionCards } from "@/components/cards/SectionCards";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/admin/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <SectionCards />
      <CreationChartCard />
    </>
  );
}
