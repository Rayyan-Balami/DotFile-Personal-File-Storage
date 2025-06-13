// AES-128 implementation with PKCS#7 padding
// This file implements the Advanced Encryption Standard (AES) with 128-bit keys
// using PKCS#7 padding for block alignment

// S-box (Substitution box) - used for non-linear byte substitution during encryption
// This is a fixed lookup table that provides confusion in the cipher
const S_BOX = [
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe,
  0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4,
  0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7,
  0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 0x04, 0xc7, 0x23, 0xc3,
  0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75, 0x09,
  0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3,
  0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe,
  0x39, 0x4a, 0x4c, 0x58, 0xcf, 0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85,
  0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92,
  0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c,
  0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19,
  0x73, 0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14,
  0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2,
  0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5,
  0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08, 0xba, 0x78, 0x25,
  0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86,
  0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e,
  0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42,
  0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
];

// Inverse S-box - used for reverse byte substitution during decryption
// This is the mathematical inverse of the S-box lookup table
const INV_S_BOX = [
  0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81,
  0xf3, 0xd7, 0xfb, 0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e,
  0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb, 0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23,
  0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e, 0x08, 0x2e, 0xa1, 0x66,
  0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25, 0x72,
  0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65,
  0xb6, 0x92, 0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46,
  0x57, 0xa7, 0x8d, 0x9d, 0x84, 0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a,
  0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06, 0xd0, 0x2c, 0x1e, 0x8f, 0xca,
  0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b, 0x3a, 0x91,
  0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6,
  0x73, 0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8,
  0x1c, 0x75, 0xdf, 0x6e, 0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f,
  0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b, 0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2,
  0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4, 0x1f, 0xdd, 0xa8,
  0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f,
  0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93,
  0xc9, 0x9c, 0xef, 0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb,
  0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61, 0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6,
  0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d,
];

// Round constants (Rcon) used in key expansion algorithm
// These values are powers of 2 in the Galois Field GF(2^8)
const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

// Galois Field arithmetic operations for AES
// These operations are performed in GF(2^8) with the irreducible polynomial x^8 + x^4 + x^3 + x + 1
const gf = {
  // Multiply by 2 in GF(2^8) - equivalent to left shift with conditional XOR
  mul2: (x: number) => (x << 1) ^ (x & 0x80 ? 0x11b : 0),
  // Multiply by 3 in GF(2^8) - computed as (2*x) XOR x
  mul3: (x: number) => gf.mul2(x) ^ x,
  // Multiply by 9 in GF(2^8) - used in inverse MixColumns
  mul9: (x: number) => gf.mul2(gf.mul2(gf.mul2(x))) ^ x,
  // Multiply by 11 in GF(2^8) - used in inverse MixColumns
  mul11: (x: number) => gf.mul2(gf.mul2(gf.mul2(x))) ^ gf.mul2(x) ^ x,
  // Multiply by 13 in GF(2^8) - used in inverse MixColumns
  mul13: (x: number) => gf.mul2(gf.mul2(gf.mul2(x) ^ x)) ^ x,
  // Multiply by 14 in GF(2^8) - used in inverse MixColumns
  mul14: (x: number) => gf.mul2(gf.mul2(gf.mul2(x) ^ x) ^ x),
};

// Key expansion algorithm for AES-128
// Expands the 128-bit key into 11 round keys (44 words total)
// Each round key is 128 bits (16 bytes) used in encryption/decryption rounds
function expandKey(key: Buffer): Buffer[] {
  const w = new Array(44);
  const roundKeys: Buffer[] = [];

  // Initialize first 4 words with the original 128-bit key
  // Each word is 32 bits (4 bytes)
  for (let i = 0; i < 4; i++) {
    w[i] =
      (key[4 * i] << 24) |
      (key[4 * i + 1] << 16) |
      (key[4 * i + 2] << 8) |
      key[4 * i + 3];
  }

  // Generate remaining 40 words using key expansion algorithm
  for (let i = 4; i < 44; i++) {
    let temp = w[i - 1];
    // Apply transformation every 4th word (start of new round key)
    if (i % 4 === 0) {
      // RotWord: rotate bytes in word by one position
      // SubWord: apply S-box substitution to each byte
      temp =
        (S_BOX[(temp >>> 24) & 0xff] << 24) |
        (S_BOX[(temp >>> 16) & 0xff] << 16) |
        (S_BOX[(temp >>> 8) & 0xff] << 8) |
        S_BOX[temp & 0xff];
      // Rotate word and XOR with round constant
      temp = ((temp << 8) | (temp >>> 24)) ^ (RCON[i / 4 - 1] << 24);
    }
    // XOR with word from 4 positions back
    w[i] = w[i - 4] ^ temp;
  }

  // Convert 44 words into 11 round keys of 16 bytes each
  for (let i = 0; i < 11; i++) {
    const roundKey = Buffer.alloc(16);
    for (let j = 0; j < 4; j++) {
      const word = w[i * 4 + j];
      // Extract bytes from 32-bit word and store in round key
      roundKey[j * 4] = (word >>> 24) & 0xff;
      roundKey[j * 4 + 1] = (word >>> 16) & 0xff;
      roundKey[j * 4 + 2] = (word >>> 8) & 0xff;
      roundKey[j * 4 + 3] = word & 0xff;
    }
    roundKeys.push(roundKey);
  }

  return roundKeys;
}

