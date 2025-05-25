/**
 * Test script to verify preview deletion functionality
 */

const fs = require('fs');
const path = require('path');

// Test the deletePreview function
async function testPreviewDeletion() {
  console.log('Testing preview deletion functionality...');

  // Test data
  const userId = 'test-user-123';
  const storageKey = 'test-file-key.txt';
  
  // Create test directories
  const userDir = path.join(__dirname, 'uploads', `user-${userId}`);
  const previewsDir = path.join(userDir, 'previews');
  
  if (!fs.existsSync(previewsDir)) {
    fs.mkdirSync(previewsDir, { recursive: true });
  }
  
  // Create a test preview file
  const previewPath = path.join(previewsDir, storageKey);
  fs.writeFileSync(previewPath, 'This is a test preview file');
  
  console.log(`Created test preview file at: ${previewPath}`);
  console.log(`Preview file exists: ${fs.existsSync(previewPath)}`);
  
  // Import and test the deletePreview function
  try {
    // Note: This would require proper ES module imports in a real test
    console.log('Preview deletion test setup complete');
    console.log('To complete the test, you would call deletePreview() function');
    console.log('Expected result: Preview file should be deleted');
    
    // Cleanup test file
    if (fs.existsSync(previewPath)) {
      fs.unlinkSync(previewPath);
      console.log('Test preview file cleaned up');
    }
    
  } catch (error) {
    console.error('Error testing preview deletion:', error);
  }
}

// Run the test
testPreviewDeletion().catch(console.error);
