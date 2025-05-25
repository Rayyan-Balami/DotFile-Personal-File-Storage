# How to Use File Previews in HTML img Tags

## Simple Usage

### 1. Check if File Has Preview
```javascript
// After uploading or fetching file data
const file = {
  id: "file123",
  name: "document.txt",
  hasPreview: true  // This field tells you if preview is available
};

if (file.hasPreview) {
  // Preview is available, you can display it
} else {
  // No preview available, show file icon or placeholder
}
```

### 2. Basic img Tag Usage

```html
<!-- Simple approach: Direct URL (requires authentication handling) -->
<img src="/api/files/123/preview" alt="File preview" />
```

**⚠️ Problem**: This won't work because the API requires authentication headers.

### 3. Correct Way: Fetch with Authentication

```javascript
// Function to load preview into img tag
async function loadPreviewIntoImg(fileId, imgElement) {
  try {
    // Fetch preview with authentication
    const response = await fetch(`/api/files/${fileId}/preview`, {
      headers: {
        'Authorization': `Bearer ${yourAuthToken}`
      }
    });

    if (response.ok) {
      // Convert response to blob
      const blob = await response.blob();
      
      // Create temporary URL for the blob
      const imageUrl = URL.createObjectURL(blob);
      
      // Set img src to the blob URL
      imgElement.src = imageUrl;
      
      // Clean up the URL when image loads
      imgElement.onload = () => {
        URL.revokeObjectURL(imageUrl);
      };
    } else {
      // Handle error - no preview available
      imgElement.src = '/path/to/default-file-icon.png';
    }
  } catch (error) {
    console.error('Failed to load preview:', error);
    imgElement.src = '/path/to/error-icon.png';
  }
}
```

### 4. Complete HTML Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>File Preview Example</title>
</head>
<body>
    <!-- Your file list -->
    <div id="fileList">
        <!-- This will be populated by JavaScript -->
    </div>

    <script>
        const authToken = 'your-jwt-token-here';
        
        // Example file data (from your API response)
        const files = [
            { id: '123', name: 'document.txt', hasPreview: true },
            { id: '456', name: 'image.jpg', hasPreview: true },
            { id: '789', name: 'video.mp4', hasPreview: false }
        ];

        // Render files with previews
        function renderFiles() {
            const fileList = document.getElementById('fileList');
            
            files.forEach(file => {
                const fileDiv = document.createElement('div');
                fileDiv.style.margin = '10px';
                fileDiv.style.border = '1px solid #ccc';
                fileDiv.style.padding = '10px';
                
                if (file.hasPreview) {
                    // Create img element for preview
                    const img = document.createElement('img');
                    img.style.maxWidth = '200px';
                    img.style.maxHeight = '200px';
                    img.alt = `Preview of ${file.name}`;
                    
                    // Load preview into img
                    loadPreviewIntoImg(file.id, img);
                    
                    fileDiv.appendChild(img);
                } else {
                    // Show file icon or placeholder
                    const placeholder = document.createElement('div');
                    placeholder.textContent = '📄 No preview available';
                    placeholder.style.width = '200px';
                    placeholder.style.height = '200px';
                    placeholder.style.border = '1px dashed #ccc';
                    placeholder.style.display = 'flex';
                    placeholder.style.alignItems = 'center';
                    placeholder.style.justifyContent = 'center';
                    
                    fileDiv.appendChild(placeholder);
                }
                
                // Add file name
                const fileName = document.createElement('p');
                fileName.textContent = file.name;
                fileDiv.appendChild(fileName);
                
                fileList.appendChild(fileDiv);
            });
        }

        // Function to load preview into img tag
        async function loadPreviewIntoImg(fileId, imgElement) {
            try {
                const response = await fetch(`/api/files/${fileId}/preview`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const imageUrl = URL.createObjectURL(blob);
                    
                    imgElement.src = imageUrl;
                    imgElement.onload = () => {
                        URL.revokeObjectURL(imageUrl);
                    };
                } else {
                    // Show error placeholder
                    imgElement.alt = 'Failed to load preview';
                    imgElement.style.display = 'none';
                }
            } catch (error) {
                console.error('Preview load error:', error);
                imgElement.alt = 'Error loading preview';
                imgElement.style.display = 'none';
            }
        }

        // Render files when page loads
        renderFiles();
    </script>
</body>
</html>
```

## React Example

```jsx
import React, { useState, useEffect } from 'react';

const FilePreviewImg = ({ fileId, fileName, hasPreview, authToken }) => {
  const [previewSrc, setPreviewSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hasPreview) {
      setLoading(false);
      return;
    }

    const loadPreview = async () => {
      try {
        const response = await fetch(`/api/files/${fileId}/preview`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setPreviewSrc(url);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadPreview();

    // Cleanup blob URL
    return () => {
      if (previewSrc) {
        URL.revokeObjectURL(previewSrc);
      }
    };
  }, [fileId, hasPreview, authToken]);

  if (!hasPreview) {
    return (
      <div style={{ width: 200, height: 200, border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        📄 No preview
      </div>
    );
  }

  if (loading) {
    return <div>Loading preview...</div>;
  }

  if (error) {
    return <div>❌ Preview error</div>;
  }

  return (
    <img 
      src={previewSrc}
      alt={`Preview of ${fileName}`}
      style={{ maxWidth: 200, maxHeight: 200 }}
    />
  );
};

// Usage
const FileList = ({ files, authToken }) => {
  return (
    <div>
      {files.map(file => (
        <div key={file.id} style={{ margin: 10, border: '1px solid #ccc', padding: 10 }}>
          <FilePreviewImg 
            fileId={file.id}
            fileName={file.name}
            hasPreview={file.hasPreview}
            authToken={authToken}
          />
          <p>{file.name}</p>
        </div>
      ))}
    </div>
  );
};
```

## Quick Steps Summary

1. **Check** if `file.hasPreview` is `true`
2. **Fetch** preview using `/api/files/{fileId}/preview` with auth header
3. **Convert** response to blob: `const blob = await response.blob()`
4. **Create** blob URL: `const url = URL.createObjectURL(blob)`
5. **Set** img src: `imgElement.src = url`
6. **Cleanup** blob URL after use: `URL.revokeObjectURL(url)`

## Key Points

- ✅ Always check `hasPreview` field first
- ✅ Use `fetch()` with Authorization header (can't use direct URL in img src)
- ✅ Convert response to blob, then create object URL
- ✅ Clean up blob URLs to prevent memory leaks
- ✅ Handle errors gracefully (show placeholder or file icon)

That's it! The preview will appear as a regular image in your img tag.
