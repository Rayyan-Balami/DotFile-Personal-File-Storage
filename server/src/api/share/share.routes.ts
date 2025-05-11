import { Router } from "express";
import shareController from "./share.controller.js";
import { verifyAuth } from "@middleware/auth.middleware.js"; 
import { verifyResourceOwnership } from "@middleware/resourcePermission.middleware.js";

const router = Router();

/**
 * Public Share Routes
 * These routes require authentication and resource ownership
 */

// Create a public share for a resource
router.post(
  "/public",
  verifyAuth,
  shareController.createPublicShare
);

// Get public share info for a resource
router.get(
  "/public/:resourceId",
  verifyAuth,
  shareController.getPublicShare
);

// Update public share permissions
router.patch(
  "/public/:resourceId",
  verifyAuth,
  shareController.updatePublicShare
);

// Delete public share
router.delete(
  "/public/:resourceId",
  verifyAuth,
  shareController.deletePublicShare
);

// Access a shared resource by public link (no auth required)
router.get(
  "/access/:link",
  shareController.accessSharedResource
);

/**
 * User Share Routes
 * For sharing resources with specific users
 */

// Share with a user
router.post(
  "/user",
  verifyAuth,
  shareController.shareWithUser
);

// Get user share info for a resource
router.get(
  "/user/:resourceId",
  verifyAuth,
  shareController.getUserShare
);

// Remove a user's access to a shared resource
router.delete(
  "/user/:resourceId/:targetUserId",
  verifyAuth,
  shareController.removeUserShare
);

// Get all resources shared with the current user
router.get(
  "/shared-with-me",
  verifyAuth,
  shareController.getMySharedResources
);

// Get all resources the current user has shared with others
router.get(
  "/shared-by-me",
  verifyAuth,
  shareController.getMySharedOutResources
);

export default router;