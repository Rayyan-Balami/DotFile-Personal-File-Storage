import { Search } from "lucide-react"

import { Label } from "@/components/ui/label"
import { Input } from "./ui/input"

export function SearchForm({ ...props }: React.ComponentProps<"form">) {
  return (
    <form {...props} className="relative flex-grow h-11 max-h-full group">
      <div className="relative h-full flex items-center">
        <Label htmlFor="search" className="sr-only">
          Search
        </Label>
        <Search className="pointer-events-none size-5 opacity-50 select-none gap-4
        group-focus-within:opacity-100 group-focus-within:text-primary transition-all duration-200 ease-in-out" />
        <Input
          id="search"
          placeholder="Type to search..."
          className="flex-1 py-2 rounded-none border-none border-transparent shadow-none focus-visible:ring-0 bg-transparent dark:bg-transparent md:text-base caret-primary"
          autoComplete="off"
        />
      </div>
      <div className="absolute z-10 h-0 bottom-0 group-focus-within:h-[3.5px] left-1/2 -translate-x-1/2 block w-0 group-focus-within:w-[100%] transition-[width,height] duration-300 ease-in-out group-focus-within:bg-primary/80 rounded-t-full" />
    </form>
  )
}