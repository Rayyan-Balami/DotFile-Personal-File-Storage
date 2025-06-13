import LoginForm from "@/components/auth-forms/LoginForm";
import { LogoWithText } from "@/components/logo";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)/login")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <div className="flex flex-col gap-4 p-6 md:p-10 max-h-dvh">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link to="/" className="flex items-center gap-2 font-medium text-xl">
            <LogoWithText />
          </Link>
        </div>
        <div className="flex flex-1 justify-center overflow-y-scroll no-scrollbar">
          <div className="w-full max-w-sm my-auto">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="/pattern.jpeg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </>
  );
}
