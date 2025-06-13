import API from "@/lib/axios";

/**
 * Analytics API functions for admin dashboard
 */
export const analyticsApi = {
  // Get creation analytics (files and folders combined)
  getCreationAnalytics: (params: { startDate: string; endDate: string }) =>
    API.get("/analytics/creation", { params }),

  // Get summary statistics
  getSummaryAnalytics: () => API.get("/analytics/summary"),

  // Get file type distribution analytics
  getFileTypeAnalytics: () => API.get("/analytics/file-types"),

  // Get user storage consumption analytics
  getUserStorageConsumptionAnalytics: () =>
    API.get("/analytics/user-storage-consumption"),

  // Get monthly user registrations analytics
  getMonthlyUserRegistrationsAnalytics: () =>
    API.get("/analytics/monthly-user-registrations"),
};

export default analyticsApi;
