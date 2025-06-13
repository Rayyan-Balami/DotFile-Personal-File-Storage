import analyticsApi from "@/api/analytics/analytics.api";
import { CreationAnalyticsParams } from "@/types/analytics.dto";
import { useQuery } from "@tanstack/react-query";

// Query keys
export const ANALYTICS_KEYS = {
  all: ["analytics"] as const,
  creation: (params: CreationAnalyticsParams) =>
    [...ANALYTICS_KEYS.all, "creation", params] as const,
  summary: () => [...ANALYTICS_KEYS.all, "summary"] as const,
  fileTypes: () => [...ANALYTICS_KEYS.all, "fileTypes"] as const,
  userStorageConsumption: () =>
    [...ANALYTICS_KEYS.all, "userStorageConsumption"] as const,
  monthlyUserRegistrations: () =>
    [...ANALYTICS_KEYS.all, "monthlyUserRegistrations"] as const,
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
    queryFn: () =>
      analyticsApi.getCreationAnalytics(params).then((res) => res.data),
    enabled: !!params.startDate && !!params.endDate,
  });

/**
 * Hook to get summary analytics for dashboard
 */
export const useSummaryAnalytics = () =>
  useQuery({
    queryKey: ANALYTICS_KEYS.summary(),
    queryFn: () => analyticsApi.getSummaryAnalytics().then((res) => res.data),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchInterval: 30 * 60 * 1000, // Auto-refetch every 30 minutes
  });

/**
 * Hook to get file type analytics for pie chart
 */
export const useFileTypeAnalytics = () =>
  useQuery({
    queryKey: ANALYTICS_KEYS.fileTypes(),
    queryFn: () => analyticsApi.getFileTypeAnalytics().then((res) => res.data),
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    refetchInterval: 60 * 60 * 1000, // Auto-refetch every hour
  });

/**
 * Hook to get user storage consumption analytics for horizontal bar chart
 */
export const useUserStorageConsumptionAnalytics = () =>
  useQuery({
    queryKey: ANALYTICS_KEYS.userStorageConsumption(),
    queryFn: () =>
      analyticsApi.getUserStorageConsumptionAnalytics().then((res) => res.data),
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    refetchInterval: 60 * 60 * 1000, // Auto-refetch every hour
  });

/**
 * Hook to get monthly user registrations analytics for radar chart
 */
export const useMonthlyUserRegistrationsAnalytics = () =>
  useQuery({
    queryKey: ANALYTICS_KEYS.monthlyUserRegistrations(),
    queryFn: () =>
      analyticsApi
        .getMonthlyUserRegistrationsAnalytics()
        .then((res) => res.data),
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    refetchInterval: 60 * 60 * 1000, // Auto-refetch every hour
  });
