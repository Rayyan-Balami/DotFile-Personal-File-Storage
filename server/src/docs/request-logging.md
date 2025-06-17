# Request Logging System Usage

This document explains how to use the detailed request logging system for debugging and monitoring file encryption/compression processes.

## Overview

The system adds detailed logging to the request object, which can be returned to the client in the API response. This is particularly useful for debugging complex operations like file encryption and compression.

## How It Works

1. When a request comes in, the `initRequestLogger` middleware adds a `logEntries` array and an `addLog` method to the request object.

2. Throughout request processing, middleware and utility functions can add logs using `req.addLog(component, level, message)`.

3. The `attachLogsToResponse` middleware captures the response and adds the logs to it before sending.

## For File Uploads

File uploads now include detailed logs from:
- Huffman compression algorithm (frequency tables, code mappings, compression ratios)
- AES encryption algorithm (key expansion, round details, transformation matrices)
- Overall process steps and performance metrics

## Example Usage

When implementing new functionality that needs logging, add logs like this:

```typescript
// In your function/middleware
function processData(req: Request, data: any) {
  // Your processing logic
  if (req.addLog) {
    req.addLog("MyComponent", "INFO", "Processing started");
    req.addLog("MyComponent", "DEBUG", `Found ${data.length} items to process`);
  }
  
  // More processing...
  
  if (req.addLog) {
    req.addLog("MyComponent", "INFO", "Processing completed successfully");
  }
}
```

## Viewing Logs

Logs are automatically attached to API responses in multiple ways:

### For JSON Responses (e.g., File Upload)

Logs are included directly in the response body under the `logs` key:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Successfully uploaded 1 file(s)",
  "data": {
    "files": [/* file data */],
    "count": 1
  },
  "timestamp": "2025-06-17T15:30:00.000Z",
  "logs": [
    {
      "timestamp": "2025-06-17T15:29:55.123Z",
      "component": "Huffman",
      "level": "DEBUG",
      "message": "Found 128 unique bytes in input"
    },
    /* more log entries */
  ]
}
```

### For File Downloads/Streaming

For file streaming endpoints (view/download), logs are available in two ways:

1. **Headers**: Algorithm logs are included in the custom header `X-Algorithm-Logs` (for small log sets)

2. **Separate Endpoint**: Add the query parameter `?logs=true` to any file view/download URL to get only the logs instead of the file:

```
GET /api/files/12345/download?logs=true
```

This returns a JSON response with logs but no file content:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "File decryption logs retrieved successfully",
  "data": {
    "filename": "example.pdf",
    "mimeType": "application/pdf",
    "fileId": "12345"
  },
  "timestamp": "2025-06-17T15:30:00.000Z",
  "logs": [/* detailed algorithm logs */]
}
```

Each log entry includes:
- `timestamp`: ISO timestamp of when the log was added
- `component`: Source component (e.g., "Huffman", "AES", "CryptoUtil")  
- `level`: Log level ("INFO", "DEBUG", "ERROR", "WARN")
- `message`: The log message

## Extending

To add detailed logging to a new component:
1. Make sure to accept an optional `req?: Request` parameter
2. Check if `req?.addLog` exists before using it
3. Create meaningful log entries at appropriate points

This approach ensures backward compatibility - components work without the logging system, but provide detailed information when it's available.
