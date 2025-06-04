import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { colorMap, type ColorOption } from "@/config/colors";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Squircle } from "lucide-react";

// Reusable color grid
const ColorGrid = ({ colors }: { colors: ColorOption[] }) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(24px,1fr))] gap-2 p-2">
    {colors.map((color) => (
      <TooltipProvider key={color}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/" className="block">
              <Squircle
                className="size-4.5 transition-transform hover:scale-110 stroke-3"
                fill={colorMap[color].secondary}
                stroke={colorMap[color].primary}
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p className="capitalize">{color}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ))}
  </div>
);

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
  const { state, isMobile } = useSidebar();

  // Collapsed view (icon trigger with dropdown)
  if (state === "collapsed" && !isMobile) {
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
            className={`w-48 ${isMobile ? "" : "mb-4"}`}
            side={isMobile ? "bottom" : "right"}
            align={isMobile ? "end" : "start"}
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
