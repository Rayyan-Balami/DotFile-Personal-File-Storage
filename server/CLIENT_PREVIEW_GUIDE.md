# Client-Side Preview Integration Guide

## Overview

The server provides a comprehensive preview generation system that automatically creates previews for supported file types during upload. This guide explains how to integrate with the preview functionality from the client side.

## Supported File Types

### Images
- **Extensions**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.svg`
- **Preview**: Resized/optimized version of the original image

### Text Files
- **Extensions**: `.txt`, `.md`, `.csv`, `.json`, `.xml`, `.html`, `.css`, `.js`, `.ts`, `.log`, `.yaml`, `.yml`, `.ini`, `.conf`, `.config`
- **Preview**: Text-to-image conversion showing file content

## API Integration

### 1. File Upload with Preview Generation

```javascript
// Upload files - previews are generated automatically
const uploadFiles = async (files, folderId = null) => {
  const formData = new FormData();
  
  // Add files to form data
  files.forEach(file => {
    formData.append('files', file);
  });
  
  // Add folder ID if specified
  if (folderId) {
    formData.append('folderId', folderId);
  }
  
  try {
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    const result = await response.json();
    
    // Check which files have previews
    result.data.files.forEach(file => {
      console.log(`File: ${file.name}`);
      console.log(`Has Preview: ${file.hasPreview}`);
      
      if (file.hasPreview) {
        console.log(`Preview available at: /api/files/${file.id}/preview`);
      }
    });
    
    return result.data.files;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

### 2. Check File Preview Status

```javascript
// Get file details to check preview availability
const getFileDetails = async (fileId) => {
  try {
    const response = await fetch(`/api/files/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const result = await response.json();
    const file = result.data.file;
    
    return {
      id: file.id,
      name: file.name,
      hasPreview: file.hasPreview,
      previewUrl: file.hasPreview ? `/api/files/${file.id}/preview` : null
    };
  } catch (error) {
    console.error('Failed to get file details:', error);
    throw error;
  }
};
```

### 3. Display File Preview

```javascript
// Display preview in an image element
const displayPreview = async (fileId, imgElement) => {
  try {
    const response = await fetch(`/api/files/${fileId}/preview`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('No preview available for this file');
        return false;
      }
      throw new Error(`Preview request failed: ${response.status}`);
    }
    
    // Create blob URL for the preview
    const blob = await response.blob();
    const previewUrl = URL.createObjectURL(blob);
    
    // Set image source
    imgElement.src = previewUrl;
    imgElement.onload = () => {
      // Clean up blob URL after image loads
      URL.revokeObjectURL(previewUrl);
    };
    
    return true;
  } catch (error) {
    console.error('Failed to load preview:', error);
    return false;
  }
};
```

## React Implementation Examples

### File Upload Component

```jsx
import React, { useState } from 'react';

