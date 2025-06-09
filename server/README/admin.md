# Admin API Documentation

Base URL: `http://localhost:5000/api/admin/users`

All endpoints in this section require:
1. Valid authentication token
2. User must have admin role
3. Include the access token in Authorization header:
```
Authorization: Bearer your_access_token_here
```

## Get All Users
Get a list of all users in the system.

```http
GET /
```

### Query Parameters
- `includeDeleted` (optional): Set to "true" to include soft-deleted users

### Response
```json
{
  "status": 200,
  "data": {
    "users": [
      {
        "id": "user_id",
        "name": "John Doe",
        "email": "user@example.com",
        "avatar": "avatar_url",
        "role": "user",
        "storageUsed": 1024,
        "maxStorageLimit": 15728640,
        "createdAt": "2024-03-15T12:00:00Z",
        "updatedAt": "2024-03-15T12:00:00Z",
        "deletedAt": null
      }
    ]
  },
  "message": "Users retrieved successfully"
}
```

## Get User by ID
Get detailed information about a specific user.

```http
GET /:id
```

### Response
```json
{
  "status": 200,
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "user@example.com",
      "avatar": "avatar_url",
      "role": "user",
      "storageUsed": 1024,
      "maxStorageLimit": 15728640,
      "createdAt": "2024-03-15T12:00:00Z",
      "updatedAt": "2024-03-15T12:00:00Z",
      "deletedAt": null
    }
  },
  "message": "User retrieved successfully"
}
```

## Update User Storage Limit
Update a user's maximum storage limit.

```http
PATCH /:id/storage
Content-Type: application/json

{
  "maxStorageLimit": 52428800  // Size in bytes
}
```

### Validation
- `maxStorageLimit` must be a positive number
- Cannot be set lower than user's current storage usage

### Response
```json
{
  "status": 200,
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "user@example.com",
      "avatar": "avatar_url",
      "role": "user",
      "storageUsed": 1024,
      "maxStorageLimit": 52428800,
      "createdAt": "2024-03-15T12:00:00Z",
      "updatedAt": "2024-03-15T12:00:00Z"
    }
  },
  "message": "User storage limit updated successfully"
}
```

### Error Responses
```json
{
  "status": 400,
  "errors": [
    {
      "maxStorageLimit": "New storage limit cannot be less than current storage used"
    }
  ]
}
```

## Update User Role
Update a user's role (e.g., promote to admin).

```http
PATCH /:id/role
Content-Type: application/json

{
  "role": "admin"  // "admin" or "user"
}
```

### Response
```json
{
  "status": 200,
  "data": {
    "user": {
      "id": "user_id",
      "role": "admin",
      "updatedAt": "2024-03-15T12:00:00Z"
    }
  },
  "message": "User role updated successfully"
}
```

## Set User Password (Admin)
Set a user's password without requiring the old password.

```http
PATCH /:id/password
Content-Type: application/json

{
  "newPassword": "NewStrongP@ss123",
  "confirmNewPassword": "NewStrongP@ss123"
}
```

### Password Requirements
- At least 8 characters long
- Maximum 24 characters
- Must contain at least one uppercase letter
- Must contain at least one number
- Must contain at least one special character

### Response
```json
{
  "status": 200,
  "data": {
    "user": {
      "id": "user_id",
      "updatedAt": "2024-03-15T12:00:00Z"
    }
  },
  "message": "User password set successfully"
}
```

## Bulk Operations

### Bulk Soft Delete Users
Mark multiple users as deleted (can be restored later).

```http
DELETE /bulk/softdelete
Authorization: Bearer your_access_token_here
Content-Type: application/json
```

### Request Body
```json
{
  "userIds": ["user_id_1", "user_id_2", "user_id_3"]
}
```

### Response
```json
{
  "status": 200,
  "data": {
    "success": [
      {
        "id": "user_id_1",
        "name": "John Doe",
        "email": "user1@example.com",
        "deletedAt": "2024-03-15T12:00:00Z"
      }
    ],
    "failed": [
      {
        "id": "user_id_2",
        "error": "User not found"
      }
    ],
    "summary": {
      "total": 3,
      "successful": 1,
      "failed": 2
    }
  },
  "message": "Users soft deleted successfully"
}
```

### Bulk Restore Users
Restore multiple soft-deleted users.

```http
POST /bulk/restore
Authorization: Bearer your_access_token_here
Content-Type: application/json
```

### Request Body
```json
{
  "userIds": ["user_id_1", "user_id_2", "user_id_3"]
}
```

### Response
```json
{
  "status": 200,
  "data": {
    "success": [
      {
        "id": "user_id_1",
        "name": "John Doe",
        "email": "user1@example.com",
        "deletedAt": null,
        "updatedAt": "2024-03-15T12:00:00Z"
      }
    ],
    "failed": [
      {
        "id": "user_id_2",
        "error": "User not found or not deleted"
      }
    ],
    "summary": {
      "total": 3,
      "successful": 1,
      "failed": 2
    }
  },
  "message": "Users restored successfully"
}
```

### Bulk Permanent Delete Users
Permanently delete multiple users and all their associated data.

```http
DELETE /bulk/permanent
Authorization: Bearer your_access_token_here
Content-Type: application/json
```

### Request Body
```json
{
  "userIds": ["user_id_1", "user_id_2", "user_id_3"]
}
```

### Response
```json
{
  "status": 200,
  "data": {
    "success": ["user_id_1", "user_id_3"],
    "failed": [
      {
        "id": "user_id_2",
        "error": "User not found"
      }
    ],
    "summary": {
      "total": 3,
      "successful": 2,
      "failed": 1
    }
  },
  "message": "Users permanently deleted successfully"
}
```

### Error Responses for Bulk Operations
```json
{
  "status": 400,
  "errors": [
    {
      "userIds": "User IDs array is required"
    }
  ]
} 