/**
 * Summary of AES-128:
 *
 * Plaintext → Split into 16-byte blocks → For each block:
 *
 * ENCRYPTION:
 * 1. AddRoundKey (Mix with Key 0)
 * 2. Apply 9 Main Rounds:
 *    - SubBytes (Substitute each byte)
 *    - ShiftRows (Shuffle the bytes)
 *    - MixColumns (Mix the bytes within columns)
 *    - AddRoundKey (Mix with the round key)
 * 3. Apply Final Round:
 *    - SubBytes
 *    - ShiftRows
 *    - AddRoundKey (Mix with Key 10)
 * 4. Combine all blocks to get the ciphertext
 *
 * DECRYPTION:
 * 1. AddRoundKey (Mix with Key 10)
 * 2. Apply 9 Main Rounds:
 *    - InvShiftRows (Undo the shuffling)
 *    - InvSubBytes (Undo the substitution)
 *    - AddRoundKey (Mix with the round key)
 *    - InvMixColumns (Undo the mixing)
 * 3. Apply Final Round:
 *    - InvShiftRows
 *    - InvSubBytes
 *    - AddRoundKey (Mix with Key 0)
 * 4. Remove padding and combine blocks to get the plaintext
 */

// S-box: Fixed lookup table for byte substitution
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

// Inverse S-box: Used for reverse byte substitution during decryption
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

// Rcon: Round constants for key expansion (powers of 2 in GF(2^8))
const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

/**
 * Galois Field (GF) math for AES
 *
 * These functions perform special multiplication used in the MixColumns step.
 * Don't worry too much about these - they're just math operations for mixing data.
 * Think of them as special recipes for combining bytes in a secure way.
 */
const gf = {
  // Multiply by 2 in GF(2^8) - the basic operation
  mul2: (x: number) => (x << 1) ^ (x & 0x80 ? 0x11b : 0),

  // The following are derived from mul2
  mul3: (x: number) => gf.mul2(x) ^ x, // 3 = 2 + 1
  mul9: (x: number) => gf.mul2(gf.mul2(gf.mul2(x))) ^ x, // 9 = 8 + 1
  mul11: (x: number) => gf.mul2(gf.mul2(gf.mul2(x))) ^ gf.mul2(x) ^ x, // 11 = 8 + 2 + 1
  mul13: (x: number) => gf.mul2(gf.mul2(gf.mul2(x) ^ x)) ^ x, // 13 = 8 + 4 + 1
  mul14: (x: number) => gf.mul2(gf.mul2(gf.mul2(x) ^ x) ^ x), // 14 = 8 + 4 + 2
};

/**
 * ExpandKey: Creates 11 round keys from the original 16-byte key
 * We need a different key for each round of encryption
 */
