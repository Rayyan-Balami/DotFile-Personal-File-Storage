/**
 * Analytics DTOs for data transfer and type safety
 */

export interface CreationAnalyticsDto {
  date: string; // Format: YYYY-MM-DD
  folder: number; // Folder creation count
  file: number; // File creation count
}

export interface CreationAnalyticsRequestDto {
  startDate: string; // Optional start date filter (YYYY-MM-DD)
  endDate: string; // Optional end date filter (YYYY-MM-DD)
}

export interface CreationAnalyticsResponseDto {
  date: string; // Format: YYYY-MM-DD
  folder: number; // Folder creation count
  file: number; // File creation count
  total: number; // Total creations (folder + file)
}

export interface SummaryAnalyticsItemDto {
  type: 'users' | 'files' | 'storage' | 'activity';
  label: string;
  currentMonth: number;
  previousMonth: number;
  growthRate: number;
}

export interface FileTypeAnalyticsDto {
  type: string; // MIME type of the file
  count: number; // Number of files with this type
}

