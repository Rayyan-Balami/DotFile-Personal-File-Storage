"use client";

import { useEffect, useState } from "react";

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
  const [state, setState] = useState<BreakpointState>(() => {
    const width = typeof window !== "undefined" ? window.innerWidth : 0;
    return getBreakpointState(width);
  });

  useEffect(() => {
    const update = () => {
      setState(getBreakpointState(window.innerWidth));
    };

    window.addEventListener("resize", update);
    update();

    return () => window.removeEventListener("resize", update);
  }, []);

  return state;
}

function getBreakpointState(width: number): BreakpointState {
  return {
    isMobile: width < breakpoints.md, // < 768
    isTablet: width < breakpoints.lg, // < 1024
    isDesktop: width < breakpoints["2xl"], // < 1536
    isLargeDesktop: width >= breakpoints["2xl"], // ≥ 1536
    width,
  };
}
