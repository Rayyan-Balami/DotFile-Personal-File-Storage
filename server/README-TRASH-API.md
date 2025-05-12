# Trash API Documentation

This document describes the API endpoints for trash management in the system.

## Trash API Endpoints

### Combined Trash Endpoints (Files + Folders)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/trash/contents` | GET | Get all trash contents (files + folders) |
| `/api/trash/empty` | DELETE | Empty trash (permanently delete all files and folders) |

### File Trash Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/files/{id}` | DELETE | Soft delete a file (move to trash) |
| `/api/files/{id}/permanent` | DELETE | Permanently delete a file and its physical storage |
| `/api/files/{id}/restore` | POST | Restore a file from trash |
| `/api/files/trash/contents` | GET | Get all trashed files |

### Folder Trash Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/folders/{id}` | DELETE | Soft delete a folder (move to trash) |
| `/api/folders/{id}/permanent` | DELETE | Permanently delete a folder, its contents, and physical storage |
| `/api/folders/{id}/restore` | POST | Restore a folder from trash |
| `/api/folders/trash/contents` | GET | Get all trashed folders |

## Important Notes

1. When a folder is soft deleted, its child items (files and sub-folders) are not individually marked as deleted. They are effectively hidden because the parent folder is in trash.

2. When permanently deleting a file, both the database record and the physical file are removed from the storage (`uploads/user-{userId}/file-{fileId}`).

3. When permanently deleting a folder, all files within that folder (including in sub-folders) have their physical files deleted from storage as well.

4. Restoring a folder will check if its parent folder still exists (and is not deleted). If the parent is missing or deleted, the folder will be restored to the root level.

5. Similarly, restoring a file will check if its parent folder still exists. If not, the file will be restored to the root level.
