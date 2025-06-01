import RegisterForm from "@/components/auth-forms/RegisterForm";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GalleryVerticalEnd } from "lucide-react";

export const Route = createFileRoute("/(auth)/register")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <div className="flex flex-col gap-4 p-6 md:p-10 max-h-dvh">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link to="/" className="flex items-center gap-2 font-medium text-xl">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            .File.
          </Link>
        </div>
        <div className="flex flex-1 justify-center overflow-y-scroll no-scrollbar">
          <div className="w-full max-w-sm my-auto">
            <RegisterForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="https://plus.unsplash.com/premium_photo-1675977693128-02be743c4a4c?q=80&w=3116&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </>
  );
}
