// test.ts

import { encryptFileBuffer, decryptFileBuffer } from './src/utils/cryptoUtil.utils.js';
import { compressBuffer, decompressBuffer } from './src/utils/huffmanCompression.utils.js';
import fs from 'fs';

// Test encryption and decryption with Huffman compression
function testEncryptionWithCompression() {
  const userId = 'user123';
  const originalText = 'Confidential test message!';
  const originalBuffer = Buffer.from(originalText);

  console.log('[TEST] Original:', originalText);

  // Test raw compression
  console.log('\n--- Testing raw compression ---');
  const compressedBuffer = compressBuffer(originalBuffer);
  console.log('[TEST] Compressed size:', compressedBuffer.length, 'bytes');
  const decompressedBuffer = decompressBuffer(compressedBuffer);
  console.log('[TEST] Decompressed:', decompressedBuffer.toString());
  
  // Test encryption with compression
  console.log('\n--- Testing encryption with compression ---');
  const encryptedBuffer = encryptFileBuffer(originalBuffer, userId);
  console.log('[TEST] Encrypted size:', encryptedBuffer.length, 'bytes');
  console.log('[TEST] Encrypted (hex):', encryptedBuffer.toString('hex').slice(0, 64), '...');
  
  const decryptedBuffer = decryptFileBuffer(encryptedBuffer, userId);
  console.log('[TEST] Decrypted:', decryptedBuffer.toString());

  // Verify results
  console.log('\n--- Verification ---');
  if (originalText === decryptedBuffer.toString()) {
    console.log('✅ TEST PASSED: Original and decrypted texts match!');
  } else {
    console.error('❌ TEST FAILED: Original and decrypted texts do not match!');
  }
}

// Test with a larger file to see compression benefits
function testWithLargerFile() {
  try {
    const userId = 'user123';
    // Create a test file with repetitive content
    const repeatedText = 'This is a test file with repetitive content. '.repeat(1000);
    const testFilePath = './test-file.txt';
    
    // Write test file
    fs.writeFileSync(testFilePath, repeatedText);
    
    // Read the test file
    const fileBuffer = fs.readFileSync(testFilePath);
    console.log('\n--- Testing with larger file ---');
    console.log('[TEST] Original file size:', fileBuffer.length, 'bytes');
    
    // Compress, encrypt, decrypt, decompress
    console.log('\n--- Compressing and encrypting ---');
    const startTime = Date.now();
    const encryptedBuffer = encryptFileBuffer(fileBuffer, userId);
    const encryptTime = Date.now();
    console.log('[TEST] Encrypted size:', encryptedBuffer.length, 'bytes');
    console.log('[TEST] Encryption time:', encryptTime - startTime, 'ms');
    
    console.log('\n--- Decrypting and decompressing ---');
    const decryptedBuffer = decryptFileBuffer(encryptedBuffer, userId);
    const decryptTime = Date.now();
    console.log('[TEST] Decrypted size:', decryptedBuffer.length, 'bytes');
    console.log('[TEST] Decryption time:', decryptTime - encryptTime, 'ms');
    
    // Verify results
    console.log('\n--- Verification ---');
    if (fileBuffer.toString() === decryptedBuffer.toString()) {
      console.log('✅ TEST PASSED: Original and decrypted files match!');
    } else {
      console.error('❌ TEST FAILED: Original and decrypted files do not match!');
    }
    
    // Clean up
    fs.unlinkSync(testFilePath);
  } catch (error) {
    console.error('Error in large file test:', error);
  }
}

// Run the tests
testEncryptionWithCompression();
testWithLargerFile();
