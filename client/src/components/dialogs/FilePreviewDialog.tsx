// FilePreviewDialog.tsx
import { useCallback, useEffect, useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Music,
  Telescope,
} from "lucide-react";
import { useDialogStore } from "@/stores/useDialogStore";
import { toast } from "sonner";
import fileApi from "@/api/file/file.api";
import { DocumentItem } from "@/types/folderDocumnet";

export default function FilePreviewDialog() {
  const {
    filePreviewDialogOpen,
    filePreviewItems,
    filePreviewCurrentIndex,
    closeFilePreviewDialog,
    setFilePreviewIndex,
  } = useDialogStore();

  const currentFile = filePreviewItems[filePreviewCurrentIndex] as DocumentItem | undefined;
  const previewRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);

  // View state
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Calculate the maximum zoom out scale to fit the media in the container
  const calculateFitScale = useCallback(() => {
    if (!mediaRef.current || !previewRef.current || !currentFile) return 1;

    const container = previewRef.current;
    const media = mediaRef.current;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    let mediaWidth, mediaHeight;
    
    if (currentFile.type.startsWith("image/")) {
      mediaWidth = (media as HTMLImageElement).naturalWidth;
      mediaHeight = (media as HTMLImageElement).naturalHeight;
    } else if (currentFile.type.startsWith("video/")) {
      const videoElement = media as HTMLVideoElement;
      mediaWidth = videoElement.videoWidth || containerWidth;
      mediaHeight = videoElement.videoHeight || containerHeight;
    } else {
      return 1;
    }

    const scaleX = containerWidth / mediaWidth;
    const scaleY = containerHeight / mediaHeight;
    
    return Math.min(scaleX, scaleY, 1); // Never scale up beyond 100% initially
  }, [currentFile]);

  // Reset view to initial state
  const resetView = useCallback(() => {
    const fitScale = calculateFitScale();
    setZoom(fitScale);
    setPosition({ x: 0, y: 0 });
  }, [calculateFitScale]);

  // Handle wheel events for zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!currentFile) return;
      
      const canZoom = currentFile.type.startsWith("image/") || 
                     currentFile.type.startsWith("video/");
      
      if (!canZoom) return;
      
      e.preventDefault();
      
      if (e.ctrlKey) {
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.min(Math.max(prev * zoomDelta, 0.1), 5));
      }
    },
    [currentFile]
  );

  // Handle media load events
  const handleMediaLoad = useCallback(() => {
    resetView();
    // Re-attach wheel event listener after media loads
    const previewElement = previewRef.current;
    if (previewElement && filePreviewDialogOpen) {
      previewElement.removeEventListener("wheel", handleWheel); // Remove any existing listener
      previewElement.addEventListener("wheel", handleWheel, { passive: false });
    }
  }, [resetView, filePreviewDialogOpen, handleWheel]);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (filePreviewCurrentIndex > 0) {
      setFilePreviewIndex(filePreviewCurrentIndex - 1);
    }
  }, [filePreviewCurrentIndex, setFilePreviewIndex]);

  const handleNext = useCallback(() => {
    if (filePreviewCurrentIndex < filePreviewItems.length - 1) {
      setFilePreviewIndex(filePreviewCurrentIndex + 1);
    }
  }, [filePreviewCurrentIndex, filePreviewItems.length, setFilePreviewIndex]);

  // File actions
  const handleDownload = async () => {
    if (!currentFile) return;
    try {
      const link = document.createElement("a");
      link.href = fileApi.getFileUrl(currentFile.id);
      link.download = `${currentFile.name}.${currentFile.extension}`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started");
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  const handlePrint = () => {
    toast.info("Print functionality not yet implemented");
  };

  // Zoom functions
  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  }, []);

  // Pan/drag functions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const previewElement = previewRef.current;
    if (previewElement && filePreviewDialogOpen) {
      // Clean up any existing listeners first
      previewElement.removeEventListener("wheel", handleWheel);
      previewElement.addEventListener("wheel", handleWheel, { passive: false });
      
      return () => {
        previewElement.removeEventListener("wheel", handleWheel);
      };
    }
  }, [handleWheel, filePreviewDialogOpen, currentFile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!filePreviewDialogOpen) return;

      switch (event.key) {
        case "Escape":
          closeFilePreviewDialog();
          break;
        case "ArrowLeft":
          event.preventDefault();
          handlePrevious();
          break;
        case "ArrowRight":
          event.preventDefault();
          handleNext();
          break;
        case "+":
        case "=":
          event.preventDefault();
          zoomIn();
          break;
        case "-":
          event.preventDefault();
          zoomOut();
          break;
        case "0":
          event.preventDefault();
          resetView();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    filePreviewDialogOpen,
    closeFilePreviewDialog,
    handlePrevious,
    handleNext,
    zoomIn,
    zoomOut,
    resetView,
  ]);

  // Reset view when file changes
  useEffect(() => {
    resetView();
  }, [currentFile?.id, resetView]);

  const renderPreview = () => {
    if (!currentFile) return null;

    const { id, type: mimeType, name, extension } = currentFile;
    const fileUrl = fileApi.getFileUrl(id);

    const mediaStyle = {
      transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
      cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
      maxWidth: "100%",
      maxHeight: "100%",
      objectFit: "contain" as const,
    };

    if (mimeType.startsWith("image/")) {
      return (
        <img
          ref={mediaRef as React.RefObject<HTMLImageElement>}
          src={fileUrl}
          alt={name}
          className="select-none"
          style={mediaStyle}
          onMouseDown={handleMouseDown}
          onLoad={handleMediaLoad}
          draggable={false}
        />
      );
    }

    if (mimeType === "application/pdf") {
      return (
        <iframe
          src={`${fileUrl}#zoom=${Math.round(zoom * 100)}`}
          title={name}
          className="w-full h-full border-none"
        />
      );
    }

    if (mimeType.startsWith("video/")) {
      return (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={fileUrl}
          controls
          className="select-none"
          style={mediaStyle}
          onMouseDown={handleMouseDown}
          onLoadedMetadata={handleMediaLoad}
        />
      );
    }

    if (mimeType.startsWith("audio/")) {
      return (
        <div className="flex flex-col items-center justify-center size-full bg-primary/80 rounded-lg p-4 gap-12">
          <Music className="w-16 h-16 text-primary-foreground" />
          <h3 className="text-lg font-medium text-primary-foreground">
            {name}.{extension}
          </h3>
          <audio controls className="w-full max-w-lg">
            <source src={fileUrl} type={mimeType} />
          </audio>
        </div>
      );
    }

    if (mimeType.startsWith("text/")) {
      return (
        <div className="w-full h-full p-4 bg-white/80">
          <iframe
            src={fileUrl}
            title={name}
            className="w-full h-full border-none"
          />
        </div>
      );
    }

    // Fallback for unsupported types
    return (
      <div className="flex flex-col items-center justify-center h-64 rounded-lg p-8 gap-4">
        <Telescope className="size-12" />
        <h3 className="text-lg font-medium">
          {name}.{extension}
        </h3>
        <p className="text-sm text-center text-muted-foreground">
          Preview not available for this file type
        </p>
        <Button onClick={handleDownload} variant="outline" className="mt-4">
          <Download className="w-4 h-4 mr-2" />
          Download to view
        </Button>
      </div>
    );
  };

  if (!currentFile) return null;

  const canZoomPan = currentFile.type.startsWith("image/") || 
                    currentFile.type.startsWith("video/");

  return (
    <Dialog open={filePreviewDialogOpen} onOpenChange={closeFilePreviewDialog}>
      <DialogContent className="min-w-full min-h-full max-w-screen max-h-screen bg-background/80 rounded-none flex flex-col px-2 py-4 gap-4 focus:outline-none">
        {/* Header */}
        <div className="sticky top-0 z-50 flex items-center justify-center flex-wrap backdrop-blur-sm">
          <h2 className="text-sm truncate max-w-[80vw]">
            {currentFile.name}.{currentFile.extension}
          </h2>
        </div>

        {/* Preview Area */}
        <div
          ref={previewRef}
          className={`flex-1 grid overflow-hidden rounded-md relative ${currentFile.type.startsWith("image/") || currentFile.type.startsWith("video/") ? "place-content-center" : "place-items-center"} relative`}
        >
          {renderPreview()}
        </div>

        {/* Footer Controls */}
        <div className="sticky bottom-0 z-50 flex items-center justify-center gap-4 flex-wrap backdrop-blur-sm">
          {filePreviewItems.length > 1 && (
            <span className="text-sm">
              {filePreviewCurrentIndex + 1} of {filePreviewItems.length}
            </span>
          )}
          
          {canZoomPan && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomOut}
                title="Zoom out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm">{Math.round(zoom * 100)}%</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomIn}
                title="Zoom in (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetView}
                title="Reset view (0)"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrint}
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeFilePreviewDialog}
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation Arrows */}
        {filePreviewItems.length > 1 && (
          <>
            {filePreviewCurrentIndex > 0 && (
              <Button
                variant="secondary"
                size="icon"
                className="fixed left-4 top-1/2 -translate-y-1/2 z-40 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background hover:shadow-xl"
                onClick={handlePrevious}
                title="Previous (←)"
              >
                <ChevronLeft className="size-5" />
              </Button>
            )}
            {filePreviewCurrentIndex < filePreviewItems.length - 1 && (
              <Button
                variant="secondary"
                size="icon"
                className="fixed right-4 top-1/2 -translate-y-1/2 z-40 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background hover:shadow-xl"
                onClick={handleNext}
                title="Next (→)"
              >
                <ChevronRight className="size-5" />
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}