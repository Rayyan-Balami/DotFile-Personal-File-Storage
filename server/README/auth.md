# Authentication API Documentation

Base URL: `http://localhost:5000/api`

## Register User
Create a new user account.

```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "StrongP@ss123",
  "confirmPassword": "StrongP@ss123"
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
  "status": 201,
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "user@example.com",
      "avatar": "default_avatar_url",
      "role": "user",
      "maxStorageLimit": 15728640,  // 15MB in bytes
      "storageUsed": 0,
      "createdAt": "2024-03-15T12:00:00Z",
      "updatedAt": "2024-03-15T12:00:00Z"
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  },
  "message": "User registered successfully"
}
```

## Login
Authenticate a user and get access tokens.

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongP@ss123"
}
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
      "maxStorageLimit": 15728640,
      "storageUsed": 0,
      "createdAt": "2024-03-15T12:00:00Z",
      "updatedAt": "2024-03-15T12:00:00Z"
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  },
  "message": "Logged in successfully"
}
```

## Refresh Token
Get a new access token using a refresh token.

```http
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"  // Optional if using httpOnly cookies
}
```

### Response
```json
{
  "status": 200,
  "data": {
    "accessToken": "new_jwt_access_token",
    "refreshToken": "new_jwt_refresh_token"
  },
  "message": "Tokens refreshed successfully"
}
```

## Update User Profile
Update user information.

```http
PUT /users/me
Authorization: Bearer your_access_token_here
Content-Type: application/json

{
  "name": "New Name",        // optional
  "email": "new@email.com",  // optional
  "avatar": "avatar_url"     // optional
}
```

### Response
```json
{
  "status": 200,
  "data": {
    "user": {
      "id": "user_id",
      "name": "New Name",
      "email": "new@email.com",
      "avatar": "avatar_url",
      "role": "user",
      "maxStorageLimit": 15728640,
      "storageUsed": 0,
      "createdAt": "2024-03-15T12:00:00Z",
      "updatedAt": "2024-03-15T12:00:00Z"
    }
  },
  "message": "Profile updated successfully"
}
```

## Change Password
Update user's password.

```http
PATCH /users/me/password
Authorization: Bearer your_access_token_here
Content-Type: application/json

{
  "oldPassword": "CurrentP@ss123",
  "newPassword": "NewStrongP@ss123",
  "confirmNewPassword": "NewStrongP@ss123"
}
```

### Response
```json
{
  "status": 200,
  "message": "Password updated successfully"
}
```

## Logout
Invalidate the current refresh token.

```http
POST /users/logout
Authorization: Bearer your_access_token_here
```

### Response
```json
{
  "status": 200,
  "message": "Logged out successfully"
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

### Not Found Error
```json
{
  "status": 404,
  "errors": [
    {
      "user": "User not found"
    }
  ]
}
``` 