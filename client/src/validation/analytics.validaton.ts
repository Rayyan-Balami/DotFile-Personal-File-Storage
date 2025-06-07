import { z } from "zod";

/**
 * Validation schema for creation analytics request
 */
export const creationAnalyticsSchema = z.object({
  startDate: z
    .string()
    .min(1, "Start date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  endDate: z
    .string()
    .min(1, "End date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format")
}).refine((data) => {
  // Ensure start date is before or equal to end date
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return start <= end; // Allow equal dates for same-day range
}, {
  message: "Start date must be before or equal to end date",
  path: ["startDate"]
});