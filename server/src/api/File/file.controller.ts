import { Request, Response } from "express";
import { asyncHandler } from "@utils/asyncHandler.js";
import { ApiResponse } from "@utils/apiResponse.js";
import { upload, processZipFiles, updateUserStorageUsage } from "@middleware/multer.middleware.js";
import fileService from "@api/File/file.service.js";
import { ApiError } from "@utils/apiError.js";

class FileController {
  // Upload single file
  uploadFile = [
    upload.single('file'),
    processZipFiles,
    updateUserStorageUsage,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) {
        throw new ApiError(400, "No file uploaded");
      }
      
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }
      
      const folderId = req.body.folderId || req.params.folderId;
      
      // Save file metadata in database
      const file = await fileService.createFile({
        name: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        owner: userId,
        folder: folderId || null
      });
      
      res.status(201).json(
        new ApiResponse(201, { file }, "File uploaded successfully")
      );
    })
  ];
  
  // Upload multiple files
  uploadMultipleFiles = [
    upload.array('files', MAX_FILES_PER_UPLOAD_BATCH),
    processZipFiles,
    updateUserStorageUsage,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.files || req.files.length === 0) {
        throw new ApiError(400, "No files uploaded");
      }
      
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }
      
      const folderId = req.body.folderId || req.params.folderId;
      const uploadedFiles = req.files as Express.Multer.File[];
      
      // Save file metadata in database
      const savedFiles = await Promise.all(
        uploadedFiles.map(file => 
          fileService.createFile({
            name: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path, 
            owner: userId,
            folder: folderId || null
          })
        )
      );
      
      res.status(201).json(
        new ApiResponse(201, { files: savedFiles }, "Files uploaded successfully")
      );
    })
  ];
  
  // Other file operations...
}

export default new FileController();