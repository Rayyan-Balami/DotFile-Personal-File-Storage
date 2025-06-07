/**
 * Analytics DTOs for client-side data transfer and type safety
 */

export interface CreationAnalyticsItem {
  date: string; // Format: YYYY-MM-DD
  file: number; // File creation count
  folder: number; // Folder creation count
  total: number; // Total creations (file + folder)
}

export interface CreationAnalyticsResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    analytics: CreationAnalyticsItem[];
  };
  timestamp: string;
}

export interface CreationAnalyticsParams {
  startDate: string; // Required start date filter (YYYY-MM-DD)
  endDate: string; // Required end date filter (YYYY-MM-DD)
}
