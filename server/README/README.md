# API Documentation

Welcome to the API documentation. This API provides endpoints for file storage and management system with features like folder organization, file uploads, and user management.

## Base URL
```
http://localhost:5000/api
```

## Authentication
All API endpoints (except registration and login) require authentication using JWT Bearer token. Include the access token in the Authorization header:
```
Authorization: Bearer your_access_token_here
```

## Available Documentation

1. [Authentication](./auth.md)
   - User registration
   - Login
   - Logout
   - Token refresh
   - Password change

2. [Files](./files.md)
   - File upload
   - File download
   - File management (move, rename, delete)
   - Trash management

3. [Folders](./folders.md)
   - Folder creation
   - Folder organization
   - Color customization
   - Trash management

4. [Admin](./admin.md)
   - User management
   - Storage limit management
   - Role management
   - User deletion

## Storage Limits

Each user has a storage limit that determines how much data they can store:
- Default storage limit: 15MB
- Storage limits can only be modified by administrators through the dedicated API endpoint
- Users cannot upload files that would exceed their storage limit
- Current storage usage is available in user profile
- Storage limits cannot be set below a user's current storage usage

## Response Format
All API responses follow this standard format:

```json
{
  "status": 200,          // HTTP status code
  "data": {              // Response data object
    // Response data specific to each endpoint
  },
  "message": "Success"   // Human-readable message
}
```

## Error Format
Error responses follow this format:

```json
{
  "status": 400,          // HTTP status code
  "errors": [            // Array of error objects
    {
      "field": "Error field name",
      "message": "Error description"
    }
  ],
  "message": "Error occurred"  // Human-readable error message
}
```

## Common HTTP Status Codes

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 422: Unprocessable Entity
- 500: Internal Server Error

## Rate Limiting

The API implements rate limiting to prevent abuse:
- 100 requests per minute per IP address
- 1000 requests per hour per user

## File Upload Limits

- Maximum file size: 100MB
- Supported file types: All common document, image, video, and audio formats 