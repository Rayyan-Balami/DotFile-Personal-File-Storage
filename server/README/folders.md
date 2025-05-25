# Folder API Documentation

Base URL: `http://localhost:5000/api`

All endpoints require authentication. Folders are private to their owners - users can only access their own folders.

## Create Folder
Create a new folder.

```http
POST /folders
Authorization: Bearer your_access_token_here
Content-Type: application/json

{
  "name": "My Folder",
  "parent": "parent_folder_id",  // optional, null for root level
  "color": "#4f46e5"            // optional, defaults to "#4f46e5"
}
```

### Response
```json
{
  "status": 201,
  "data": {
    "folder": {
      "id": "folder_id",
      "name": "My Folder",
      "type": "folder",
      "owner": "user_id",
      "color": "#4f46e5",
      "parent": "parent_folder_id",
      "items": 0,
      "isPinned": false,
      "createdAt": "2024-03-15T12:00:00Z",
      "updatedAt": "2024-03-15T12:00:00Z",
      "deletedAt": null
    }
  },
  "message": "Folder created successfully"
}
```

## Get Folder Contents
Get the contents of a folder (subfolders and files).

```http
GET /folders/contents         # For root folder contents
GET /folders/contents/:id     # For specific folder contents
Authorization: Bearer your_access_token_here
```

### Query Parameters
- `includeDeleted` (optional): Include items in trash (true/false)

### Response
```json
{
  "status": 200,
  "data": {
    "folders": [
      {
        "id": "subfolder_id",
        "name": "Subfolder",
        "type": "folder",
        "owner": "user_id",
        "color": "#4f46e5",
        "parent": "folder_id",
        "items": 0,
        "isPinned": false,
        "createdAt": "2024-03-15T12:00:00Z",
        "updatedAt": "2024-03-15T12:00:00Z",
        "deletedAt": null
      }
    ],
    "files": [
      {
        "id": "file_id",
        "name": "document",
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
  "message": "Folder contents retrieved successfully"
}
```

## Get Folder Details
Get detailed information about a specific folder.

```http
GET /folders/:id
Authorization: Bearer your_access_token_here
```

### Response
```json
{
  "status": 200,
  "data": {
    "folder": {
      "id": "folder_id",
      "name": "My Folder",
      "type": "folder",
      "owner": "user_id",
      "color": "#4f46e5",
      "parent": "parent_folder_id",
      "items": 0,
      "isPinned": false,
      "createdAt": "2024-03-15T12:00:00Z",
      "updatedAt": "2024-03-15T12:00:00Z",
      "deletedAt": null
    }
  },
  "message": "Folder retrieved successfully"
}
```

## Update Folder
Update folder properties.

```http
PATCH /folders/:id
Authorization: Bearer your_access_token_here
Content-Type: application/json

{
  "name": "New Name",          // optional
  "parent": "new_parent_id",   // optional
  "color": "#ff0000",         // optional
  "isPinned": true            // optional
}
```

### Response
```json
{
  "status": 200,
  "data": {
    "folder": {
      "id": "folder_id",
      "name": "New Name",
      "type": "folder",
      "owner": "user_id",
      "color": "#ff0000",
      "parent": "parent_folder_id",
      "items": 0,
      "isPinned": true,
      "createdAt": "2024-03-15T12:00:00Z",
      "updatedAt": "2024-03-15T12:00:00Z",
      "deletedAt": null
    }
  },
  "message": "Folder updated successfully"
}
```

## Move Folder
Move a folder to a different parent folder.

```http
POST /folders/:id/move
Authorization: Bearer your_access_token_here
Content-Type: application/json

{
  "parent": "new_parent_folder_id"  // null for root level
}
```

### Response
```json
{
  "status": 200,
  "data": {
    "folder": {
      "id": "folder_id",
      "name": "My Folder",
      "type": "folder",
      "owner": "user_id",
      "color": "#4f46e5",
      "parent": "new_parent_folder_id",
      "items": 0,
      "isPinned": false,
      "updatedAt": "2024-03-15T12:00:00Z"
    }
  },
  "message": "Folder moved successfully"
}
```

## Rename Folder
Rename a folder.

```http
POST /folders/:id/rename
Authorization: Bearer your_access_token_here
Content-Type: application/json

{
  "name": "New Folder Name"
}
```

### Response
```json
{
  "status": 200,
  "data": {
    "folder": {
      "id": "folder_id",
      "name": "New Folder Name",
      "updatedAt": "2024-03-15T12:00:00Z"
    }
  },
  "message": "Folder renamed successfully"
}
```

## Delete Folder (Move to Trash)
Move a folder to trash.

```http
DELETE /folders/:id
Authorization: Bearer your_access_token_here
```

### Response
```json
{
  "status": 200,
  "data": {
    "folder": {
      "id": "folder_id",
      "deletedAt": "2024-03-15T12:00:00Z"
    }
  },
  "message": "Folder moved to trash"
}
```

## Permanently Delete Folder
Permanently remove a folder from trash.

```http
DELETE /folders/:id/permanent
Authorization: Bearer your_access_token_here
```

### Response
```json
{
  "status": 200,
  "message": "Folder permanently deleted"
}
```

## Restore Folder
Restore a folder from trash.

```http
POST /folders/:id/restore
Authorization: Bearer your_access_token_here
```

### Response
```json
{
  "status": 200,
  "data": {
    "folder": {
      "id": "folder_id",
      "deletedAt": null
    }
  },
  "message": "Folder restored successfully"
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
      "authorization": "You do not have permission to access this folder"
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
      "folder": "Folder not found"
    }
  ]
}
```

## Security Notes

1. Folder Access
   - Folders are private to their owners
   - Users can only access their own folders
   - All endpoints require valid authentication

2. Folder Structure
   - Folders can be nested (have parent folders)
   - Root level folders have null parent
   - Moving folders maintains the entire subtree structure
   - Item count is tracked for each folder 