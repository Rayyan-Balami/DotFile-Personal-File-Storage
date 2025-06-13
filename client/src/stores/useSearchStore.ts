import { create } from 'zustand';

interface SearchFilters {
  itemType: string;
  fileType: string[];
  dateRange: { from: Date | undefined; to: Date | undefined };
  isPinned: boolean;
}

interface SearchState {
  // Search query
  query: string;
  setQuery: (query: string) => void;

  // Search filters
  filters: SearchFilters;
  setFilters: (filters: SearchFilters | ((prev: SearchFilters) => SearchFilters)) => void;

  // Search results and state
  isSearching: boolean;
  setIsSearching: (isSearching: boolean) => void;
  
  // Clear search
  clearSearch: () => void;
  
  // Active filters count
  getActiveFiltersCount: () => number;
}

const initialFilters: SearchFilters = {
  itemType: "all",
  fileType: [],
  dateRange: { from: undefined, to: undefined },
  isPinned: false,
};

export const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  setQuery: (query: string) => set({ query }),

  filters: initialFilters,
  setFilters: (filters: SearchFilters | ((prev: SearchFilters) => SearchFilters)) => 
    set((state) => ({ 
      filters: typeof filters === 'function' ? filters(state.filters) : filters 
    })),

  isSearching: false,
  setIsSearching: (isSearching: boolean) => set({ isSearching }),

  clearSearch: () => set({ 
    query: "", 
    filters: initialFilters,
    isSearching: false 
  }),

  getActiveFiltersCount: () => {
    const { filters } = get();
    let count = 0;
    
    if (filters.itemType !== "all") count++;
    if (filters.fileType.length > 0) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.isPinned) count++;
    
    return count;
  },
}));
