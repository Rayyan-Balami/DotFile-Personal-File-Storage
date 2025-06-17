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
import { FileTextIcon, TerminalIcon, AlarmClockIcon, TrashIcon, DownloadIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useLogStore } from "@/stores/useLogStore";

// Simple Badge component
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
    className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
      variant === "default" ? "border-transparent bg-primary text-primary-foreground" : 
      variant === "secondary" ? "border-transparent bg-secondary text-secondary-foreground" : 
      "text-foreground"
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
      case 'ERROR': return 'text-red-500 border-red-500';
      case 'WARN': return 'text-amber-500 border-amber-500';
      case 'INFO': return 'text-blue-500 border-blue-500';
      case 'DEBUG': return 'text-green-500 border-green-500';
      default: return 'text-gray-500 border-gray-500';
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-2 h-8 ${logs.length > 0 ? 'border-blue-500 text-blue-500 hover:text-blue-600' : ''}`}
        >
          <TerminalIcon className={`size-4 ${logs.length > 0 ? 'text-blue-500' : ''}`} />
          <span>Algorithm Logs</span>
          {logs.length > 0 && (
            <Badge variant="default" className="ml-1 bg-blue-500 text-white">
              {logs.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileTextIcon className="size-5" />
            <span>Algorithm Logs</span>
            {logs.length > 0 && (
              <Badge variant="default" className="ml-1 bg-blue-500 text-white">
                {logs.length}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Detailed logs of algorithm operations (encryption, compression)
          </SheetDescription>
        </SheetHeader>
        
        {/* Filters */}
        <div className="p-4 border-b">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="font-medium text-sm">Component:</span>
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
          
          <div className="flex flex-wrap gap-2">
            <span className="font-medium text-sm">Level:</span>
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
                variant={activeLevel === level ? "secondary" : "outline"}
                className={`cursor-pointer ${activeLevel !== level ? getLevelColor(level) : ''}`}
                onClick={() => setActiveLevel(activeLevel === level ? null : level)}
              >
                {level}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Logs display */}
        <div className="flex-1 p-4 h-[70vh] overflow-auto algorithm-logs-container">
          {filteredLogs.length > 0 ? (
            <div className="flex flex-col gap-2">
              {filteredLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`rounded-md border p-3 text-sm ${log.message.includes('\n') ? 'whitespace-pre-wrap' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <Badge variant="outline" className={getLevelColor(log.level)}>
                      {log.level}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(log.timestamp)}
                    </span>
                  </div>
                  <div className="font-medium">{log.component}</div>
                  <div className="mt-1">{log.message}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground">
              <FileTextIcon className="size-12 mb-2 opacity-20" />
              <h3 className="font-medium mb-1">No logs available</h3>
              <p className="text-sm">
                Upload or download a file to see detailed algorithm operation logs
              </p>
            </div>
          )}
        </div>
        
        {/* Footer with actions */}
        {filteredLogs.length > 0 && (
          <SheetFooter className="flex flex-row justify-between border-t p-4">
            <div className="flex items-center text-sm text-muted-foreground">
              <AlarmClockIcon className="size-4 mr-1.5" />
              {filteredLogs.length} log entries
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1.5"
                onClick={() => {
                  try {
                    // Create a downloadable file with the logs
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
                }}
              >
                <DownloadIcon className="size-3.5" />
                Export
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1.5 text-destructive"
                onClick={() => {
                  if (confirm('Are you sure you want to clear all logs?')) {
                    clearLogs();
                  }
                }}
              >
                <TrashIcon className="size-3.5" />
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