/**
 * Analytics DTOs for client-side data transfer and type safety
 */

export interface CreationAnalyticsItem {
  date: string; // Format: YYYY-MM-DD
  file: number; // File creation count
  folder: number; // Folder creation count
  total: number; // Total creations (file + folder)
}

export interface CreationAnalyticsParams {
  startDate: string; // Required start date filter (YYYY-MM-DD)
  endDate: string; // Required end date filter (YYYY-MM-DD)
}

export interface SummaryAnalyticsItem {
  type: "users" | "files" | "storage" | "activity";
  label: string;
  currentMonth: number;
  previousMonth: number;
  growthRate: number;
}

export interface FileTypeAnalyticsItem {
  type: string; // MIME type of the file
  count: number; // Number of files with this type
}

export interface UserStorageConsumptionAnalyticsItem {
  label: "100%" | "75%" | "50%" | "25%" | "0%";
  count: number; // Number of users in this storage consumption category
}

export interface UserGrowthAnalytics {
  month: string; // Month name (e.g., "Jan", "Feb", "Mar")
  count: number; // Number of new users in this month
}
