import { Button } from "@/components/ui/button";
import {
  MenubarContent,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarTrigger
} from "@/components/ui/menubar";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { LampDesk } from "lucide-react";

export function DeskOptions() {
  const [selectedDesk, setSelectedDesk] = useLocalStorage<string | null>("selected-desk", null);

  const desks = [
    { id: "desk1", name: "Work", color: "blue" },
    { id: "desk2", name: "School", color: "blue" },
    { id: "desk3", name: "Personal", color: "green" },
    { id: "desk4", name: "Projects", color: "yellow" },
  ];

  return (
      <MenubarMenu>
        <MenubarTrigger asChild>
          <Button
            className="group shadow-none first:rounded-l-md last:rounded-r-md rounded-none text-sidebar-foreground hover:text-primary border border-transparent hover:border-border"
            variant="secondary"
          >
            <LampDesk className="size-4 group-hover:scale-105 transition-transform" />
            <span className="sr-only">Add to Workspace</span>
          </Button>
        </MenubarTrigger>
        <MenubarContent>
          <MenubarLabel>Add to Workspace</MenubarLabel>
          <MenubarSeparator />
          <MenubarRadioGroup value={selectedDesk || ""} onValueChange={setSelectedDesk}>
            {desks.map(desk => (
              <MenubarRadioItem key={desk.id} value={desk.id} className="flex items-center">
                <span>{desk.name}</span>
                <div className={`ml-auto w-2 h-2 bg-${desk.color}-600 rounded-full mr-2`} />
              </MenubarRadioItem>
            ))}
          </MenubarRadioGroup>
        </MenubarContent>
      </MenubarMenu>
  );
}
