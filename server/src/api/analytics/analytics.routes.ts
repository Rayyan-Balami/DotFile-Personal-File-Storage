import AnalyticsController from "@api/analytics/analytics.controller.js";
import { creationAnalyticsSchema } from "@api/analytics/analytics.validator.js";
import { UserRole } from "@api/user/user.dto.js";
import { restrictTo } from "@middleware/accessControl.middleware.js";
import { verifyAuth } from "@middleware/auth.middleware.js";
import { validateData } from "@middleware/validate.middleware.js";
import { Router } from "express";

//=========================//
// Init router and admin auth
//=========================//
const adminRoutes = Router();
adminRoutes.use(verifyAuth);
adminRoutes.use(restrictTo([UserRole.ADMIN]));

//=========================//
// Analytics routes (admin only)
//=========================//
adminRoutes
  // Creation analytics (files and folders)
  .get(
    "/creation",
    validateData(creationAnalyticsSchema, "query"),
    AnalyticsController.getCreationAnalytics
  )

  // Summary analytics for dashboard
  .get("/summary", AnalyticsController.getSummaryAnalytics)

  // File type distribution analytics
  .get("/file-types", AnalyticsController.getFileTypeAnalytics)

  // User storage consumption analytics
  .get(
    "/user-storage-consumption",
    AnalyticsController.getUserStorageConsumptionAnalytics
  )

  // Monthly user registrations analytics
  .get(
    "/monthly-user-registrations",
    AnalyticsController.getMonthlyUserRegistrationsAnalytics
  );

//=========================//
// Mount under /analytics
//=========================//
const analyticsRoutes = Router();
analyticsRoutes.use("/analytics", adminRoutes);

export default analyticsRoutes;