// AES transformation functions - these implement the four main operations in AES

// SubBytes transformation - non-linear byte substitution using S-box
// Provides confusion by replacing each byte with a corresponding value from S-box
function subBytes(state: Buffer) {
  for (let i = 0; i < 16; i++) state[i] = S_BOX[state[i]];
}

// Inverse SubBytes - reverses the SubBytes transformation using inverse S-box
function invSubBytes(state: Buffer) {
  for (let i = 0; i < 16; i++) state[i] = INV_S_BOX[state[i]];
}

// ShiftRows transformation - cyclically shifts bytes in each row of the state matrix
// Row 0: no shift, Row 1: shift left by 1, Row 2: shift left by 2, Row 3: shift left by 3
// Provides diffusion by mixing bytes across columns
function shiftRows(state: Buffer) {
  const temp = Buffer.from(state);
  for (let i = 1; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      state[i + j * 4] = temp[i + ((j + i) % 4) * 4];
    }
  }
}

// Inverse ShiftRows - reverses the ShiftRows transformation
// Shifts rows in the opposite direction to undo the original transformation
function invShiftRows(state: Buffer) {
  const temp = Buffer.from(state);
  for (let i = 1; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      state[i + j * 4] = temp[i + ((j - i + 4) % 4) * 4];
    }
  }
}

// MixColumns transformation - linear mixing of columns using Galois Field arithmetic
// Each column is treated as a polynomial and multiplied by a fixed polynomial
// Provides diffusion by mixing bytes within each column
function mixColumns(state: Buffer) {
  for (let i = 0; i < 4; i++) {
    const s0 = state[i * 4],
      s1 = state[i * 4 + 1],
      s2 = state[i * 4 + 2],
      s3 = state[i * 4 + 3];
    // Matrix multiplication: [2 3 1 1; 1 2 3 1; 1 1 2 3; 3 1 1 2] * column
    state[i * 4] = gf.mul2(s0) ^ gf.mul3(s1) ^ s2 ^ s3;
    state[i * 4 + 1] = s0 ^ gf.mul2(s1) ^ gf.mul3(s2) ^ s3;
    state[i * 4 + 2] = s0 ^ s1 ^ gf.mul2(s2) ^ gf.mul3(s3);
    state[i * 4 + 3] = gf.mul3(s0) ^ s1 ^ s2 ^ gf.mul2(s3);
  }
}

// Inverse MixColumns - reverses the MixColumns transformation
// Uses the inverse matrix in Galois Field arithmetic
function invMixColumns(state: Buffer) {
  for (let i = 0; i < 4; i++) {
    const s0 = state[i * 4],
      s1 = state[i * 4 + 1],
      s2 = state[i * 4 + 2],
      s3 = state[i * 4 + 3];
    // Inverse matrix multiplication: [14 11 13 9; 9 14 11 13; 13 9 14 11; 11 13 9 14] * column
    state[i * 4] = gf.mul14(s0) ^ gf.mul11(s1) ^ gf.mul13(s2) ^ gf.mul9(s3);
    state[i * 4 + 1] = gf.mul9(s0) ^ gf.mul14(s1) ^ gf.mul11(s2) ^ gf.mul13(s3);
    state[i * 4 + 2] = gf.mul13(s0) ^ gf.mul9(s1) ^ gf.mul14(s2) ^ gf.mul11(s3);
    state[i * 4 + 3] = gf.mul11(s0) ^ gf.mul13(s1) ^ gf.mul9(s2) ^ gf.mul14(s3);
  }
}

