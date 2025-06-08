import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ComboboxProps {
  list: { value: string; label: string; disabled?: boolean }[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  className?: string;
  multiple?: boolean;
  disabled?: boolean;
}

const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    { list, value, onChange, placeholder = "Select Item", className, multiple = false, disabled = false },
    _ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const [triggerWidth, setTriggerWidth] = React.useState(0);

    React.useEffect(() => {
      if (triggerRef.current) {
        setTriggerWidth(triggerRef.current.offsetWidth);
      }
    }, [open]);

    const handleSelect = (selectedValue: string) => {
      if (disabled) return;
      if (multiple) {
        if (Array.isArray(value)) {
          if (value.includes(selectedValue)) {
            onChange(value.filter((v) => v !== selectedValue));
          } else {
            onChange([...value, selectedValue]);
          }
        }
      } else {
        onChange(selectedValue === value ? "" : selectedValue);
      }
      if (!multiple) setOpen(false);
    };

    const displayValue = (): string => {
      if (multiple) {
        return Array.isArray(value) && value.length > 0 ? `${value.length} selected` : placeholder;
      }
      return typeof value === "string" && value ? list.find((item) => item.value === value)?.label || placeholder : placeholder;
    };

    return (
      <Popover open={open} onOpenChange={(state) => !disabled && setOpen(state)}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal hover:bg-popover capitalize",
              className
            )}
            onClick={() => !disabled && setOpen(!open)}
          >
            <span className="whitespace-pre-line line-clamp-1 text-left">{displayValue()}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 " style={{ minWidth: triggerWidth }}>
          <Command>
            <CommandInput placeholder="Search..." disabled={disabled} />
            <CommandList>
              <CommandEmpty>No item found.</CommandEmpty>
              <CommandGroup>
                {list.map((item) => (
                  <CommandItem
                    value={item.label}
                    key={item.value}
                    onSelect={() => handleSelect(item.value)}
                    disabled={item.disabled || disabled}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        multiple
                          ? Array.isArray(value) && value.includes(item.value)
                            ? "opacity-100"
                            : "opacity-0"
                          : item.value === value
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="truncate capitalize">{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

export { Combobox };