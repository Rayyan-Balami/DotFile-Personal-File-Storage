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
  getSummaryAnalytics: () => API.get("/analytics/summary"),
};

export default analyticsApi;
