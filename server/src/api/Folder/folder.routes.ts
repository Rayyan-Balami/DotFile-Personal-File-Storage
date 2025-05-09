import { verifyAuth } from "@middleware/auth.middleware.js";
import { Router } from "express";
import FolderController from "./folder.controller.js";
import { validateData } from "@middleware/validate.middleware.js";
import { 
  createFolderSchema, 
  updateFolderSchema,
  renameFolderSchema,
  moveFolderSchema
} from "./folder.validator.js";

const authRoutes = Router();

authRoutes.use(verifyAuth);

authRoutes
  .post("/", validateData(createFolderSchema), FolderController.createFolder)
  .get("/contents", FolderController.getFolderContents)       // Handle root contents
  .get("/contents/:id", FolderController.getFolderContents)   // Handle contents with ID
  .post("/:id/rename", validateData(renameFolderSchema), FolderController.renameFolder) // Rename a folder
  .post("/:id/move", validateData(moveFolderSchema), FolderController.moveFolder);      // Move a folder to a new parent

const folderRoutes = Router();
folderRoutes.use("/folders", authRoutes);

export default folderRoutes;
