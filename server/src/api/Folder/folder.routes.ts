import { verifyAuth } from "@middleware/auth.middleware.js";
import { Router } from "express";
import FolderController from "./folder.controller.js";
import { validateData } from "@middleware/validate.middleware.js";
import { createFolderSchema, updateFolderSchema } from "./folder.validator.js";

const authRoutes = Router();

authRoutes.use(verifyAuth);

authRoutes
  .post("/", validateData(createFolderSchema), FolderController.createFolder)
  .get("/", FolderController.getFolders)
  .get("/:id", FolderController.getFolderById)
  .put("/:id", validateData(updateFolderSchema), FolderController.updateFolder)
  .delete("/:id", FolderController.deleteFolder)
  .get("/contents", FolderController.getFolderContents)       // Handle root contents without ID
  .get("/contents/:id", FolderController.getFolderContents);  // Handle contents with ID

const folderRoutes = Router();
folderRoutes.use("/folder", authRoutes);

export default folderRoutes;
