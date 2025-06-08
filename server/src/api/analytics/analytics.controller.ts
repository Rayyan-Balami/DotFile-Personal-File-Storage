import analyticsService from "@api/analytics/analytics.service.js";
import fileService from "@api/file/file.service.js";
import { CreationAnalyticsRequestDto } from "@api/analytics/analytics.dto.js";
import { ApiError } from "@utils/apiError.utils.js";
import { ApiResponse } from "@utils/apiResponse.utils.js";
import asyncHandler from "@utils/asyncHandler.utils.js";
import logger from "@utils/logger.utils.js";
import { Request, Response } from "express";

/**
 * Analytics controller: Handles analytics endpoints for admin users
 */
class AnalyticsController {
  
  /**
   * Get combined creation analytics for files and folders by date range
   * @param startDate - Required start date query parameter (YYYY-MM-DD)
   * @param endDate - Required end date query parameter (YYYY-MM-DD)
   * @returns Array of daily creation counts for both files and folders
   */
  getCreationAnalytics = asyncHandler(async (req: Request, res: Response) => {
    logger.info("Getting creation analytics for files and folders");
    
    const { startDate, endDate } = req.query as { startDate: string; endDate: string };
    
    // Get combined creation analytics from analytics service
    const analytics = await analyticsService.getCreationAnalytics(startDate, endDate);
    
    res.json(
      new ApiResponse(
        200, 
        { analytics }, 
        "Creation analytics retrieved successfully"
      )
    );
  });  /**
   * Get summary analytics for dashboard
   * @returns Summary analytics with current month vs previous month comparison
   */
  getSummaryAnalytics = asyncHandler(async (req: Request, res: Response) => {
    logger.info("Getting summary analytics for dashboard");
    
    // Get summary analytics from analytics service
    const analyticsArray = await analyticsService.getSummaryAnalytics();
    
    res.json(
      new ApiResponse(
        200, 
        { analytics: analyticsArray },
        "Summary analytics retrieved successfully"
      )
    );
  });

  /**
   * Get file type distribution analytics
   * @returns Array of file types with their counts for pie chart
   */
  getFileTypeAnalytics = asyncHandler(async (req: Request, res: Response) => {
    logger.info("Getting file type distribution analytics");
    
    // Get file type analytics from analytics service
    const analytics = await analyticsService.getFileTypeAnalytics();
    
    res.json(
      new ApiResponse(
        200, 
        { analytics },
        "File type analytics retrieved successfully"
      )
    );
  });

  /**
   * Get user storage consumption distribution analytics
   * @returns Array of storage consumption categories with user counts for bar chart
   */
  getUserStorageConsumptionAnalytics = asyncHandler(async (req: Request, res: Response) => {
    logger.info("Getting user storage consumption analytics");
    
    // Get user storage consumption analytics from analytics service
    const analytics = await analyticsService.getUserStorageConsumptionAnalytics();
    
    res.json(
      new ApiResponse(
        200, 
        { analytics },
        "User storage consumption analytics retrieved successfully"
      )
    );
  });
}

export default new AnalyticsController();