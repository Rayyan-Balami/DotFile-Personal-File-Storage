import { Copy, Ellipsis, LampDesk, Mail, Tag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";

export function MoreOptions() {
  return (
      <MenubarMenu>
        <MenubarTrigger asChild>
          <Button
            className="group shadow-none first:rounded-l-md last:rounded-r-md rounded-none text-sidebar-foreground hover:text-primary border border-transparent hover:border-border"
            variant="secondary"
          >
            <Ellipsis className="size-4 group-hover:scale-105 transition-transform" />
            <span className="sr-only">More Options</span>
          </Button>
        </MenubarTrigger>
        <MenubarContent>
          <MenubarLabel>More Options</MenubarLabel>
          <MenubarSeparator />
          <MenubarItem className="flex items-center">
            <Copy className="size-4 mr-2" />
            Copy
            <MenubarShortcut>⌘C</MenubarShortcut>
          </MenubarItem>
          <MenubarItem className="flex items-center">
            <Tag className="size-4 mr-2" />
            Tag
            <MenubarShortcut>⌘T</MenubarShortcut>
          </MenubarItem>
          <MenubarItem className="flex items-center">
            <Mail className="size-4 mr-2" />
            Email
            <MenubarShortcut>⌘E</MenubarShortcut>
          </MenubarItem>
          <MenubarItem className="flex items-center">
            <Users className="size-4 mr-2" />
            Share
            <MenubarShortcut>⌘S</MenubarShortcut>
          </MenubarItem>
          <MenubarItem className="flex items-center">
            <LampDesk className="size-4 mr-2" />
            Add to Desk
            <MenubarShortcut>⌘D</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
  );
}
