import { colorMap, ColorOption } from "@/config/colors";
import { cn } from "@/lib/utils";

interface FolderIconProps {
  className?: string;
  color?: ColorOption;
}

export function FolderIcon({ className, color = "default" }: FolderIconProps) {
  // Get colors from the color map with fallback to default
  const primary = colorMap[color]?.primary || colorMap.default.primary;
  const secondary = colorMap[color]?.secondary || colorMap.default.secondary;

  const cornerRadius = 4;

  return (
    <svg
      className={cn("size-5", className)}
      viewBox="0 0 59.39 59.39"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <g id="SVGRepo_iconCarrier">
        <g>
          <g>
            {/* Main folder body with rounded corners */}
            <path
              d={`M${4 + cornerRadius},3.195 
                  L20,3.195 
                  L25,10.195 
                  L${58 - cornerRadius},10.195
                  A${cornerRadius},${cornerRadius} 0 0 1 58,${
                    10.195 + cornerRadius
                  }
                  L58,${54.195 - cornerRadius}
                  A${cornerRadius},${cornerRadius} 0 0 1 ${
                    58 - cornerRadius
                  },54.195
                  L${cornerRadius},54.195
                  A${cornerRadius},${cornerRadius} 0 0 1 0,${
                    54.195 - cornerRadius
                  }
                  L0,${3.195 + cornerRadius}
                  A${cornerRadius},${cornerRadius} 0 0 1 ${cornerRadius},3.195
                  Z`}
              fill={secondary}
            />
            {/* Folder tab with rounded top corners */}
            <path
              d={`M25,10.195 
                  L30,17.195 
                  L${58},17.195
                  A${cornerRadius},${cornerRadius} 0 0 0 58,${17.195}
                  L58,${10.195 + cornerRadius}
                  A${cornerRadius},${cornerRadius} 0 0 0 ${
                    58 - cornerRadius
                  },10.195
                  L25,10.195
                  Z`}
              fill={primary}
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
