import { create } from 'zustand';

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

export const useLogStore = create<LogState>((set, get) => ({
  logs: [],

  addLogs: (newLogs) => {
    if (!newLogs || !Array.isArray(newLogs) || newLogs.length === 0) return;

    console.log(`Adding ${newLogs.length} logs to store`);
    set({
      logs: newLogs.slice(0, 1000), // keep max 1000 if needed
    });
  },

  addLog: (log) => {
    if (!log) return;
    set({
      logs: [log], // replace entire log list with just this log
    });
  },

  clearLogs: () => set({ logs: [] }),

  hasLogs: () => get().logs.length > 0,
}));
