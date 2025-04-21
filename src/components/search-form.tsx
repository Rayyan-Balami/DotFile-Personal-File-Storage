import { Search } from "lucide-react"

import { Label } from "@/components/ui/label"
import { Input } from "./ui/input"

export function SearchForm({ ...props }: React.ComponentProps<"form">) {
  return (
    <form {...props} className="flex-1 h-full">
      <div className="relative flex items-center h-full mx-6">
        <Label htmlFor="search" className="sr-only">
          Search
        </Label>
        <Search className="pointer-events-none size-5 opacity-50 select-none gap-4" />
        <Input
          id="search"
          placeholder="Type to search..."
          className="h-full py-2 rounded-none border-none border-transparent shadow-none focus-visible:ring-0 bg-transparent dark:bg-transparent md:text-base"
        />
      </div>
    </form>
  )
}
