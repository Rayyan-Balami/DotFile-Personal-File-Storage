import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LogEntry {
  timestamp: string;
  component: string;
  level: "INFO" | "DEBUG" | "ERROR" | "WARN";
  message: string;
}

interface LogState {
  logs: LogEntry[];
  addLogs: (logs: LogEntry[]) => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  hasLogs: () => boolean;
}

export const useLogStore = create<LogState>()(
  persist(
    (set, get) => ({
      logs: [],
      
      addLogs: (newLogs) => {
        if (!newLogs || !Array.isArray(newLogs) || newLogs.length === 0) return;
        
        console.log(`Adding ${newLogs.length} logs to store`);
        set((state) => ({ 
          logs: [...newLogs, ...state.logs].slice(0, 1000) // Keep max 1000 logs
        }));
      },
      
      addLog: (log) => {
        if (!log) return;
        set((state) => ({ 
          logs: [log, ...state.logs].slice(0, 1000) // Keep max 1000 logs
        }));
      },
      
      clearLogs: () => set({ logs: [] }),
      
      hasLogs: () => {
        const state = get();
        return state.logs.length > 0;
      }
    }),
    {
      name: 'algorithm-logs', // localStorage key
    }
  )
);
