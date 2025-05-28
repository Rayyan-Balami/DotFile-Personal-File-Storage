import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { IS_DEVELOPMENT } from "@/config/constants";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error illustration - using large text instead of SVG
function ErrorIllustration(props: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={`flex items-center justify-center text-[12rem] sm:text-[28rem] font-extrabold select-none ${props.className}`}>
      500
    </div>
  );
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    // You can also log to an error reporting service here
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="relative flex flex-col w-full justify-center min-h-svh bg-background p-6 md:p-10">
          <div className="relative max-w-5xl mx-auto w-full">
            <ErrorIllustration className="absolute inset-0 w-full h-[50vh] opacity-[0.04] dark:opacity-[0.08] text-foreground" />
            <div className="relative text-center z-[1] pt-52">
              <h1 className="mt-4 text-balance text-5xl font-semibold tracking-tight text-primary sm:text-7xl">
                Oops! Something went wrong
              </h1>
              <p className="mt-6 text-pretty text-lg font-medium text-muted-foreground sm:text-xl/8">
                Looks like our server tripped over something. Hang tight while we fix it!
              </p>
              {this.state.error?.message && IS_DEVELOPMENT && (
                <details className="mt-6 max-w-2xl mx-auto">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Show error details
                  </summary>
                  <pre className="mt-4 p-4 bg-muted rounded-md text-left text-sm overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <div className="mt-10 flex flex-row items-center justify-center flex-wrap gap-y-3 gap-x-6">
                <Button variant="secondary" onClick={() => window.history.back()} className="group">
                  <ArrowLeft
                    className="me-2 ms-0 opacity-60 transition-transform group-hover:-translate-x-0.5"
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  Go Back
                </Button>
                <Button onClick={() => window.location.reload()} className="group">
                  <RefreshCw
                    className="me-2 ms-0 opacity-60 transition-transform group-hover:rotate-180"
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  Refresh Page
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;