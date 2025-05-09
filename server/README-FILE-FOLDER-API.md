# File and Folder Management API

## Overview
This API provides endpoints for managing files and folders, including operations like renaming and moving.

## API Endpoints

### Folders

#### Create Folder
- **Endpoint:** `POST /api/v1/folders`
- **Body:**
  ```json
  {
    "name": "Folder Name",
    "parent": "parent_folder_id" // optional, null for root level
  }
  ```

#### Get Folder Contents
- **Endpoint:** `GET /api/v1/folders/contents/:id`
- **Response:** Returns folder details and its contents (files and subfolders)

#### Rename Folder
- **Endpoint:** `POST /api/v1/folders/:id/rename`
- **Body:**
  ```json
  {
    "newName": "New Folder Name"
  }
  ```

#### Move Folder
- **Endpoint:** `POST /api/v1/folders/:id/move`
- **Body:**
  ```json
  {
    "newParentId": "new_parent_folder_id" // null for root level
  }
  ```

### Files

#### Upload Files
- **Endpoint:** `POST /api/v1/file/upload`
- **Body:** FormData with files

#### Get File by ID
- **Endpoint:** `GET /api/v1/file/:id`

#### Update File
- **Endpoint:** `PATCH /api/v1/file/:id`
- **Body:**
  ```json
  {
    "name": "New File Name", // optional
    "folder": "folder_id",   // optional
    "isPinned": true,        // optional
    "isShared": true,        // optional
    "workspace": "workspace_id" // optional
  }
  ```

#### Delete File
- **Endpoint:** `DELETE /api/v1/file/:id`

#### Rename File
- **Endpoint:** `POST /api/v1/file/:id/rename`
- **Body:**
  ```json
  {
    "newName": "New File Name"
  }
  ```

#### Move File
- **Endpoint:** `POST /api/v1/file/:id/move`
- **Body:**
  ```json
  {
    "newParentId": "new_parent_folder_id" // null for root level
  }
  ```

## Implementation Notes

### Recursive Path Updates
When renaming or moving folders, all child items (folders and files) are automatically updated:

1. **Folder Rename:** Updates the folder's name and path, and recursively updates paths for all children
2. **Folder Move:** Updates the folder's parent, path, and recursively updates paths for all children
3. **File Rename:** Updates the file's name and path
4. **File Move:** Updates the file's parent folder and path

### Materialized Path Pattern
The implementation uses a materialized path pattern:
- Each folder stores its full path from root
- When a folder is renamed or moved, all its descendants' paths are updated in bulk
- This approach optimizes performance for recursive updates

### Validation
Input validation is performed for all operations using Zod schemas:
- Validates folder/file names for length and valid characters
- Ensures unique names within the same level
- Prevents circular references when moving folders
