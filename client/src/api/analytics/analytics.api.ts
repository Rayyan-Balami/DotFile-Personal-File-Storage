import API from "@/lib/axios";

/**
 * Analytics API functions for admin dashboard
 */
export const analyticsApi = {
  // Get creation analytics (files and folders combined)
  getCreationAnalytics: (params: { 
    startDate: string; 
    endDate: string; 
  }) => API.get("/analytics/creation", { params }),

  // Get summary statistics
  getSummaryStats: () => API.get("/analytics/summary"),

  // Get user growth analytics
  getUserGrowthAnalytics: (params?: { 
    startDate?: string; 
    endDate?: string; 
  }) => API.get("/analytics/users", { params }),

  // Get comprehensive analytics (all data)
  getComprehensiveAnalytics: (params?: { 
    startDate?: string; 
    endDate?: string; 
  }) => API.get("/analytics/comprehensive", { params }),
};

export default analyticsApi;