const FileUpload = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      const result = await response.json();
      setUploadedFiles(result.data.files);
      onUploadComplete && onUploadComplete(result.data.files);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        multiple
        onChange={handleFileUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading and generating previews...</p>}
      
      {uploadedFiles.length > 0 && (
        <div>
          <h3>Uploaded Files:</h3>
          {uploadedFiles.map(file => (
            <div key={file.id}>
              <span>{file.name}</span>
              {file.hasPreview && (
                <span> ✅ Preview available</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### File Preview Component

```jsx
import React, { useState, useEffect } from 'react';

const FilePreview = ({ fileId, fileName, hasPreview }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPreview = async () => {
    if (!hasPreview) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/files/${fileId}/preview`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load preview');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
    
    // Cleanup blob URL on unmount
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [fileId, hasPreview]);

  if (!hasPreview) {
    return (
      <div className="no-preview">
        <span>📄 {fileName}</span>
        <p>No preview available</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading preview...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <span>📄 {fileName}</span>
        <p>Failed to load preview: {error}</p>
      </div>
    );
  }

  return (
    <div className="file-preview">
      <img
        src={previewUrl}
        alt={`Preview of ${fileName}`}
        style={{ maxWidth: '300px', maxHeight: '300px' }}
        onError={() => setError('Failed to display preview')}
      />
      <p>{fileName}</p>
    </div>
  );
};
```

### File Grid with Previews

```jsx
import React from 'react';

const FileGrid = ({ files }) => {
  return (
    <div className="file-grid" style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
      gap: '16px' 
    }}>
      {files.map(file => (
        <div key={file.id} className="file-item">
          <FilePreview 
            fileId={file.id}
            fileName={file.name}
            hasPreview={file.hasPreview}
          />
          <div className="file-info">
            <p><strong>{file.name}</strong></p>
            <p>Size: {formatFileSize(file.size)}</p>
            <p>Type: {file.extension}</p>
            {file.hasPreview && (
              <span className="preview-badge">🖼️ Preview</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const formatFileSize = (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};
```

## Vanilla JavaScript Examples

### File Upload with Preview Display

```html
<!DOCTYPE html>
<html>
<head>
    <title>File Upload with Previews</title>
    <style>
        .file-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 20px;
        }
        .file-item {
            border: 1px solid #ddd;
            padding: 16px;
            border-radius: 8px;
        }
        .preview-image {
            max-width: 100%;
            max-height: 150px;
            object-fit: cover;
        }
        .no-preview {
            height: 150px;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>File Upload with Preview Generation</h1>
    
    <input type="file" id="fileInput" multiple accept="*/*">
    <button onclick="uploadFiles()">Upload Files</button>
    
    <div id="fileGrid" class="file-grid"></div>

    <script>
        const authToken = 'your-auth-token-here'; // Replace with actual token

        async function uploadFiles() {
            const fileInput = document.getElementById('fileInput');
            const files = fileInput.files;
            
            if (files.length === 0) {
                alert('Please select files to upload');
                return;
            }

            const formData = new FormData();
            Array.from(files).forEach(file => {
                formData.append('files', file);
            });

            try {
                const response = await fetch('/api/files/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: formData
                });

                const result = await response.json();
                displayFiles(result.data.files);
            } catch (error) {
                console.error('Upload failed:', error);
                alert('Upload failed: ' + error.message);
            }
        }

        function displayFiles(files) {
            const fileGrid = document.getElementById('fileGrid');
            fileGrid.innerHTML = '';

            files.forEach(file => {
                const fileItem = createFileItem(file);
                fileGrid.appendChild(fileItem);
            });
        }

        function createFileItem(file) {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            const previewContainer = document.createElement('div');
            
            if (file.hasPreview) {
                const img = document.createElement('img');
                img.className = 'preview-image';
                img.alt = `Preview of ${file.name}`;
                
                // Load preview
                loadFilePreview(file.id, img);
                previewContainer.appendChild(img);
            } else {
                const noPreview = document.createElement('div');
                noPreview.className = 'no-preview';
                noPreview.textContent = 'No preview available';
                previewContainer.appendChild(noPreview);
            }

            const fileName = document.createElement('h3');
            fileName.textContent = file.name;

            const fileInfo = document.createElement('div');
            fileInfo.innerHTML = `
                <p><strong>Type:</strong> ${file.extension}</p>
                <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
                <p><strong>Preview:</strong> ${file.hasPreview ? 'Available' : 'Not available'}</p>
            `;

            fileItem.appendChild(previewContainer);
            fileItem.appendChild(fileName);
            fileItem.appendChild(fileInfo);

            return fileItem;
        }

        async function loadFilePreview(fileId, imgElement) {
            try {
                const response = await fetch(`/api/files/${fileId}/preview`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to load preview');
                }

                const blob = await response.blob();
                const previewUrl = URL.createObjectURL(blob);
                
                imgElement.src = previewUrl;
                imgElement.onload = () => {
                    URL.revokeObjectURL(previewUrl);
                };
            } catch (error) {
                console.error('Failed to load preview:', error);
                imgElement.alt = 'Failed to load preview';
                imgElement.style.display = 'none';
            }
        }

        function formatFileSize(bytes) {
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            if (bytes === 0) return '0 Bytes';
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        }
    </script>
</body>
</html>
```

## Error Handling

### Common Error Scenarios

```javascript
const handlePreviewErrors = async (fileId) => {
  try {
    const response = await fetch(`/api/files/${fileId}/preview`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    switch (response.status) {
      case 200:
        // Success - handle preview
        const blob = await response.blob();
        return URL.createObjectURL(blob);
        
      case 401:
        console.error('Unauthorized - check authentication token');
        throw new Error('Authentication required');
        
      case 403:
        console.error('Forbidden - user does not own this file');
        throw new Error('Access denied');
        
      case 404:
        console.error('Preview not found - file may not have preview');
        throw new Error('Preview not available');
        
      default:
        console.error('Unexpected error:', response.status);
        throw new Error(`Server error: ${response.status}`);
    }
  } catch (error) {
    console.error('Network error:', error);
    throw error;
  }
};
```

## Best Practices

### 1. Performance Optimization

```javascript
// Lazy load previews only when visible
const observePreviewElements = () => {
  const previewElements = document.querySelectorAll('[data-file-id]');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fileId = entry.target.dataset.fileId;
        loadPreview(fileId, entry.target);
        observer.unobserve(entry.target);
      }
    });
  });
  
  previewElements.forEach(el => observer.observe(el));
};
```

### 2. Caching Strategy

```javascript
// Simple preview cache
const previewCache = new Map();

const getCachedPreview = async (fileId) => {
  if (previewCache.has(fileId)) {
    return previewCache.get(fileId);
  }
  
  const response = await fetch(`/api/files/${fileId}/preview`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  
  previewCache.set(fileId, url);
  return url;
};
```

### 3. Progressive Enhancement

```javascript
// Check if file has preview before attempting to load
const renderFileItem = (file) => {
  const item = document.createElement('div');
  
  // Always show file name and basic info
  item.innerHTML = `
    <h3>${file.name}</h3>
    <p>Type: ${file.extension} | Size: ${formatFileSize(file.size)}</p>
  `;
  
  // Only add preview functionality if available
  if (file.hasPreview) {
    const previewBtn = document.createElement('button');
    previewBtn.textContent = 'Show Preview';
    previewBtn.onclick = () => loadAndShowPreview(file.id);
    item.appendChild(previewBtn);
  }
  
  return item;
};
```

## Security Considerations

- Always include authentication tokens in preview requests
- Validate file IDs on the client side before making requests
- Handle unauthorized access gracefully
- Don't cache authentication tokens in localStorage for production apps
- Use HTTPS for all preview requests in production

## Browser Compatibility

- **Blob URLs**: Supported in all modern browsers
- **Fetch API**: Supported in all modern browsers (polyfill available for older browsers)
- **IntersectionObserver**: Supported in modern browsers (polyfill available)

This guide provides comprehensive examples for integrating with the preview system. The server automatically generates previews during upload, and the client can easily display them using the provided endpoints and techniques.
