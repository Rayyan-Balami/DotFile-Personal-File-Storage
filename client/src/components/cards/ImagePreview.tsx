import { useViewFile } from "@/api/file/file.query";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import * as React from "react";

interface ImagePreviewProps {
  fileId: string;
  className?: string;
}

export function ImagePreview({
  fileId,
  className = "max-w-full",
}: ImagePreviewProps) {
  const { data: imageData } = useViewFile(fileId);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (imageData) {
      const url = URL.createObjectURL(new Blob([imageData]));
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageData]);

  React.useEffect(() => {
    if (!imageUrl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && imgRef.current) {
            imgRef.current.src = imageUrl;
          }
        });
      },
      { rootMargin: "200px" }
    );

    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [imageUrl]);

  return (
    <div className="relative w-full h-full">
      {/* Show skeleton while loading */}
      {(!imageUrl || !loaded) && (
        <Skeleton className={cn("absolute inset-0 w-full h-full", className)} />
      )}
      
      {imageUrl && (
        <img
          ref={imgRef}
          className={cn(
            "object-center object-cover min-h-full min-w-full transition-opacity will-change-transform",
            loaded ? "opacity-100" : "opacity-0",
            className
          )}
          alt="Preview"
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  );
}
