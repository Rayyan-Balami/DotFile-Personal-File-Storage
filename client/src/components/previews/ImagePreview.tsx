import { useViewFile } from "@/api/file/file.query";
import { LazyImage } from "@/components/ui/lazy-image";
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

  React.useEffect(() => {
    if (imageData) {
      const url = URL.createObjectURL(new Blob([imageData]));
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageData]);

  if (!imageUrl) return null;

  return <LazyImage src={imageUrl} alt="Preview" className={className} />;
}
