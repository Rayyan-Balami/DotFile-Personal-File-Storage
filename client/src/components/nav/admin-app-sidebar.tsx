import React from "react";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { Database, Menu, ShieldUser, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo, LogoWithText } from "../logo";

const adminNavItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: Database,
  },
  {
    title: "Users",
    url: "/admin/user",
    icon: UsersRound,
  },
  {
    title: "Admins",
    url: "/admin/admin",
    icon: ShieldUser,
  },
];

function AdminAppSidebar() {
  const matchRoute = useMatchRoute();

  const renderNavItems = (items: typeof adminNavItems) => {
    return items.map((item) => {
      const matchOptions =
        item.url === "/admin"
          ? { to: item.url, fuzzy: false }
          : { to: item.url, fuzzy: true };
      const isActive = !!matchRoute(matchOptions);

      return (
        <Link
          key={item.title}
          to={item.url}
          className={`relative flex items-center gap-2 transition-colors hover:text-primary h-full ${
            isActive ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <item.icon className="h-4 w-4" />
          {item.title}
          <span className={`absolute bottom-0 left-0 right-0 bg-foreground rounded-t-full ${isActive ? "h-[2px]" : "h-0"} bg-primary transition-all ease-in`} />
        </Link>
      );
    });
  };

  return (
    <>
      <nav
        className="hidden font-medium md:flex items-center md:gap-4 md:text-sm lg:gap-6 h-full relative"
      >
        <Link
          to="/admin"
          className="flex items-center justify-center gap-2 text-lg font-semibold md:text-base bg-primary size-8 rounded-full"
        >
          <Logo />
        </Link>

        {renderNavItems(adminNavItems)}
      </nav>

      {/* Mobile Sheet menu remains unchanged */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-4 md:p-6">
          <nav className="grid gap-6 text-lg font-medium">
            <Link to="/admin" className="flex items-center">
              <LogoWithText />
            </Link>
            {adminNavItems.map((item) => {
              const matchOptions =
                item.url === "/admin"
                  ? { to: item.url, fuzzy: false }
                  : { to: item.url, fuzzy: true };
              const isActive = !!matchRoute(matchOptions);

              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`flex items-center gap-2 transition-colors hover:text-primary ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default AdminAppSidebar;
