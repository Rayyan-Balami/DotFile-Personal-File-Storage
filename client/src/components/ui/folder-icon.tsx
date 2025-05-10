import { cn } from "@/lib/utils";
import React from "react";
import { colorMap, ColorOption } from "@/config/colors";
import { Workspace } from "@/types/desk";
import { WorkspaceIconType } from "@/config/icons";
import * as WorkspaceIcons from "@/config/icons";

interface FolderIconProps {
  className?: string;
  workspace?: Workspace;
}

export function FolderIcon({
  className,
  workspace,
}: FolderIconProps) {
  // If workspace is provided, use its color and icon instead
  const effectiveColor = workspace?.color as ColorOption || "default";
  const effectiveIconType = workspace?.icon as WorkspaceIconType || "folder";
  
  // Fallback to defaults if the values from workspace are invalid
  const primary = colorMap[effectiveColor]?.primary || colorMap.default.primary;
  const secondary = colorMap[effectiveColor]?.secondary || colorMap.default.secondary;
  
  // Fix: Import WorkspaceIcons properly and access the right icon
  const IconComponent = WorkspaceIcons.default[effectiveIconType] || WorkspaceIcons.default.folder;

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
          <foreignObject x="34.39" y="31.195" width="18" height="18">
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: primary,
                borderRadius: "3.5px",
              }}
            >
              {React.createElement(IconComponent, {
                size: 13,
                color: "#FFFFFF",
              })}
            </div>
          </foreignObject>
        </g>
      </g>
    </svg>
  );
}