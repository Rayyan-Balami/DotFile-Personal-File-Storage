import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";
import * as React from "react";

interface ResponsiveDialogProps {
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  headerClassName?: string;
  bodyClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  showCancel?: boolean;
}

export function ResponsiveDialog({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
  headerClassName,
  bodyClassName,
  contentClassName,
  footerClassName,
  showCancel = false,
}: ResponsiveDialogProps) {
  const [isOpen, setIsOpen] = React.useState(open || false);

  // Use controlled component if open prop is provided
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange : setIsOpen;

  const { isMobile } = useBreakpoint();

  if (!isMobile) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className={cn("p-0 sm:max-w-lg", contentClassName)}>
          <DialogHeader
            className={cn("sticky top-0 bg-inherit", headerClassName)}
          >
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <div className={bodyClassName}>{children}</div>
          {showCancel && (
            <DialogFooter
              className={cn("sticky bottom-0 bg-inherit", footerClassName)}
            >
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className={cn("", contentClassName)}>
        <DrawerHeader
          className={cn("sticky top-0 bg-inherit", headerClassName)}
        >
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div className={bodyClassName}>{children}</div>
        {showCancel && (
          <DrawerFooter
            className={cn("sticky bottom-0 bg-inherit", footerClassName)}
          >
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
