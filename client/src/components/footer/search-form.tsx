import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/hooks/use-debounce";
import { Search } from "lucide-react";
import { useEffect } from "react";

const searchSchema = z.object({
  query: z.string().min(1, "Type something to search"),
});

type SearchFormValues = z.infer<typeof searchSchema>;

interface SearchFormProps {
  id?: string;
}

export function SearchForm({ id }: SearchFormProps) {
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      query: "",
    },
  });

  // Watch the query field and debounce it
  const query = form.watch("query");
  const debouncedQuery = useDebounce(query); // 300ms delay

  // Handle the debounced search
  useEffect(() => {
    if (debouncedQuery.trim()) {
      console.log("Debounced search query:", debouncedQuery);
      // Here you would typically trigger the search API call
      // or update a search store/context
    }
  }, [debouncedQuery]);

  const onSubmit = (data: SearchFormValues) => {
    console.log("Search submitted immediately:", data);
    // Handle immediate search on form submission (Enter key)
  };

  return (
      <Form {...form}>
        <form
          id={id}
          onSubmit={form.handleSubmit(onSubmit)}
          className="relative flex-grow h-11 max-h-full group"
        >
          <div className="relative h-full flex items-center">
            <Label htmlFor={`${id}-query`} className="sr-only">
              Search
            </Label>
            <Search
              className="pointer-events-none size-5 opacity-50 select-none gap-4
            group-focus-within:opacity-100 group-focus-within:text-primary transition-all duration-200 ease-in-out"
            />
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      {...field}
                      id={`${id}-query`}
                      placeholder="Type to search..."
                      className="w-full py-2 rounded-none border-none border-transparent shadow-none focus-visible:ring-0 bg-transparent dark:bg-transparent md:text-base caret-primary"
                      autoComplete="off"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="absolute z-10 h-0 bottom-0 group-focus-within:h-[3.5px] left-1/2 -translate-x-1/2 block w-0 group-focus-within:w-[100%] transition-[width,height] duration-300 ease-in-out group-focus-within:bg-primary/80 rounded-t-full" />
        </form>
      </Form>
  );
}
