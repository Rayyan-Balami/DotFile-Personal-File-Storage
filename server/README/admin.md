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

## Soft Delete User
Mark a user as deleted (can be restored later).

```http
DELETE /:id
```

### Response
```json
{
  "status": 200,
  "data": {
    "user": {
      "id": "user_id",
      "deletedAt": "2024-03-15T12:00:00Z"
    }
  },
  "message": "User soft deleted successfully"
}
```

## Restore User
Restore a soft-deleted user.

```http
POST /:id/restore
Authorization: Bearer your_access_token_here
```

### Response
```json
{
  "status": 200,
  "data": {
    "user": {
      "id": "user_id",
      "deletedAt": null,
      "updatedAt": "2024-03-15T12:00:00Z"
    }
  },
  "message": "User restored successfully"
}
```

### Error Responses
```json
{
  "status": 400,
  "errors": [
    {
      "user": "User is not deleted"
    }
  ]
}
```
```json
{
  "status": 404,
  "errors": [
    {
      "id": "User not found"
    }
  ]
} 