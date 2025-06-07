import { cn } from "@/lib/utils";
import * as React from "react";
import { useEffect, useRef, useState } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const LazyImage = React.memo(
  ({ src, alt, className }: LazyImageProps) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && imgRef.current) {
              imgRef.current.src = src;
            }
          });
        },
        { rootMargin: "200px" }
      );

      if (imgRef.current) observer.observe(imgRef.current);
      return () => observer.disconnect();
    }, [src]);

    return (
      <img
        ref={imgRef}
        className={cn(
          "object-center object-cover min-h-full min-w-full transition-opacity will-change-transform",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />
    );
  },
  (prevProps, nextProps) => prevProps.src === nextProps.src
);

LazyImage.displayName = "LazyImage";
