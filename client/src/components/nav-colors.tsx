import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar"
import { colorMap, type ColorOption } from "@/config/colors"
import { Link } from "@tanstack/react-router"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Squircle } from "lucide-react"

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

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Colors</SidebarGroupLabel>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(24px,1fr))]
       gap-2 p-2">
        {colors.map((color) => (
          <ColorItem key={color} color={color} />
        ))}
      </div>
    </SidebarGroup>
  )
} 