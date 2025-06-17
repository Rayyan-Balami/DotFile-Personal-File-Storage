import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FileTextIcon, TerminalIcon, AlarmClockIcon, TrashIcon, DownloadIcon, FilterIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useLogStore } from "@/stores/useLogStore";

// Badge component with improved styling
const Badge = ({
  children,
  variant = "default",
  className = "",
  ...props
}: {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "outline";
  className?: string;
  [key: string]: any;
}) => (
  <div 
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
      variant === "default" ? "bg-primary/10 text-primary" : 
      variant === "secondary" ? "bg-secondary text-secondary-foreground" : 
      "border border-muted bg-transparent hover:bg-muted/30"
    } ${className}`}
    {...props}
  >
    {children}
  </div>
);

function LogSheet() {
  const [open, setOpen] = useState(false);
  const { logs, addLogs, clearLogs } = useLogStore();
  const [activeComponent, setActiveComponent] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Setup fetch interceptor for capturing logs
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
      try {
        // Get request URL for logging
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input instanceof Request ? input.url : '';
        
        // Debug logging for API requests
        if (url.includes('/api/')) {
          console.log(`[Fetch] Making request to: ${url}`);
        }
        
        // Make the actual request
        const response = await originalFetch(input, init);
        
        // Clone the response to read headers and body
        const responseClone = response.clone();
        
        // Check for algorithm logs in headers
        const logsHeader = responseClone.headers.get('X-Algorithm-Logs');
        if (logsHeader) {
          try {
            const parsedLogs = JSON.parse(logsHeader);
            console.log(`[Fetch] Found ${parsedLogs.length} logs in X-Algorithm-Logs header for ${url}`);
            addLogs(parsedLogs);
          } catch (e) {
            console.error('[Fetch] Failed to parse logs header:', e);
          }
        } else if (url.includes('/api/files/') || url.includes('/api/v1/files/')) {
          console.log(`[Fetch] No algorithm logs header found for ${url}`);
        }
        
        // If it's a JSON response, check for logs property
        if (responseClone.headers.get('content-type')?.includes('application/json')) {
          responseClone.json().then(data => {
            const hasUploadLogs = url.includes('/api/files/upload') || url.includes('/api/v1/files/upload');
            
            if (data.logs && Array.isArray(data.logs)) {
              console.log(`[Fetch] Found ${data.logs.length} logs in JSON response body for ${url}`);
              addLogs(data.logs);
              
              if (hasUploadLogs) {
                console.log(`[Upload] Response includes ${data.logs.length} logs, adding to store`);
              }
            } else if (hasUploadLogs) {
              console.log(`[Upload] Response has no logs array`, data);
              
              // For upload endpoints, always query for logs if none in response
              // This is a fallback in case logs aren't attached to response
              setTimeout(() => {
                console.log('[Upload] Fetching logs from /api/logs endpoint as fallback');
                fetch('/api/logs/recent')
                  .then(res => res.json())
                  .then(logsData => {
                    if (logsData.logs && Array.isArray(logsData.logs)) {
                      console.log(`[Upload] Fetched ${logsData.logs.length} logs from fallback endpoint`);
                      addLogs(logsData.logs);
                    } else {
                      console.log('[Upload] No logs found in fallback endpoint');
                    }
                  })
                  .catch(err => console.error('[Upload] Error fetching logs from fallback endpoint', err));
              }, 500);
            }
          }).catch((e) => {
            // Log JSON parsing errors for debugging
            if (url.includes('/api/files/') || url.includes('/api/v1/files/')) {
              console.error(`[Fetch] JSON parsing error for ${url}:`, e);
            }
          });
        }
        
        return response;
      } catch (error) {
        console.error(`[Fetch] Error:`, error);
        return originalFetch(input, init);
      }
    };
    
    // Cleanup function to restore original fetch
    return () => {
      window.fetch = originalFetch;
    };
  }, [addLogs]);

  // Get unique components and levels for filtering
  const components = [...new Set(logs.map(log => log.component))];
  const levels = [...new Set(logs.map(log => log.level))];

  // Apply filters
  const filteredLogs = logs.filter(log => 
    (!activeComponent || log.component === activeComponent) &&
    (!activeLevel || log.level === activeLevel)
  );

  // Format timestamp
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit'
      }) + '.' + date.getMilliseconds().toString().padStart(3, '0');
    } catch (e) {
      return timestamp;
    }
  };

  // Get color based on log level
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'bg-red-100 text-red-700 border-red-200';
      case 'WARN': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'INFO': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DEBUG': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Auto-scroll to bottom when logs are updated
  useEffect(() => {
    if (filteredLogs.length > 0 && open) {
      const logsContainer = document.querySelector('.algorithm-logs-container');
      if (logsContainer) {
        logsContainer.scrollTop = logsContainer.scrollHeight;
      }
    }
  }, [filteredLogs, open]);

  // Export logs function
  const handleExportLogs = () => {
    try {
      const json = JSON.stringify(logs, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `algorithm-logs-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download logs:', e);
    }
  };

  // Clear logs function
  const handleClearLogs = () => {
    clearLogs();
    console.log('Logs cleared');
    try {
      const toast = (window as any).toast;
      if (typeof toast?.success === 'function') {
        toast.success('Logs cleared');
      }
    } catch (e) {} // Ignore if toast isn't available
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
        >
          <TerminalIcon/>
          <span>Logs</span>
          {logs.length > 0 && (
            <Badge variant="secondary">
              {logs.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md lg:max-w-lg overflow-hidden p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <span>Algorithm Logs</span>
            {logs.length > 0 && (
              <Badge variant="outline">
                {logs.length}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Encryption and compression operation logs
          </SheetDescription>
        </SheetHeader>
        
        {/* Collapsible Filters */}
        {logs.length > 0 && (
          <div className="border-b">
            <div 
              className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/30" 
              onClick={() => setShowFilters(!showFilters)}
            >
              <div className="flex items-center gap-2 font-medium text-sm">
                <FilterIcon className="size-4" />
                <span>Filters</span>
                {(activeComponent || activeLevel) && (
                  <Badge className="bg-blue-100 text-blue-700">
                    {(activeComponent ? 1 : 0) + (activeLevel ? 1 : 0)}
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}
                >
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </Button>
            </div>
            
            {showFilters && (
              <div className="px-6 py-3 space-y-3 bg-muted/10">
                <div className="space-y-2">
                  <div className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Component</div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge 
                      variant={activeComponent === null ? "secondary" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setActiveComponent(null)}
                    >
                      All
                    </Badge>
                    {components.map(component => (
                      <Badge 
                        key={component}
                        variant={activeComponent === component ? "secondary" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setActiveComponent(activeComponent === component ? null : component)}
                      >
                        {component}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Level</div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge 
                      variant={activeLevel === null ? "secondary" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setActiveLevel(null)}
                    >
                      All
                    </Badge>
                    {levels.map(level => (
                      <Badge 
                        key={level}
                        variant="outline"
                        className={`cursor-pointer ${activeLevel === level ? getLevelColor(level) : ''}`}
                        onClick={() => setActiveLevel(activeLevel === level ? null : level)}
                      >
                        {level}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Logs display - flex-1 to take remaining space */}
        <div className="flex-1 overflow-auto algorithm-logs-container">
          {filteredLogs.length > 0 ? (
            <div className="divide-y">
              {filteredLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`${index % 2 === 0 ? 'bg-background' : 'bg-muted'} px-6 py-3 text-sm hover:border-l-4 border-l-primary transition-all`}
                >
                  <div className="flex justify-between items-center gap-2 mb-1.5">
                    <div className={`p-1 rounded text-xs ${getLevelColor(log.level)}`}>
                      {log.level}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(log.timestamp)}
                    </span>
                  </div>
                  <div className="font-medium text-foreground mb-0.5">{log.component}</div>
                  <div className={`text-muted-foreground ${log.message.includes('\n') ? 'whitespace-pre-wrap' : ''}`}>
                    {log.message}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <FileTextIcon className="size-8 text-muted-foreground opacity-60" />
              </div>
              <h3 className="font-medium text-lg mb-2">No logs available</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Upload or download files to see algorithm logs for encryption and compression operations
              </p>
            </div>
          )}
        </div>
        
        {/* Footer with actions - only show if there are logs */}
        {filteredLogs.length > 0 && (
          <SheetFooter className="flex flex-row justify-between items-center border-t px-6 py-3 bg-muted/10">
            <div className="flex items-center text-sm text-muted-foreground gap-1">
              <AlarmClockIcon className="size-3.5" />
              <span>{filteredLogs.length} entries</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="h-8"
                onClick={handleExportLogs}
              >
                <DownloadIcon className="size-3.5 mr-1" />
                Export
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={handleClearLogs}
              >
                <TrashIcon className="size-3.5 mr-1" />
                Clear
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default LogSheet;