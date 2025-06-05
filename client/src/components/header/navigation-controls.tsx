import { useFolderContents } from "@/api/folder/folder.query";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { useSidebar } from "@/components/ui/sidebar";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ArrowUp, PanelRightOpen } from "lucide-react";

export function NavigationControls() {
  const { toggleSidebar, state, isTablet } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  // Get current folder ID from URL if we're in a folder
  const currentPath = location.pathname;
  const folderId = currentPath.startsWith("/folder/")
    ? currentPath.split("/folder/")[1]
    : undefined;

  // Get folder contents to access path segments
  const { data } = useFolderContents(folderId);
  const pathSegments = data?.data?.folderContents?.pathSegments || [];

  // Handle browser history back
  const handleBack = () => {
    window.history.back();
  };

  // Handle browser history forward
  const handleForward = () => {
    window.history.forward();
  };

  // Handle going up one level in the folder structure
  const handleGoUp = () => {
    // Handle different contexts
    if (currentPath === "/") {
      // Already at root, do nothing
      return;
    } else if (currentPath === "/trash" || currentPath === "/recent") {
      // From trash or recent, go to root
      navigate({ to: "/" });
      return;
    }

    // In a folder context
    if (pathSegments.length > 1) {
      // Get parent folder's ID from path segments (second to last item)
      // If parent is Root or Trash, go to root, otherwise go to parent folder
      const parentSegment = pathSegments[pathSegments.length - 2];
      if (
        parentSegment.id === null ||
        parentSegment.name === "Root" ||
        parentSegment.name === "Trash"
      ) {
        navigate({ to: "/" });
      } else {
        navigate({ to: `/folder/${parentSegment.id}` });
      }
    } else {
      // No parent or at root level folder, go to root
      navigate({ to: "/" });
    }
  };

  return (
    <>
      {(state !== "collapsed" || isTablet) && (
        <Button
          className="group shadow-none rounded-md text-sidebar-foreground hover:text-primary border border-transparent hover:border-border"
          variant="secondary"
          onClick={toggleSidebar}
        >
          <PanelRightOpen
            className={`size-4.25 group-hover:scale-105 transition-transform`}
          />
        </Button>
      )}
      <ButtonGroup orientation="horizontal" className="max-lg:hidden">
        <Button
          className="group shadow-none text-sidebar-foreground hover:text-primary border border-transparent hover:border-border"
          variant="secondary"
          onClick={handleBack}
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-0.25 transition-transform" />
          <span className="sr-only">Go Back</span>
        </Button>
        <Button
          className="group shadow-none text-sidebar-foreground hover:text-primary border border-transparent hover:border-border"
          variant="secondary"
          onClick={handleForward}
        >
          <ArrowRight className="size-4 group-hover:translate-x-0.25 transition-transform" />
          <span className="sr-only">Go Forward</span>
        </Button>
        <Button
          className="group shadow-none text-sidebar-foreground hover:text-primary border border-transparent hover:border-border"
          variant="secondary"
          onClick={handleGoUp}
        >
          <ArrowUp className="size-4 group-hover:-translate-y-0.25 transition-transform" />
          <span className="sr-only">Go One Level Up Directory</span>
        </Button>
      </ButtonGroup>
    </>
  );
}
