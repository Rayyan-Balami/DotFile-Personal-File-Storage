import { CreationAnalyticsDto, CreationAnalyticsRequestDto, CreationAnalyticsResponseDto } from "@api/analytics/analytics.dto.js";
import fileService from "@api/file/file.service.js";
import folderService from "@api/folder/folder.service.js";
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
}

export default new AnalyticsService();