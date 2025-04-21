import {
  BriefcaseBusiness,
  Clock,
  Command,
  File,
  Folder,
  FolderClosed,
  GraduationCap,
  Laptop,
  LifeBuoy,
  PanelRightClose,
  Send,
  Settings2,
  Smile,
  Trash2,
  UsersRound,
} from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavDesks } from "./nav-desks";
import { NavProjects } from "./nav-projects";
import { Button } from "./ui/button";
import { ModeToggle } from "./mode-toggle";

const data = {
  user: {
    name: "Rayyan Balami",
    email: "visionrayyan60517@gmail.com",
    avatar:
      "https://media.licdn.com/dms/image/v2/D4D03AQGizvt-ieuMdg/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1728224248346?e=1749081600&v=beta&t=wcQmxi3RpU0mFDbHOgO8ncXtNd9Pwk80a1X5_ndSsKE",
  },
  navMain: [
    {
      title: "Recent",
      url: "#",
      icon: Clock,
    },
    {
      title: "File Manager",
      url: "#",
      icon: FolderClosed,
    },
    {
      title: "Shared with Me",
      url: "#",
      icon: UsersRound,
    },
    {
      title: "Trash",
      url: "#",
      icon: Trash2,
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Folder,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: Folder,
    },
    {
      name: "Travel",
      url: "#",
      icon: File,
    },
  ],
  tree: [
    [
      "app",
      [
        "api",
        ["hello", ["route.ts"]],
        "page.tsx",
        "layout.tsx",
        ["blog", ["page.tsx"]],
      ],
    ],
    [
      "components",
      ["ui", "button.tsx", "card.tsx"],
      "header.tsx",
      "footer.tsx",
    ],
    ["lib", ["util.ts"]],
    ["public", "favicon.ico", "vercel.svg"],
    ".eslintrc.json",
    ".gitignore",
    "next.config.js",
    "tailwind.config.js",
    "package.json",
    "README.md",
  ],
  desks: [
    {
      name: "Work",
      url: "#",
      colorClass: "text-blue-600",
      icon: BriefcaseBusiness,
    },
    {
      name: "School",
      url: "#",
      colorClass: "text-blue-600",
      icon: GraduationCap,
    },
    {
      name: "Personal",
      url: "#",
      colorClass: "text-green-600",
      icon: Smile,
    },
    {
      name: "Projects",
      url: "#",
      colorClass: "text-yellow-600",
      icon: Laptop,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { toggleSidebar, state, isMobile } = useSidebar();
  return (
    <Sidebar className="border-muted-foreground/15" collapsible={"icon"} {...props}>
      { state === "collapsed" && !isMobile && (
        <Button
          className="group h-(--header-height) w-[3rem] rounded-none"
          variant="ghost"
          onClick={toggleSidebar}
        >
          <PanelRightClose
            className="size-4.25 text-sidebar-foreground hover:text-sidebar-accent-foreground group-hover:scale-105 transition-transform"
          />
        </Button>
      )}
      <SidebarHeader>
        <SidebarMenu className={state === "collapsed" && !isMobile ? "gap-2" : ""}>
          <SidebarMenuItem >
            <SidebarMenuButton size="lg" asChild tooltip="Acme Inc">
              <a href="#">
                <div className="bg-amber-600 text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Acme Inc</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <NavUser user={data.user} />
        </SidebarMenu>
      <SidebarSeparator />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
        <NavDesks items={data.desks} />
        {/* <NavFiles treeData={data.tree} />
        <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter className="h-(--footer-height) grid place-content-center">
        <SidebarMenu>
          <ModeToggle />

        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
