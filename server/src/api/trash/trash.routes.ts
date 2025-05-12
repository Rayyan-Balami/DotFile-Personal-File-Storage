import { verifyAuth } from "@middleware/auth.middleware.js";
import { Router } from "express";
import TrashController from "./trash.controller.js";

const trashRoutes = Router();

// Apply authentication middleware to ALL trash routes
trashRoutes.use(verifyAuth);

trashRoutes
  .get("/contents", TrashController.getTrashContents)     // Get all trash contents (files + folders)
  .delete("/empty", TrashController.emptyTrash);          // Empty trash (delete everything)

export default trashRoutes;
