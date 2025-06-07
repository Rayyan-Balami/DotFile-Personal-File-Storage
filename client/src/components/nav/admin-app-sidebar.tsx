import { Link, useMatchRoute } from "@tanstack/react-router";
import { BarChart3, Menu, Package2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "../logo";

const adminNavItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: BarChart3,
  },
  {
    title: "Users",
    url: "/admin/user",
    icon: Users,
  },
  {
    title: "Analytics",
    url: "/admin/analytic",
    icon: BarChart3,
  },
];

function AdminAppSidebar() {
  const matchRoute = useMatchRoute();

  const renderNavItems = (items: typeof adminNavItems) => {
    return items.map((item) => {
      const isActive = !!matchRoute({ to: item.url, fuzzy: true });

      return (
        <Link
          key={item.title}
          to={item.url}
          className={`flex items-center gap-2 transition-colors hover:text-foreground ${
            isActive ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <item.icon className="h-4 w-4" />
          {item.title}
        </Link>
      );
    });
  };

  return (
    <>
      <nav className="hidden font-medium md:flex items-center md:gap-4 md:text-sm lg:gap-6 h-full">
        <Link
          to="/admin"
          className="flex items-center justify-center gap-2 text-lg font-semibold md:text-base bg-primary size-8 rounded-full"
        >
          <Logo />
        </Link>
        {renderNavItems(adminNavItems)}
      </nav>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              to="/admin"
              className="flex items-center justify-center gap-2 text-lg font-semibold md:text-base bg-primary size-8 rounded-full"
            >
              <Logo />
            </Link>
            {adminNavItems.map((item) => {
              const isActive = !!matchRoute({ to: item.url, fuzzy: true });

              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`flex items-center gap-2 transition-colors hover:text-foreground ${
                    isActive ? "text-foreground" : "text-muted-foreground"
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
