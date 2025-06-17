import fileApi from "@/api/file/file.api";
import { useDownloadFile } from "@/api/file/file.query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useDialogStore } from "@/stores/useDialogStore";
import { useLogStore } from "@/stores/useLogStore";
import API from "@/lib/axios";
import { DocumentItem } from "@/types/folderDocumnet";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Music,
  RotateCcw,
  Telescope,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function FilePreviewDialog() {
  const {
    filePreviewDialogOpen,
    filePreviewItems,
    filePreviewCurrentIndex,
    closeFilePreviewDialog,
    setFilePreviewIndex,
  } = useDialogStore();

  const currentFile = filePreviewItems[filePreviewCurrentIndex] as
    | DocumentItem
    | undefined;
  const previewRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);
  const downloadFile = useDownloadFile();

  // View state
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [fitScale, setFitScale] = useState(1);

  // Calculate the scale needed to fit the media exactly within the container
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

    // Return the scale that makes the media fit exactly within the container
    return Math.min(scaleX, scaleY);
  }, [currentFile]);

  // Reset view to initial state (fit-to-container as 100%)
  const resetView = useCallback(() => {
    const newFitScale = calculateFitScale();
    setFitScale(newFitScale);
    setZoom(1); // 1 = 100% = fit to container
    setPosition({ x: 0, y: 0 });
  }, [calculateFitScale]);

  // Handle wheel events for zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!currentFile) return;

      const canZoom =
        currentFile.type.startsWith("image/") ||
        currentFile.type.startsWith("video/");

      if (!canZoom) return;

      e.preventDefault();

      if (e.ctrlKey) {
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom((prev) => Math.min(Math.max(prev * zoomDelta, 0.1), 5));
      }
    },
    [currentFile]
  );

  // Handle media load events
  const handleMediaLoad = useCallback(() => {
    // Wait a bit for the media to be fully rendered before calculating fit scale
    setTimeout(() => {
      resetView();
    }, 50);
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
      const result = await downloadFile.mutateAsync({
        fileId: currentFile.id,
        fallbackFilename: `${currentFile.name}.${currentFile.extension}`,
      });
      toast.success(`Downloaded "${result.filename}"`);
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  // Fetch logs separately when file preview is opened
  useEffect(() => {
    if (!currentFile || !filePreviewDialogOpen) return;

    const fetchPreviewLogs = async () => {
      try {
        // Make a log-only request to ensure we get logs even with direct URL file preview
        await fetch(`${API.defaults.baseURL}/files/${currentFile.id}/view?logs=true`, {
          headers: {
            Accept: 'application/json'
          }
        })
        .then(res => res.json())
        .then(data => {
          if (data.logs && Array.isArray(data.logs)) {
            console.log(`[FilePreviewDialog] Retrieved ${data.logs.length} logs for preview`);
            useLogStore.getState().addLogs(data.logs);
          }
        });
        console.log(`[FilePreviewDialog] Fetched file preview metadata`);
      } catch (error) {
        console.error('[FilePreviewDialog] Failed to fetch preview logs:', error);
      }
    };

    fetchPreviewLogs();
  }, [currentFile?.id, filePreviewDialogOpen]);

  // Zoom functions
  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.2, 5));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.2, 0.1));
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

  // Handle container resize to recalculate fit scale
  useEffect(() => {
    if (!previewRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (
        currentFile &&
        (currentFile.type.startsWith("image/") ||
          currentFile.type.startsWith("video/"))
      ) {
        // Recalculate fit scale when container resizes
        setTimeout(() => {
          const newFitScale = calculateFitScale();
          setFitScale(newFitScale);
        }, 50);
      }
    });

    resizeObserver.observe(previewRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [currentFile, calculateFitScale]);

  const renderPreview = () => {
    if (!currentFile) return null;

    const { id, type: mimeType, name, extension } = currentFile;
    const fileUrl = fileApi.getFileUrl(id);

    // Calculate the actual scale: fitScale * zoom
    // fitScale makes it fit the container (our new 100%), zoom is the user's zoom level
    const actualScale = fitScale * zoom;

    const mediaStyle = {
      transform: `scale(${actualScale}) translate(${position.x / actualScale}px, ${position.y / actualScale}px)`,
      cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
      maxWidth: "none", // Remove constraints to allow proper scaling
      maxHeight: "none",
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
        <div className="h-full size-full bg-white/80">
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

  const canZoomPan =
    currentFile.type.startsWith("image/") ||
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
