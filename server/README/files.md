# File API Documentation

Base URL: `http://localhost:5000/api`

All endpoints require authentication. Files are private to their owners - users can only access their own files.

## View File
Stream a file for viewing in the browser.

```http
GET /files/:id/view
Authorization: Bearer your_access_token_here
```

### Response Headers
```http
Content-Type: application/file_type
Content-Disposition: inline; filename="file_name.extension"
```

### Error Responses
```json
{
  "status": 401,
  "errors": [
    {
      "authentication": "Unauthorized"
    }
  ]
}
```
```json
{
  "status": 404,
  "errors": [
    {
      "file": "File not found"
    }
  ]
}
```

## Upload Files
Upload one or multiple files. Supports both single files and ZIP archives with folder structure.

```http
POST /files/upload
Authorization: Bearer your_access_token_here
Content-Type: multipart/form-data

files: [file1, file2, ...]  // File array
folderId: "optional_folder_id"  // Target folder ID
```

### Response
```json
{
  "status": 201,
  "data": {
    "files": [
      {
        "id": "file_id",
        "name": "example",
        "type": "pdf",
        "size": 1024,
        "owner": "user_id",
        "folder": "folder_id",
        "extension": "pdf",
        "isPinned": false,
        "createdAt": "2024-03-15T12:00:00Z",
        "updatedAt": "2024-03-15T12:00:00Z",
        "deletedAt": null
      }
    ],
    "folders": {  // Only present when uploading ZIP with folders
      "path/to/folder": "folder_id"
    },
    "count": 1,
    "folderCount": 0
  },
  "message": "Successfully uploaded 1 file(s)"
}
```

## Get User Files
Get list of user's files, optionally filtered by folder.

```http
GET /files
Authorization: Bearer your_access_token_here
```

### Query Parameters
- `folderId` (optional): Get files in a specific folder
- `includeDeleted` (optional): Include files in trash (true/false)

### Response
```json
{
  "status": 200,
  "data": {
    "files": [
      {
        "id": "file_id",
        "name": "example",
        "type": "pdf",
        "size": 1024,
        "owner": "user_id",
        "folder": "folder_id",
        "extension": "pdf",
        "isPinned": false,
        "createdAt": "2024-03-15T12:00:00Z",
        "updatedAt": "2024-03-15T12:00:00Z",
        "deletedAt": null
      }
    ]
  },
  "message": "Files retrieved successfully"
}
```

## Get File Details
Get detailed information about a specific file.

```http
GET /files/:id
Authorization: Bearer your_access_token_here
```

### Response
```json
{
  "status": 200,
  "data": {
    "file": {
      "id": "file_id",
      "name": "example",
      "type": "pdf",
      "size": 1024,
      "owner": "user_id",
      "folder": "folder_id",
      "extension": "pdf",
      "isPinned": false,
      "createdAt": "2024-03-15T12:00:00Z",
      "updatedAt": "2024-03-15T12:00:00Z",
      "deletedAt": null
    }
  },
  "message": "File retrieved successfully"
}
```

## Update File
Update file properties.

```http
PATCH /files/:id
Authorization: Bearer your_access_token_here
Content-Type: application/json

{
  "isPinned": true  // optional
}
```

### Response
```json
{
  "status": 200,
  "data": {
    "file": {
      "id": "file_id",
      "name": "example",
      "isPinned": true,
      "updatedAt": "2024-03-15T12:00:00Z"
    }
  },
  "message": "File updated successfully"
}
```

## Move File
Move a file to a different folder.

```http
POST /files/:id/move
Authorization: Bearer your_access_token_here
Content-Type: application/json

{
  "destinationFolderId": "new_folder_id"  // null to move to root
}
```

### Response
```json
{
  "status": 200,
  "data": {
    "file": {
      "id": "file_id",
      "name": "example",
      "folder": "new_folder_id",
      "updatedAt": "2024-03-15T12:00:00Z"
    }
  },
  "message": "File moved successfully"
}
```

## Rename File
Rename a file.

```http
POST /files/:id/rename
Authorization: Bearer your_access_token_here
Content-Type: application/json

{
  "name": "new_name"  // without extension
}
```

### Response
```json
{
  "status": 200,
  "data": {
    "file": {
      "id": "file_id",
      "name": "new_name",
      "updatedAt": "2024-03-15T12:00:00Z"
    }
  },
  "message": "File renamed successfully"
}
```

## Delete File (Move to Trash)
Soft delete a file by moving it to trash.

```http
DELETE /files/:id
Authorization: Bearer your_access_token_here
```

### Response
```json
{
  "status": 200,
  "data": {
    "file": {
      "id": "file_id",
      "deletedAt": "2024-03-15T12:00:00Z"
    }
  },
  "message": "File moved to trash"
}
```

## Permanently Delete File
Permanently remove a file from trash.

```http
DELETE /files/:id/permanent
Authorization: Bearer your_access_token_here
```

### Response
```json
{
  "status": 200,
  "message": "File permanently deleted"
}
```

## Restore File from Trash
Restore a file from trash.

```http
POST /files/:id/restore
Authorization: Bearer your_access_token_here
```

### Response
```json
{
  "status": 200,
  "data": {
    "file": {
      "id": "file_id",
      "deletedAt": null
    }
  },
  "message": "File restored successfully"
}
```

## Error Responses

### Validation Error
```json
{
  "status": 400,
  "errors": [
    {
      "field": "Error message"
    }
  ]
}
```

### Authentication Error
```json
{
  "status": 401,
  "errors": [
    {
      "authentication": "Unauthorized"
    }
  ]
}
```

### Permission Error
```json
{
  "status": 403,
  "errors": [
    {
      "authorization": "You do not have permission to access this file"
    }
  ]
}
```

### Not Found Error
```json
{
  "status": 404,
  "errors": [
    {
      "file": "File not found"
    }
  ]
}
```

## Security Notes

1. File Storage
   - Files are stored in private user directories: `uploads/user-<id>/`
   - Files use unique storage keys to prevent conflicts
   - Direct file access is not allowed - all access is through authenticated API endpoints

2. Access Control
   - Users can only access their own files
   - No file sharing functionality - files are private to their owners
   - All endpoints require valid authentication
   - Storage usage is tracked and limited per user 