function expandKey(key: Buffer): Buffer[] {
  const words = new Array(44); // 4 words per round key * 11 round keys = 44 words
  const roundKeys: Buffer[] = [];

  // Step 1: Copy the original key into the first 4 words
  for (let i = 0; i < 4; i++) {
    words[i] =
      (key[4 * i] << 24) |
      (key[4 * i + 1] << 16) |
      (key[4 * i + 2] << 8) |
      key[4 * i + 3];
  }

  // Step 2: Generate the remaining 40 words
  for (let i = 4; i < 44; i++) {
    let temp = words[i - 1];

    // Every 4th word gets special treatment
    if (i % 4 === 0) {
      // Rotate word: shift bytes left
      temp = ((temp << 8) | (temp >>> 24)) & 0xffffffff;

      // Apply S-box to each byte
      const b0 = S_BOX[(temp >>> 24) & 0xff];
      const b1 = S_BOX[(temp >>> 16) & 0xff];
      const b2 = S_BOX[(temp >>> 8) & 0xff];
      const b3 = S_BOX[temp & 0xff];

      temp = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;

      // XOR with round constant
      temp ^= RCON[Math.floor(i / 4) - 1] << 24;
    }

    // Each word is XOR of previous word and word 4 positions back
    words[i] = words[i - 4] ^ temp;
  }

  // Step 3: Group words into 11 round keys (16 bytes each)
  for (let round = 0; round < 11; round++) {
    const roundKey = Buffer.allocUnsafe(16);

    // Each round key consists of 4 words (16 bytes)
    for (let j = 0; j < 4; j++) {
      const word = words[round * 4 + j];
      // Convert word back to 4 bytes
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

/**
 * SubBytes: Substitutes each byte with a value from the S-box
 * This creates confusion by replacing each byte with a non-linear mapping
 */
function subBytes(state: Buffer) {
  for (let i = 0; i < 16; i++) {
    state[i] = S_BOX[state[i]];
  }
}

/**
 * InvSubBytes: Reverses the substitution using the inverse S-box
 * This is the opposite of subBytes, used during decryption
 */
function invSubBytes(state: Buffer) {
  for (let i = 0; i < 16; i++) {
    state[i] = INV_S_BOX[state[i]];
  }
}

/**
 * ShiftRows: Moves bytes between columns by rotating each row
 * - Row 0: No shift
 * - Row 1: Shift 1 position left
 * - Row 2: Shift 2 positions left
 * - Row 3: Shift 3 positions left
 *
 * This creates diffusion by spreading the influence of each byte
 */
function shiftRows(state: Buffer) {
  // Make a copy of the original state
  const temp = Buffer.from(state);

  // For each row except the first (which stays unchanged)
  for (let row = 1; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      // Calculate the new column position after shifting
      const newCol = (col + row) % 4;
      // Copy from the original state to the new position
      state[row + col * 4] = temp[row + newCol * 4];
    }
  }
}

/**
 * InvShiftRows: Reverses the row shifting (moves right instead of left)
 * Used during decryption
 */
function invShiftRows(state: Buffer) {
  const temp = Buffer.from(state);
  for (let row = 1; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const newCol = (col - row + 4) % 4; // Shift right instead of left
      state[row + col * 4] = temp[row + newCol * 4];
    }
  }
}

/**
 * MixColumns: Transforms each column by mixing its bytes
 * This creates diffusion within each column, ensuring changes propagate quickly
 *
 * Each column is multiplied by a fixed matrix:
 * |2 3 1 1|
 * |1 2 3 1|
 * |1 1 2 3|
 * |3 1 1 2|
 */
function mixColumns(state: Buffer) {
  for (let col = 0; col < 4; col++) {
    // Get all 4 bytes from this column
    const s0 = state[col * 4]; // First byte in column
    const s1 = state[col * 4 + 1]; // Second byte in column
    const s2 = state[col * 4 + 2]; // Third byte in column
    const s3 = state[col * 4 + 3]; // Fourth byte in column

    // Mix the bytes according to the matrix multiplication formula
    state[col * 4] = gf.mul2(s0) ^ gf.mul3(s1) ^ s2 ^ s3;
    state[col * 4 + 1] = s0 ^ gf.mul2(s1) ^ gf.mul3(s2) ^ s3;
    state[col * 4 + 2] = s0 ^ s1 ^ gf.mul2(s2) ^ gf.mul3(s3);
    state[col * 4 + 3] = gf.mul3(s0) ^ s1 ^ s2 ^ gf.mul2(s3);
  }
}

/**
 * InvMixColumns: Reverses the column mixing
 * Uses the inverse matrix of MixColumns
 */
function invMixColumns(state: Buffer) {
  for (let col = 0; col < 4; col++) {
    const s0 = state[col * 4];
    const s1 = state[col * 4 + 1];
    const s2 = state[col * 4 + 2];
    const s3 = state[col * 4 + 3];

    // Apply inverse matrix multiplication
    state[col * 4] = gf.mul14(s0) ^ gf.mul11(s1) ^ gf.mul13(s2) ^ gf.mul9(s3);
    state[col * 4 + 1] =
      gf.mul9(s0) ^ gf.mul14(s1) ^ gf.mul11(s2) ^ gf.mul13(s3);
    state[col * 4 + 2] =
      gf.mul13(s0) ^ gf.mul9(s1) ^ gf.mul14(s2) ^ gf.mul11(s3);
    state[col * 4 + 3] =
      gf.mul11(s0) ^ gf.mul13(s1) ^ gf.mul9(s2) ^ gf.mul14(s3);
  }
}

/**
 * AddRoundKey: XORs the state with the round key
 * This is the only step that uses the actual encryption key
 */
function addRoundKey(state: Buffer, roundKey: Buffer) {
  for (let i = 0; i < 16; i++) {
    state[i] ^= roundKey[i]; // XOR each byte with the corresponding key byte
  }
}

/**
 * Pad: Adds PKCS#7 padding to make data a multiple of 16 bytes
 * Example: If we need 3 bytes of padding, we add [03,03,03]
 */
function pad(data: Buffer): Buffer {
  // Calculate how many bytes of padding we need
  const padLen = 16 - (data.length % 16);

  // Create a new buffer with room for the padding
  const padded = Buffer.alloc(data.length + padLen);

  // Copy the original data
  data.copy(padded);

  // Add the padding bytes (each byte = the number of padding bytes)
  padded.fill(padLen, data.length);

  return padded;
}

/**
 * Unpad: Removes PKCS#7 padding
 * Reads the last byte to determine how many padding bytes to remove
 */
function unpad(data: Buffer): Buffer {
  const padLen = data[data.length - 1];
  // Make sure padding length is valid (not more than a block size)
  return padLen <= 16 ? data.subarray(0, -padLen) : data;
}

// Main AES encryption and decryption functions

/**
 * AES-128 Encryption
 *
 * @param plaintext - The data to encrypt
 * @param key - The encryption key (will be adjusted to 16 bytes)
 * @returns The encrypted data
 */
export function encrypt(plaintext: Buffer, key: string): Buffer {
  // Step 1: Make sure the key is exactly 16 bytes (128 bits)
  const normalizedKey = Buffer.from(key.padEnd(16).substring(0, 16));

  // Step 2: Generate all the round keys we'll need
  const roundKeys = expandKey(normalizedKey);

  // Step 3: Add padding so our data is a multiple of 16 bytes
  const padded = pad(plaintext);
  const ciphertext = Buffer.alloc(padded.length);

  // Step 4: Encrypt each 16-byte block separately
  for (let i = 0; i < padded.length; i += 16) {
    // Get the next block to encrypt
    const block = Buffer.from(padded.subarray(i, i + 16));

    // Step 4a: Initial round - just mix with the original key
    addRoundKey(block, roundKeys[0]);

    // Step 4b: Main rounds (1-9) - apply all four transformations
    for (let round = 1; round < 10; round++) {
      subBytes(block); // Replace each byte using S-box
      shiftRows(block); // Shift rows for diffusion
      mixColumns(block); // Mix columns for more diffusion
      addRoundKey(block, roundKeys[round]); // Mix with round key
    }

    // Step 4c: Final round - skip mixColumns
    subBytes(block);
    shiftRows(block);
    addRoundKey(block, roundKeys[10]);

    // Step 4d: Add this encrypted block to our result
    block.copy(ciphertext, i);
  }

  return ciphertext;
}

/**
 * AES-128 Decryption
 *
 * @param ciphertext - The encrypted data (must be a multiple of 16 bytes)
 * @param key - The encryption key (will be adjusted to 16 bytes)
 * @returns The decrypted data with padding removed
 */
export function decrypt(ciphertext: Buffer, key: string): Buffer {
  // Step 1: Check that the input is valid (must be multiple of 16 bytes)
  if (ciphertext.length % 16 !== 0) {
    throw new Error("Invalid ciphertext length");
  }

  // Step 2: Make sure the key is exactly 16 bytes (128 bits)
  const normalizedKey = Buffer.from(key.padEnd(16).substring(0, 16));

  // Step 3: Generate all the round keys we'll need
  const roundKeys = expandKey(normalizedKey);

  // Step 4: Prepare a buffer for the decrypted data
  const plaintext = Buffer.alloc(ciphertext.length);

  // Step 5: Decrypt each 16-byte block separately
  for (let i = 0; i < ciphertext.length; i += 16) {
    // Get the next block to decrypt
    const block = Buffer.from(ciphertext.subarray(i, i + 16));

    // Step 5a: Initial round - mix with the last round key
    addRoundKey(block, roundKeys[10]);

    // Step 5b: Main rounds (9-1) - apply inverse transformations
    for (let round = 9; round > 0; round--) {
      invShiftRows(block); // Reverse the row shifting
      invSubBytes(block); // Reverse the byte substitution
      addRoundKey(block, roundKeys[round]); // Mix with round key
      invMixColumns(block); // Reverse the column mixing
    }

    // Step 5c: Final round - no invMixColumns
    invShiftRows(block);
    invSubBytes(block);
    addRoundKey(block, roundKeys[0]); // Mix with original key

    // Step 5d: Add this decrypted block to our result
    block.copy(plaintext, i);
  }

  // Step 6: Remove the padding and return the original data
  return unpad(plaintext);
}
