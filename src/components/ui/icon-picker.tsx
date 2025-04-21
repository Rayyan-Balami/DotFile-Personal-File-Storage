import React, { useState } from "react";
import { File, Image, Music, Video, Folder, LucideProps } from "lucide-react";

const iconList = [
  { name: "File", Icon: File },
  { name: "Image", Icon: Image },
  { name: "Music", Icon: Music },
  { name: "Video", Icon: Video },
  { name: "Folder", Icon: Folder },
];

interface IconPickerProps {
  onSelect: (icon: React.FC<LucideProps>) => void;
  initialIcon?: React.FC<LucideProps>;
}

export function IconPicker({ onSelect, initialIcon = File }: IconPickerProps) {
  const [selectedIcon, setSelectedIcon] = useState<React.FC<LucideProps>>(initialIcon);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="border p-2 rounded-lg flex items-center gap-2 cursor-pointer">
        {React.createElement(selectedIcon, {
          size: 24,
          className: "text-gray-500",
        })}
        <span>Select an Icon</span>
      </div>
      <div className="grid grid-cols-5 gap-2 border p-2 rounded-lg">
        {iconList.map(({ name, Icon }) => (
          <button
            key={name}
            className={`p-2 hover:bg-gray-200 rounded-md ${
              selectedIcon.displayName === Icon.displayName ? "bg-gray-200" : ""
            }`}
            onClick={() => {
              setSelectedIcon(Icon);
              onSelect(Icon);
            }}
          >
            <Icon size={24} />
          </button>
        ))}
      </div>
    </div>
  );
}
