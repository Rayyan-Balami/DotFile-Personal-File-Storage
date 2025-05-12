# File and Folder API Documentation

This document provides comprehensive documentation for the File and Folder management APIs.

## Authentication

All API endpoints require authentication via Bearer token. Include the following header with all requests:

```
Authorization: Bearer your_access_token_here
```

## Base URL

```
http://localhost:5000/api
```

## Folder Operations

### Create Folder
Creates a new folder in the specified location.

**Endpoint:** `POST /folders`  
**Content-Type:** `application/json`  

**Request Body:**
```json
{
  "name": "My Folder",
  "parent": null  // null for root level, or folder ID for nested folder
}
```

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "folder": {
      "id": "5f8e973e8c2c491f9c5b6fdb",
      "name": "My Folder",
      "type": "folder",
      "owner": "6821789e78a3228694110e9d",
      "workspace": null,
      "parent": null,
      "path": "/my-folder",
      "pathSegments": [],
      "items": 0,
      "isPinned": false,
      "isShared": false,
      "createdAt": "2023-07-15T12:30:45.123Z",
      "updatedAt": "2023-07-15T12:30:45.123Z",
      "deletedAt": null
    }
  },
  "message": "Folder created successfully"
}
```

### Get Folder Contents
Retrieves files and subfolders within a specific folder.

**Endpoint for root contents:** `GET /folders/contents`  
**Endpoint for specific folder:** `GET /folders/contents/:folderId`

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "folderContents": {
      "folders": [...],
      "files": [...]
    }
  },
  "message": "Folder contents retrieved successfully"
}
```

### Rename Folder
Updates only the folder's name.

**Endpoint:** `POST /folders/:folderId/rename`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "name": "New Folder Name"
}
```

### Move Folder
Relocates a folder and all its contents to a different parent folder.

**Endpoint:** `POST /folders/:folderId/move`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "parent": "5f8e973e8c2c491f9c5b6fdc"  // Target parent folder ID, or null for root
}
```

### Delete Folder (Move to Trash)
Soft-deletes a folder by moving it to trash (recoverable).

**Endpoint:** `DELETE /folders/:folderId`

### Restore Folder from Trash
Recovers a previously deleted folder and its contents.

**Endpoint:** `POST /folders/:folderId/restore`

### Permanently Delete Folder
Completely removes a folder and all its contents (unrecoverable).

**Endpoint:** `DELETE /folders/:folderId/permanent`

### Get Trash Contents
Lists all folders and files in the trash.

**Endpoint:** `GET /folders/trash/contents`

### Empty Trash
Permanently removes all items in the trash.

**Endpoint:** `POST /folders/trash/empty`

## File Operations

### Upload Files
Uploads one or more files to the specified folder.

**Endpoint:** `POST /files/upload`  
**Content-Type:** `multipart/form-data`

**Form Fields:**
- `files`: The file(s) to upload (multiple files allowed)
- `folderId`: (Optional) The folder ID to upload to (defaults to root)

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "files": [
      {
        "id": "5f8e973e8c2c491f9c5b6fdb",
        "name": "document.pdf",
        "size": 1048576,
        "folder": "5f8e973e8c2c491f9c5b6fdc"
      }
    ],
    "count": 1
  },
  "message": "Successfully uploaded 1 file(s)"
}
```

### Get File by ID
Retrieves file details by its ID.

**Endpoint:** `GET /files/:fileId`

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "file": {
      "id": "5f8e973e8c2c491f9c5b6fdb",
      "name": "document.pdf",
      "type": "application/pdf",
      "size": 1048576,
      "owner": "6821789e78a3228694110e9d",
      "folder": "5f8e973e8c2c491f9c5b6fdc",
      "path": "/my-folder/document.pdf",
      "pathSegments": [...],
      "extension": "pdf",
      "isPinned": false,
      "isShared": false,
      "workspace": null,
      "createdAt": "2023-07-15T12:30:45.123Z",
      "updatedAt": "2023-07-15T12:30:45.123Z",
      "deletedAt": null
    }
  },
  "message": "File retrieved successfully"
}
```

### Update File Properties
Updates file metadata like name and pinned status.

**Endpoint:** `PATCH /files/:fileId`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "name": "Updated File Name",
  "isPinned": true
}
```

### Rename File
Updates only the file name.

**Endpoint:** `POST /files/:fileId/rename`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "name": "New File Name"
}
```

### Move File
Relocates a file to a different folder.

**Endpoint:** `POST /files/:fileId/move`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "destinationFolderId": "5f8e973e8c2c491f9c5b6fdc"  // Target folder ID, or null for root
}
```

### Delete File (Move to Trash)
Soft-deletes a file by moving it to trash (recoverable).

**Endpoint:** `DELETE /files/:fileId`

### Restore File from Trash
Recovers a previously deleted file.

**Endpoint:** `POST /files/:fileId/restore`

### Permanently Delete File
Completely removes a file (unrecoverable).

**Endpoint:** `DELETE /files/:fileId/permanent`

## Error Handling

All API endpoints return appropriate HTTP status codes and error messages in the following format:

```json
{
  "statusCode": 400,
  "errors": [
    {
      "field": "Error message"
    }
  ],
  "message": "Error summary"
}
```

Common error codes:
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (missing or invalid authentication)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error (server-side issue)
