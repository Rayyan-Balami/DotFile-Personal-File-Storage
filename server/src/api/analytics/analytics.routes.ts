import { Router } from "express";
import AnalyticsController from "@api/analytics/analytics.controller.js";
import { verifyAuth } from "@middleware/auth.middleware.js";
import { restrictTo } from "@middleware/accessControl.middleware.js";
import { UserRole } from "@api/user/user.dto.js";
import { validateData } from "@middleware/validate.middleware.js";
import { creationAnalyticsSchema } from "./analytics.validator.js";

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
  .get("/creation", 
    validateData(creationAnalyticsSchema, 'query'),
    AnalyticsController.getCreationAnalytics)
  
  // Summary analytics for dashboard
  .get("/summary", 
    AnalyticsController.getSummaryAnalytics);

//=========================//
// Mount under /analytics
//=========================//
const analyticsRoutes = Router();
analyticsRoutes.use("/analytics", adminRoutes);

export default analyticsRoutes;