import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - more granular splitting
          if (id.includes('node_modules')) {
            // Core React (separate from other React libraries)
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'react-core';
            }
            
            // React ecosystem libraries
            if (id.includes('react') && !id.includes('router') && !id.includes('query') && !id.includes('react/') && !id.includes('react-dom/')) {
              return 'react-ecosystem';
            }
            
            // Router related
            if (id.includes('@tanstack/react-router')) {
              return 'router-vendor';
            }
            
            // Query related
            if (id.includes('@tanstack/react-query') || id.includes('@tanstack/query-core')) {
              return 'query-vendor';
            }
            
            // Table related
            if (id.includes('@tanstack/react-table') || id.includes('@tanstack/table-core')) {
              return 'table-vendor';
            }
            
            // Radix UI components - split into smaller chunks
            if (id.includes('@radix-ui/react-dialog') || id.includes('@radix-ui/react-popover') || id.includes('@radix-ui/react-dropdown-menu')) {
              return 'radix-overlay';
            }
            if (id.includes('@radix-ui')) {
              return 'radix-vendor';
            }
            
            // Icons and UI
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            
            // Charts and visualization - separate d3 from recharts
            if (id.includes('recharts')) {
              return 'recharts-vendor';
            }
            if (id.includes('d3-')) {
              return 'd3-vendor';
            }
            
            // Form handling
            if (id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'form-vendor';
            }
            if (id.includes('zod')) {
              return 'validation-vendor';
            }
            
            // Date and time
            if (id.includes('date-fns')) {
              return 'date-vendor';
            }
            if (id.includes('react-day-picker')) {
              return 'datepicker-vendor';
            }
            
            // DnD
            if (id.includes('@dnd-kit')) {
              return 'dnd-vendor';
            }
            
            // Styling and themes
            if (id.includes('tailwind') || id.includes('class-variance-authority') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'styling-vendor';
            }
            if (id.includes('next-themes')) {
              return 'theme-vendor';
            }
            
            // State management
            if (id.includes('zustand')) {
              return 'state-vendor';
            }
            if (id.includes('immer')) {
              return 'immer-vendor';
            }
            
            // Command palette
            if (id.includes('cmdk')) {
              return 'cmdk-vendor';
            }
            
            // File handling
            if (id.includes('jszip') || id.includes('react-file-icon')) {
              return 'file-vendor';
            }
            
            // HTTP client
            if (id.includes('axios')) {
              return 'http-vendor';
            }
            
            // Utilities
            if (id.includes('nanoid') || id.includes('sonner') || id.includes('vaul')) {
              return 'utils-vendor';
            }
            
            // Remaining packages
            return 'vendor';
          }
          
          // Store chunks
          if (id.includes('/stores/')) {
            return 'stores';
          }
          
          // API chunks
          if (id.includes('/api/')) {
            return 'api';
          }
          
          // Utils and lib chunks
          if (id.includes('/utils/') || id.includes('/lib/') || id.includes('/hooks/')) {
            return 'utils';
          }
          
          // Components chunks - more granular splitting
          if (id.includes('/components/')) {
            if (id.includes('/views/')) {
              return 'views';
            }
            if (id.includes('/ui/')) {
              return 'ui-components';
            }
            if (id.includes('/dialogs/') || id.includes('/auth-forms/')) {
              return 'form-components';
            }
            if (id.includes('/data-table/')) {
              return 'table-components';
            }
            if (id.includes('/dnd/')) {
              return 'dnd-components';
            }
            if (id.includes('/cards/') || id.includes('/previews/')) {
              return 'display-components';
            }
            if (id.includes('/nav/') || id.includes('/header/') || id.includes('/footer/')) {
              return 'layout-components';
            }
            return 'components';
          }
        },
        chunkFileNames: () => {
          return `assets/[name]-[hash].js`;
        }
      }
    },
    chunkSizeWarningLimit: 300, // Lower the warning limit to catch large chunks earlier
    sourcemap: false, // Disable sourcemaps in production for smaller builds
    minify: 'esbuild', // Use esbuild for faster builds
    target: 'esnext', // Target modern browsers for smaller bundles
  },
});
