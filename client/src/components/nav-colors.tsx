import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { colorMap, type ColorOption } from "@/config/colors"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { Link } from "@tanstack/react-router"
import { ChevronDown, Squircle } from "lucide-react"

// Single color item component
const ColorItem = ({ 
  color 
}: { 
  color: ColorOption
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to="/" className="block">
          <Squircle 
            className="size-4.5 rounded-full transition-transform hover:scale-110 stroke-3" 
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
)

export function NavColors() {
  // Get all color options from the colorMap
  const colors = Object.keys(colorMap) as ColorOption[]
  
  // Colors for each letter in "Colors" - Professional blue/premium theme
  const letterColors = ['cyan', 'orange', 'default', 'ocean', 'coral', 'rose'] as ColorOption[]

  // Use local storage to persist the collapsible state
  const [isOpen, setIsOpen] = useLocalStorage('nav-colors-open', true)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger>
            <span className="group-data-[state=closed]/collapsible:hidden">
              Colors
            </span>
            <span className="hidden group-data-[state=closed]/collapsible:inline">
              {"Colors".split('').map((letter, index) => (
                <span 
                  key={index}
                  style={{ color: colorMap[letterColors[index]]?.primary || '#000' }}
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
            <div className="grid grid-cols-[repeat(auto-fill,minmax(24px,1fr))] gap-2 p-2">
              {colors.map((color) => (
                <ColorItem key={color} color={color} />
              ))}
            </div>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
} 