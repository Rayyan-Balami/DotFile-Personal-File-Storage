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

  const currentFile = filePreviewItems[filePreviewCurrentIndex] as
    | DocumentItem
    | undefined;

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Calculate initial zoom scale when image loads
  const calculateInitialZoom = useCallback(() => {
    if (
      !imgRef.current ||
      !previewRef.current ||
      !currentFile?.type.startsWith("image/")
    )
      return;

    const img = imgRef.current;
    const container = previewRef.current;

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const scaleX = containerWidth / naturalWidth;
    const scaleY = containerHeight / naturalHeight;
    const fitScale = Math.min(scaleX, scaleY, 1); // Never scale up > 1 initially

    setZoom(fitScale);
    setPosition({ x: 0, y: 0 });
  }, [currentFile]);

  const handleImageLoad = useCallback(() => {
    calculateInitialZoom();
  }, [calculateInitialZoom]);

  const handlePrevious = useCallback(() => {
    if (filePreviewCurrentIndex > 0) {
      setFilePreviewIndex(filePreviewCurrentIndex - 1);
      resetView();
    }
  }, [filePreviewCurrentIndex, setFilePreviewIndex]);

  const handleNext = useCallback(() => {
    if (filePreviewCurrentIndex < filePreviewItems.length - 1) {
      setFilePreviewIndex(filePreviewCurrentIndex + 1);
      resetView();
    }
  }, [filePreviewCurrentIndex, filePreviewItems.length, setFilePreviewIndex]);

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
  const zoomIn = () => setZoom((prev) => Math.min(prev * 1.2, 5));
  const zoomOut = () => setZoom((prev) => Math.max(prev / 1.2, 0.1));
  const resetView = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Pan/drag functions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return; // Only allow dragging when zoomed
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

  // Trackpad/wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!currentFile) return;

      // Check if it's a zoomable file type
      const canZoomFile =
        currentFile.type.startsWith("image/") ||
        currentFile.type === "application/pdf" ||
        currentFile.type.startsWith("text/");

      if (!canZoomFile) return;

      e.preventDefault();

      // Detect if it's a pinch gesture (ctrl key is held during trackpad pinch)
      if (e.ctrlKey) {
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom((prevZoom) => Math.min(Math.max(prevZoom * zoomDelta, 0.1), 5));
      }
    },
    [currentFile]
  );

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

  // Add wheel event listener for trackpad zoom
  useEffect(() => {
    const previewElement = previewRef.current;
    if (previewElement) {
      previewElement.addEventListener("wheel", handleWheel, { passive: false });
      return () => {
        previewElement.removeEventListener("wheel", handleWheel);
      };
    }
  }, [handleWheel]);

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
  ]);

  // Calculate initial zoom when file changes
  useEffect(() => {
    if (currentFile?.type.startsWith("image/")) {
      calculateInitialZoom();
    } else {
      resetView();
    }
  }, [currentFile?.id, calculateInitialZoom]);

  const renderPreview = () => {
    if (!currentFile) return null;

    const { id, type: mimeType, name, extension } = currentFile;
    const fileUrl = fileApi.getFileUrl(id);

    if (mimeType.startsWith("image/")) {
      return (
        <img
          ref={imgRef}
          src={fileUrl}
          alt={name}
          className="max-w-full max-h-full select-none object-contain"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
            width: "auto",
            height: "auto",
          }}
          onMouseDown={handleMouseDown}
          onLoad={handleImageLoad}
          draggable={false}
        />
      );
    }

    if (mimeType === "application/pdf") {
      return (
        <iframe
          src={`${fileUrl}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
          title={name}
          className="flex-1 min-h-full border-none"
          style={{
            cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          }}
          onMouseDown={handleMouseDown}
        />
      );
    }

    if (mimeType.startsWith("video/")) {
      return (
        <video
          src={fileUrl}
          controls
          className="max-w-full max-h-full"
          style={{
            transform: `scale(${zoom})`,
          }}
        />
      );
    }

    if (mimeType.startsWith("audio/")) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-purple-50 rounded-lg p-8">
          <Music className="w-16 h-16 text-purple-500 mb-4" />
          <h3 className="text-lg font-medium text-purple-700 mb-4">
            {name}.{extension}
          </h3>
          <audio controls className="w-full max-w-md">
            <source src={fileUrl} type={mimeType} />
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    }

    if (mimeType.startsWith("text/")) {
      return (
        <iframe
          src={fileUrl}
          title={name}
          className="w-full h-full border-none"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          }}
          onMouseDown={handleMouseDown}
        />
      );
    }

    // Fallback for unsupported file types
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

  const canZoom =
    currentFile.type.startsWith("image/") ||
    currentFile.type.startsWith("text/");

  return (
    <Dialog open={filePreviewDialogOpen} onOpenChange={closeFilePreviewDialog}>
      <DialogContent className="min-w-full min-h-full max-w-screen max-h-screen bg-background/80 rounded-none flex flex-col px-2 py-4 gap-4 focus:outline-none">
        {/* sticky Header */}
        <div className="sticky top-0 z-50 flex items-center justify-center flex-wrap backdrop-blur-sm">
          <h2 className="text-sm truncate">
            {currentFile.name}.{currentFile.extension}
          </h2>
        </div>

        {/* Preview Area */}
        <div
          ref={previewRef}
          className="flex-1 flex items-center justify-center overflow-hidden rounded-md relative"
        >
          {renderPreview()}
        </div>

        {/* sticky footer */}
        <div className="sticky bottom-0 z-50 flex items-center justify-center gap-4 flex-wrap backdrop-blur-sm">
          {filePreviewItems.length > 1 && (
            <span className="text-sm">
              {filePreviewCurrentIndex + 1} of {filePreviewItems.length}
            </span>
          )}
          {canZoom && (
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
