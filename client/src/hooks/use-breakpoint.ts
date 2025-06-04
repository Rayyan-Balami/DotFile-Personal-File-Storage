import * as React from "react";

// Tailwind's default breakpoints
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

type BreakpointState = {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  width: number;
};

export function useBreakpoint(): BreakpointState {
  const [breakpoint, setBreakpoint] = React.useState<BreakpointState>(() => {
    const width = typeof window !== "undefined" ? window.innerWidth : 0;
    return getBreakpointState(width);
  });

  React.useEffect(() => {
    const update = () => {
      setBreakpoint(getBreakpointState(window.innerWidth));
    };

    window.addEventListener("resize", update);
    update();

    return () => window.removeEventListener("resize", update);
  }, []);

  return breakpoint;
}

function getBreakpointState(width: number): BreakpointState {
  return {
    isMobile: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg && width < breakpoints["2xl"],
    isLargeDesktop: width >= breakpoints["2xl"],
    width,
  };
}