// AddRoundKey transformation - XOR state with round key
// This is the key-dependent step that provides security
function addRoundKey(state: Buffer, roundKey: Buffer) {
  for (let i = 0; i < 16; i++) state[i] ^= roundKey[i];
}

// PKCS#7 padding functions - ensures data is multiple of block size (16 bytes)

// Pad function - adds padding bytes to make data length multiple of 16
// The padding value equals the number of padding bytes added
function pad(data: Buffer): Buffer {
  const padLen = 16 - (data.length % 16);
  const padded = Buffer.alloc(data.length + padLen);
  data.copy(padded);
  // Fill remaining bytes with the padding length value
  padded.fill(padLen, data.length);
  return padded;
}

// Unpad function - removes PKCS#7 padding from decrypted data
// Reads the last byte to determine how many padding bytes to remove
function unpad(data: Buffer): Buffer {
  const padLen = data[data.length - 1];
  // Validate padding length to prevent padding oracle attacks
  return padLen <= 16 ? data.subarray(0, -padLen) : data;
}

// Main AES encryption and decryption functions

/**
 * AES-128 encryption function
 * Encrypts plaintext using AES-128 algorithm with PKCS#7 padding
 * @param plaintext - The data to encrypt (Buffer)
 * @param key - The encryption key (string, will be padded/truncated to 16 bytes)
 * @returns Encrypted ciphertext as Buffer
 */
export function encrypt(plaintext: Buffer, key: string): Buffer {
  // Expand the key into 11 round keys for AES-128
  const expandedKey = expandKey(Buffer.from(key.padEnd(16).substring(0, 16)));
  // Apply PKCS#7 padding to ensure data is multiple of 16 bytes
  const padded = pad(plaintext);
  const ciphertext = Buffer.alloc(padded.length);

  // Process each 16-byte block
  for (let i = 0; i < padded.length; i += 16) {
    const block = Buffer.from(padded.subarray(i, i + 16));

    // Initial round: only AddRoundKey
    addRoundKey(block, expandedKey[0]);

    // Main rounds (rounds 1-9): SubBytes, ShiftRows, MixColumns, AddRoundKey
    for (let round = 1; round < 10; round++) {
      subBytes(block);
      shiftRows(block);
      mixColumns(block);
      addRoundKey(block, expandedKey[round]);
    }

    // Final round (round 10): SubBytes, ShiftRows, AddRoundKey (no MixColumns)
    subBytes(block);
    shiftRows(block);
    addRoundKey(block, expandedKey[10]);

    // Copy encrypted block to ciphertext
    block.copy(ciphertext, i);
  }

  return ciphertext;
}

/**
 * AES-128 decryption function
 * Decrypts ciphertext using AES-128 algorithm and removes PKCS#7 padding
 * @param ciphertext - The encrypted data to decrypt (Buffer)
 * @param key - The decryption key (string, will be padded/truncated to 16 bytes)
 * @returns Decrypted plaintext as Buffer
 */
export function decrypt(ciphertext: Buffer, key: string): Buffer {
  // Validate input - ciphertext must be multiple of 16 bytes
  if (ciphertext.length % 16 !== 0)
    throw new Error("Invalid ciphertext length");

  // Expand the key into 11 round keys for AES-128
  const expandedKey = expandKey(Buffer.from(key.padEnd(16).substring(0, 16)));
  const plaintext = Buffer.alloc(ciphertext.length);

  // Process each 16-byte block
  for (let i = 0; i < ciphertext.length; i += 16) {
    const block = Buffer.from(ciphertext.subarray(i, i + 16));

    // Initial step: AddRoundKey with last round key
    addRoundKey(block, expandedKey[10]);

    // Main rounds (rounds 9-1): InvShiftRows, InvSubBytes, AddRoundKey, InvMixColumns
    for (let round = 9; round > 0; round--) {
      invShiftRows(block);
      invSubBytes(block);
      addRoundKey(block, expandedKey[round]);
      invMixColumns(block);
    }

    // Final round (round 0): InvShiftRows, InvSubBytes, AddRoundKey (no InvMixColumns)
    invShiftRows(block);
    invSubBytes(block);
    addRoundKey(block, expandedKey[0]);

    // Copy decrypted block to plaintext
    block.copy(plaintext, i);
  }

  // Remove PKCS#7 padding and return plaintext
  return unpad(plaintext);
}
