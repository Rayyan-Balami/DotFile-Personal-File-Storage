import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { BotMessageSquare } from "lucide-react";
import * as React from "react";
import { Badge } from "./badge";

interface AlertDialogProps {
  title: string | React.ReactNode;
  description: string;
  triggerLabel?: string | React.ReactNode;
  
  closeLabel?: string;
  acceptLabel?: string;
  onAccept?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: "default" | "outline" | "destructive" | "secondary";
  triggerVariant?: "default" | "outline" | "destructive" | "secondary" | "link" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  acceptDelay?: number;
  disabled?: boolean;
  className?: string;
}

const AlertDialog = React.forwardRef<HTMLDivElement, AlertDialogProps>(
  (
    {
      title,
      description,
      triggerLabel = "Open",
      closeLabel = "Close",
      acceptLabel = "Accept",
      onAccept,
      variant = "default",
      triggerVariant = "outline",
      size = "default",
      acceptDelay = 5000,
      disabled = false,
      className,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [countdown, setCountdown] = React.useState(0);
    const { isTablet } = useBreakpoint();

    React.useEffect(() => {
      if (open) {
        setCountdown(acceptDelay / 1000); // Reset countdown when dialog/drawer is opened
        const countdownTimer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownTimer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(countdownTimer);
      }
    }, [open, acceptDelay]);

    interface HandleAcceptEvent extends React.MouseEvent<HTMLButtonElement> {
      preventDefault: () => void;
    }

    const handleAccept = (e: HandleAcceptEvent) => {
      if (e && e.preventDefault) e.preventDefault();
      if (onAccept) onAccept(e);
      setOpen(false);
    };

    const CommonContent = () => (
      <>
        <div className="flex items-start gap-4">
          <Badge
            variant={variant}
            className="rounded-full size-12"
          >
            <BotMessageSquare className="size-7" />
          </Badge>
          <div className="space-y-1.5 text-left">
            <DialogTitle className="flex items-center gap-2 text-black">
              {title}
            </DialogTitle>
            <DialogDescription className="">{description}</DialogDescription>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-6">
          <DialogClose asChild>
            <Button variant="outline" className="bg-white text-black">{closeLabel}</Button>
          </DialogClose>
          <Button
            onClick={handleAccept}
            variant={variant}
            disabled={countdown > 0 || disabled}
            className="gap-2"
          >
            {countdown > 0 ? (
              <>
                {acceptLabel} ({countdown})
              </>
            ) : (
              acceptLabel
            )}{" "}
          </Button>
        </div>
      </>
    );

    return isTablet ? (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant={triggerVariant}
            size={size}
            disabled={disabled}
            className={className}
          >
            {triggerLabel}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>{CommonContent()}</DialogHeader>
        </DialogContent>
      </Dialog>
    ) : (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            type="button"
            variant={triggerVariant}
            size={size}
            disabled={disabled}
            className={className}
          >
            {triggerLabel}
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>{CommonContent()}</DrawerHeader>
        </DrawerContent>
      </Drawer>
    );
  }
);

export default AlertDialog;