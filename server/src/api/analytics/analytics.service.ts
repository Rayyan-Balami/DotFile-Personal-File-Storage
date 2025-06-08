import { CreationAnalyticsDto, CreationAnalyticsRequestDto, CreationAnalyticsResponseDto, SummaryAnalyticsItemDto } from "@api/analytics/analytics.dto.js";
import fileService from "@api/file/file.service.js";
import folderService from "@api/folder/folder.service.js";
import userService from "@api/user/user.service.js";
import { ApiError } from "@utils/apiError.utils.js";
import logger from "@utils/logger.utils.js";

/**
 * Analytics service to generate creation analytics for files and folders
 */
class AnalyticsService {

  /**
   * Get combined creation analytics for files and folders by date range
   * @param startDate - Start date for analytics (YYYY-MM-DD format)
   * @param endDate - End date for analytics (YYYY-MM-DD format)
   * @returns Array of daily creation counts combined for files and folders
   */
  async getCreationAnalytics(
    startDate: string,
    endDate: string
  ): Promise<CreationAnalyticsResponseDto[]> {
    logger.info(`Getting creation analytics from ${startDate} to ${endDate}`);

    // Get both file and folder analytics in parallel
    const [fileAnalytics, folderAnalytics] = await Promise.all([
      fileService.getFileCreationAnalytics(startDate, endDate),
      folderService.getFolderCreationAnalytics(startDate, endDate)
    ]);

    // Create a map to combine the data by date
    const combinedData = new Map<string, { file: number; folder: number }>();

    // Process file analytics
    fileAnalytics.forEach(item => {
      combinedData.set(item.date, {
        file: item.count,
        folder: 0
      });
    });

    // Process folder analytics
    folderAnalytics.forEach(item => {
      const existing = combinedData.get(item.date);
      if (existing) {
        existing.folder = item.count;
      } else {
        combinedData.set(item.date, {
          file: 0,
          folder: item.count
        });
      }
    });

    // Convert map to array and sort by date
    const result: CreationAnalyticsResponseDto[] = Array.from(combinedData.entries())
      .map(([date, counts]) => ({
        date,
        file: counts.file,
        folder: counts.folder,
        total: counts.file + counts.folder
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Return empty array instead of throwing error when no data found
    // This is better UX - no data is a valid state, not an error
    logger.debug(`Retrieved combined creation analytics: ${result.length} data points`);
    return result;
  }

  /**
   * Get summary analytics for dashboard with growth rates
   * @returns Summary analytics array with current month vs previous month comparison
   */
  async getSummaryAnalytics(): Promise<SummaryAnalyticsItemDto[]> {
    logger.info("Getting summary analytics");

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Helper function to calculate growth rate
    const calculateGrowthRate = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Get all statistics in parallel using proper service layer methods
    const [
      currentMonthUsers,
      previousMonthUsers,
      currentMonthFiles,
      previousMonthFiles,
      currentMonthStorage,
      previousMonthStorage,
      currentActiveUsers,
      previousActiveUsers
    ] = await Promise.all([
      // User statistics
      userService.getUserCountByDateRange(currentMonthStart, currentMonthEnd),
      userService.getUserCountByDateRange(previousMonthStart, currentMonthStart),
      
      // File statistics
      fileService.getFileCountByDateRange(currentMonthStart, currentMonthEnd),
      fileService.getFileCountByDateRange(previousMonthStart, currentMonthStart),
      
      // Storage statistics
      fileService.getStorageSizeByDateRange(currentMonthStart, currentMonthEnd),
      fileService.getStorageSizeByDateRange(previousMonthStart, currentMonthStart),
      
      // Active users statistics
      userService.getActiveUsersCountByDateRange(currentMonthStart, currentMonthEnd),
      userService.getActiveUsersCountByDateRange(previousMonthStart, currentMonthStart)
    ]);

    const summaryAnalytics: SummaryAnalyticsItemDto[] = [
      {
        type: 'users',
        label: 'Total Users',
        currentMonth: currentMonthUsers,
        previousMonth: previousMonthUsers,
        growthRate: calculateGrowthRate(currentMonthUsers, previousMonthUsers)
      },
      {
        type: 'files',
        label: 'Total Files',
        currentMonth: currentMonthFiles,
        previousMonth: previousMonthFiles,
        growthRate: calculateGrowthRate(currentMonthFiles, previousMonthFiles)
      },
      {
        type: 'storage',
        label: 'Storage Used',
        currentMonth: currentMonthStorage,
        previousMonth: previousMonthStorage,
        growthRate: calculateGrowthRate(currentMonthStorage, previousMonthStorage)
      },
      {
        type: 'activity',
        label: 'Active Users',
        currentMonth: currentActiveUsers,
        previousMonth: previousActiveUsers,
        growthRate: calculateGrowthRate(currentActiveUsers, previousActiveUsers)
      }
    ];

    logger.debug(`Retrieved summary analytics:`, summaryAnalytics);
    return summaryAnalytics;
  }

}

export default new AnalyticsService();