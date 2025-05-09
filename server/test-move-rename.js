// Test script for rename and move operations

import axios from 'axios';

// Configuration - Replace with actual values
const API_URL = 'http://localhost:3000/api/v1';
const AUTH_TOKEN = 'Bearer your_auth_token_here'; // Replace with a valid JWT token

// Axios instance with auth header
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': AUTH_TOKEN,
    'Content-Type': 'application/json'
  }
});

// Test folder operations
async function testFolderOperations() {
  try {
    console.log('----------- TESTING FOLDER OPERATIONS -----------');
    
    // 1. Create test folders
    console.log('1. Creating test folders...');
    const rootFolder = await api.post('/folders', { 
      name: 'Test Root Folder' 
    });
    console.log(`   Root folder created with ID: ${rootFolder.data.data.folder.id}`);

    const subFolder = await api.post('/folders', { 
      name: 'Test Sub Folder',
      parent: rootFolder.data.data.folder.id
    });
    console.log(`   Sub folder created with ID: ${subFolder.data.data.folder.id}`);

    // 2. Rename the root folder
    console.log('\n2. Renaming root folder...');
    const renamedRoot = await api.post(`/folders/${rootFolder.data.data.folder.id}/rename`, {
      newName: 'Renamed Root Folder'
    });
    console.log(`   Root folder renamed to: ${renamedRoot.data.data.folder.name}`);
    console.log(`   New path: ${renamedRoot.data.data.folder.path}`);

    // 3. Check sub-folder to see if its path was updated
    console.log('\n3. Checking if sub-folder path was updated...');
    const updatedSubFolder = await api.get(`/folders/contents/${subFolder.data.data.folder.id}`);
    console.log(`   Sub folder path: ${updatedSubFolder.data.data.folderContents.folder.path}`);
    
    // 4. Create a second root folder for moving
    console.log('\n4. Creating a second root folder...');
    const secondRoot = await api.post('/folders', { 
      name: 'Second Root Folder' 
    });
    console.log(`   Second root folder created with ID: ${secondRoot.data.data.folder.id}`);
    
    // 5. Move the sub-folder to the second root
    console.log('\n5. Moving sub-folder to second root...');
    const movedFolder = await api.post(`/folders/${subFolder.data.data.folder.id}/move`, {
      newParentId: secondRoot.data.data.folder.id
    });
    console.log(`   Sub folder moved to: ${secondRoot.data.data.folder.name}`);
    console.log(`   New path: ${movedFolder.data.data.folder.path}`);
    
    console.log('\n✅ Folder operations tested successfully!');
    return {
      rootFolderId: rootFolder.data.data.folder.id,
      secondRootId: secondRoot.data.data.folder.id,
      subFolderId: subFolder.data.data.folder.id
    };
  } catch (error) {
    console.error('❌ Error testing folder operations:', error.response?.data || error.message);
    throw error;
  }
}

// Test file operations
async function testFileOperations(folderIds) {
  try {
    console.log('\n\n----------- TESTING FILE OPERATIONS -----------');
    
    // For file testing, we'd typically upload a file first
    // Since we can't easily do that in a script, let's assume we already have a file
    // and we'll just test rename and move operations
    
    // Replace this ID with an actual file ID from your system
    let fileId = 'your_file_id_here';
    console.log(`Using file with ID: ${fileId}`);
    
    // 1. Rename the file
    console.log('\n1. Renaming file...');
    const renamedFile = await api.post(`/file/${fileId}/rename`, {
      newName: 'Renamed Test File'
    });
    console.log(`   File renamed to: ${renamedFile.data.data.file.name}`);
    console.log(`   New path: ${renamedFile.data.data.file.path}`);
    
    // 2. Move the file to a different folder
    console.log('\n2. Moving file to a different folder...');
    const movedFile = await api.post(`/file/${fileId}/move`, {
      newParentId: folderIds.secondRootId
    });
    console.log(`   File moved to folder: ${folderIds.secondRootId}`);
    console.log(`   New path: ${movedFile.data.data.file.path}`);
    
    console.log('\n✅ File operations tested successfully!');
  } catch (error) {
    console.error('❌ Error testing file operations:', error.response?.data || error.message);
  }
}

// Main test function
async function runTests() {
  try {
    console.log('🚀 STARTING TESTS FOR RENAME AND MOVE OPERATIONS\n');
    
    const folderIds = await testFolderOperations();
    
    // Uncomment the line below if you have a valid file ID
    // await testFileOperations(folderIds);
    
    console.log('\n🎉 ALL TESTS COMPLETED');
  } catch (error) {
    console.error('❌ Tests failed:', error.message);
  }
}

// Run the tests
runTests();
