import UserProfile from "@/components/profile/UserProfile";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(user)/setting/profile")({
  component: UserProfile,
});
