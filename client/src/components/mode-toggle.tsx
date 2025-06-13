import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Airplay, Moon, Sun } from "lucide-react";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Badge variant="secondary" className="p-0 rounded-full gap-0">
      <span className="sr-only">Toggle theme</span>
      <Button
        variant={theme === "light" ? "outline" : "ghost"}
        size="icon"
        className={`rounded-full size-6 ${theme === "light" ? "" : "text-muted-foreground"} hover:text-primary`}
        onClick={() => setTheme("light")}
      >
        <Sun className="size-3.5" />
      </Button>
      <Button
        variant={theme === "dark" ? "outline" : "ghost"}
        size="icon"
        className={`rounded-full size-6 ${theme === "dark" ? "" : "text-muted-foreground"} hover:text-primary`}
        onClick={() => setTheme("dark")}
      >
        <Moon className="size-3.5" />
      </Button>
      <Button
        variant={theme === "system" ? "outline" : "ghost"}
        size="icon"
        className={`rounded-full size-6 ${theme === "system" ? "" : "text-muted-foreground"} hover:text-primary`}
        onClick={() => setTheme("system")}
      >
        <Airplay className="size-3.5" />
      </Button>
    </Badge>
  );
}
