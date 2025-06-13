import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { colorMap, type ColorOption } from "@/config/colors";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useSearchStore } from "@/stores/useSearchStore";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Squircle } from "lucide-react";

// Reusable color grid
const ColorGrid = ({ colors }: { colors: ColorOption[] }) => {
  const { filters, setFilters } = useSearchStore();
  const navigate = useNavigate();
  const routerState = useRouterState();

  const handleColorToggle = (color: ColorOption) => {
    setFilters((prev) => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter((c) => c !== color)
        : [...prev.colors, color],
    }));

    // Navigate to search page if not already there
    if (routerState.location.pathname !== "/search") {
      navigate({ to: "/search" });
    }
  };

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(24px,1fr))] gap-2 p-1">
      {colors.map((color) => (
        <TooltipProvider key={color}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleColorToggle(color)}
                className="relative p-1 rounded transition-all hover:scale-110 cursor-pointer"
              >
                <Squircle
                  className={`size-4.5 stroke-3 mx-auto transition-transform ${
                    filters.colors.includes(color) ? "rotate-45" : ""
                  }`}
                  fill={colorMap[color].secondary}
                  stroke={colorMap[color].primary}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="capitalize">
                {color} {filters.colors.includes(color) ? "(selected)" : ""}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};

export function NavColors() {
  const colors = Object.keys(colorMap) as ColorOption[];
  const letterColors = [
    "fire",
    "tealWave",
    "default",
    "deepSea",
    "coralPop",
    "rosebud",
  ] as ColorOption[];
  const [isOpen, setIsOpen] = useLocalStorage("nav-colors-open", true);
  const { state, isTablet } = useSidebar();

  // Collapsed view (icon trigger with dropdown)
  if (state === "collapsed" && !isTablet) {
    return (
      <SidebarGroup>
        <DropdownMenu>
          <DropdownMenuTrigger className="cursor-pointer grid place-content-center">
            <SidebarMenuButton asChild tooltip="Colors">
              <Squircle
                className="stroke-3"
                fill={colorMap.default.secondary}
                stroke={colorMap.default.primary}
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={`w-48 ${isTablet ? "" : "mb-4"}`}
            side={isTablet ? "bottom" : "right"}
            align={isTablet ? "end" : "start"}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Colors
            </DropdownMenuLabel>{" "}
            <ColorGrid colors={colors} />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarGroup>
    );
  }

  // Expanded view (collapsible with label and color grid)
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="group/collapsible"
    >
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger>
            <span className="group-data-[state=closed]/collapsible:hidden">
              Colors
            </span>
            <span className="hidden group-data-[state=closed]/collapsible:inline">
              {"Colors".split("").map((letter, index) => (
                <span
                  key={index}
                  style={{
                    color: colorMap[letterColors[index]]?.primary || "#000",
                  }}
                  className="font-semibold"
                >
                  {letter}
                </span>
              ))}
            </span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <ColorGrid colors={colors} />
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
