import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchStore } from "@/stores/useSearchStore";
import { logger } from "@/utils/logger";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useRef } from "react";

const searchSchema = z.object({
  query: z.string().min(1, "Type something to search"),
});

type SearchFormValues = z.infer<typeof searchSchema>;

interface SearchFormProps {
  id?: string;
}

export function SearchForm({ id }: SearchFormProps) {
  const { query: storeQuery, setQuery } = useSearchStore();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const queryRef = useRef("");
  const isInitialMount = useRef(true);

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      query: "",
    },
  });

  // Sync form with store query when store changes (e.g., when navigating to search page)
  useEffect(() => {
    if (storeQuery !== form.getValues().query) {
      form.setValue("query", storeQuery, { shouldValidate: false });
    }
  }, [storeQuery, form]);

  // Watch the query field and debounce it
  const query = form.watch("query");
  const debouncedQuery = useDebounce(query, 300); // 300ms delay

  // Handle the debounced search - update the store and navigate only when query actively changes
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      queryRef.current = debouncedQuery;
      setQuery(debouncedQuery);
      return;
    }

    // Check if query actually changed
    const queryChanged = queryRef.current !== debouncedQuery;

    if (queryChanged) {
      queryRef.current = debouncedQuery;
      setQuery(debouncedQuery);

      if (
        debouncedQuery.trim() &&
        routerState.location.pathname !== "/search"
      ) {
        navigate({ to: "/search" });
      }
    }

    logger.info("Debounced search query:", debouncedQuery);
  }, [debouncedQuery, setQuery, navigate, routerState.location.pathname]);

  const onSubmit = (data: SearchFormValues) => {
    logger.info("Search submitted immediately:", data);
    setQuery(data.query);

    if (data.query.trim()) {
      navigate({ to: "/search" });
    }
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
