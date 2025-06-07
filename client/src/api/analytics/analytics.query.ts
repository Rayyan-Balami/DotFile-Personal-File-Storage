import analyticsApi from "@/api/analytics/analytics.api";
import { CreationAnalyticsParams, CreationAnalyticsResponse } from "@/types/analytics.dto";
import { useQuery } from "@tanstack/react-query";

// Query keys
export const ANALYTICS_KEYS = {
  all: ["analytics"] as const,
  creation: (params: CreationAnalyticsParams) => [...ANALYTICS_KEYS.all, "creation", params] as const,
  summary: () => [...ANALYTICS_KEYS.all, "summary"] as const,
  userGrowth: (params?: { startDate?: string; endDate?: string }) => 
    [...ANALYTICS_KEYS.all, "users", params] as const,
  comprehensive: (params?: { startDate?: string; endDate?: string }) => 
    [...ANALYTICS_KEYS.all, "comprehensive", params] as const,
};

/**
 * Hook to get creation analytics for files and folders
 */
export const useCreationAnalytics = (params: CreationAnalyticsParams) =>
  useQuery({
    queryKey: ANALYTICS_KEYS.creation(params),
    queryFn: () => analyticsApi.getCreationAnalytics(params).then((res) => res.data as CreationAnalyticsResponse),
    enabled: !!params.startDate && !!params.endDate,
  });

/**
 * Hook to get summary statistics
 */
export const useSummaryStats = () =>
  useQuery({
    queryKey: ANALYTICS_KEYS.summary(),
    queryFn: () => analyticsApi.getSummaryStats().then((res) => res.data),
  });

/**
 * Hook to get user growth analytics
 */
export const useUserGrowthAnalytics = (params?: { startDate?: string; endDate?: string }) =>
  useQuery({
    queryKey: ANALYTICS_KEYS.userGrowth(params),
    queryFn: () => analyticsApi.getUserGrowthAnalytics(params).then((res) => res.data),
  });

/**
 * Hook to get comprehensive analytics
 */
export const useComprehensiveAnalytics = (params?: { startDate?: string; endDate?: string }) =>
  useQuery({
    queryKey: ANALYTICS_KEYS.comprehensive(params),
    queryFn: () => analyticsApi.getComprehensiveAnalytics(params).then((res) => res.data),
  });
