import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Home } from "lucide-react";

// Error illustration - using large text instead of SVG
function ErrorIllustration(props: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={`flex items-center justify-center text-[12rem] sm:text-[28rem] font-extrabold select-none ${props.className}`}
    >
      404
    </div>
  );
}

export function NotFound() {
  return (
    <div className="relative flex flex-col w-full justify-center min-h-svh bg-background p-6 md:p-10">
      <div className="relative max-w-5xl mx-auto w-full">
        <ErrorIllustration className="absolute inset-0 w-full h-[50vh] opacity-[0.04] dark:opacity-[0.08] text-foreground" />
        <div className="relative text-center z-[1] pt-52">
          <h1 className="mt-4 text-balance text-5xl font-semibold tracking-tight text-primary sm:text-7xl">
            Oops! Page not found
          </h1>
          <p className="mt-6 text-pretty text-lg font-medium text-muted-foreground sm:text-xl/8">
            Hey explorer, it seems like you have ventured into uncharted territory.
          </p>
          <div className="mt-10 flex flex-row items-center justify-center flex-wrap gap-y-3 gap-x-6">
            <Button
              variant="secondary"
              onClick={() => window.history.back()}
              className="group"
            >
              <ArrowLeft
                className="me-2 ms-0 opacity-60 transition-transform group-hover:-translate-x-0.5"
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />
              Go Back
            </Button>
            <Button asChild>
              <Link to="/" className="group">
                <Home
                  className="me-2 ms-0 opacity-60 transition-transform group-hover:scale-105"
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                Take me Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
