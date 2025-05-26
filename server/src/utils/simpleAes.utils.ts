/**
 * Expands or repeats the original key to ensure it is exactly 16 bytes long.
 * This is necessary because AES requires a 16-byte key.
 *
 * @param originalKey The original key string
 * @returns Buffer containing a 16-byte key
 */
function expandKeyTo16Bytes(originalKey: string): Buffer {
  const keyBytes = Buffer.from(originalKey);
  const finalKey = Buffer.alloc(16);

  // Repeat key bytes until the 16-byte buffer is filled
  for (let i = 0; i < 16; i++) {
    finalKey[i] = keyBytes[i % keyBytes.length];
  }

  return finalKey;
}

/**
 * Applies a fake substitution cipher to a single byte.
 * This mimics the AES S-box operation by rotating bits and XORing with 0x63.
 *
 * @param byte Single byte to substitute
 * @returns Substituted byte
 */
function substituteByte(byte: number): number {
  return ((byte << 1) | (byte >> 7)) ^ 0x63;
}

/**
 * Reverses the substitution applied by substituteByte.
 *
 * @param byte Substituted byte
 * @returns Original byte before substitution
 */
function inverseSubstituteByte(byte: number): number {
  const step1 = byte ^ 0x63;
  return ((step1 >> 1) | (step1 << 7)) & 0xff;
}

/**
 * Applies substitution to each byte in the input buffer.
 *
 * @param data Buffer containing bytes to substitute
 * @returns New buffer with substituted bytes
 */
function applySubstitution(data: Buffer): Buffer {
  const result = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = substituteByte(data[i]);
  }
  return result;
}

/**
 * Applies inverse substitution to each byte in the input buffer.
 *
 * @param data Buffer with substituted bytes
 * @returns New buffer with original bytes restored
 */
function applyInverseSubstitution(data: Buffer): Buffer {
  const result = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = inverseSubstituteByte(data[i]);
  }
  return result;
}

/**
 * Rearranges bytes in each 16-byte block similar to AES ShiftRows step.
 * Each row of the 4x4 block is cyclically shifted by its row index.
 *
 * @param data Buffer containing data to shift
 * @returns New buffer with shifted rows
 */
function shiftRows(data: Buffer): Buffer {
  const result = Buffer.alloc(data.length);

  for (let blockStart = 0; blockStart < data.length; blockStart += 16) {
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const fromIndex = blockStart + row + 4 * ((col + row) % 4);
        const toIndex = blockStart + 4 * col + row;
        result[toIndex] = data[fromIndex];
      }
    }
  }

  return result;
}

/**
 * Reverses the ShiftRows operation by restoring original byte positions.
 *
 * @param data Buffer with shifted rows
 * @returns New buffer with rows unshifted
 */
function unshiftRows(data: Buffer): Buffer {
  const result = Buffer.alloc(data.length);

  for (let blockStart = 0; blockStart < data.length; blockStart += 16) {
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const toIndex = blockStart + row + 4 * ((col + row) % 4);
        const fromIndex = blockStart + 4 * col + row;
        result[toIndex] = data[fromIndex];
      }
    }
  }

  return result;
}

/**
 * Performs XOR operation between data bytes and key bytes.
 * The key bytes are repeated if data is longer than the key.
 *
 * @param data Buffer containing data to XOR
 * @param key Buffer containing key bytes
 * @returns New buffer with XORed result
 */
function xorWithKey(data: Buffer, key: Buffer): Buffer {
  const result = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }

  return result;
}

const TOTAL_ROUNDS = 10;

/**
 * Encrypts the input buffer using a simplified AES-like algorithm:
 * - Pads input to multiple of 16 bytes using PKCS-style padding
 * - Repeats rounds of substitution, row shifting, and key XOR
 *
 * @param input Buffer to encrypt
 * @param keyString Encryption key as string
 * @returns Encrypted buffer
 */
export function encrypt(input: Buffer, keyString: string): Buffer {
  const key = expandKeyTo16Bytes(keyString);

  // Pad input to block size 16 with padding bytes equal to padding length
  const padding = 16 - (input.length % 16 || 16);
  const padded = Buffer.concat([input, Buffer.alloc(padding, padding)]);

  let encrypted = padded;

  for (let round = 0; round < TOTAL_ROUNDS; round++) {
    encrypted = applySubstitution(encrypted);
    encrypted = shiftRows(encrypted);
    encrypted = xorWithKey(encrypted, key);
  }

  return encrypted;
}

/**
 * Decrypts an encrypted buffer with the AES-like algorithm:
 * - Applies inverse steps of encryption in reverse order
 * - Removes padding added during encryption
 *
 * @param encryptedData Buffer containing encrypted data
 * @param keyString Encryption key as string
 * @returns Decrypted original buffer
 */
export function decrypt(encryptedData: Buffer, keyString: string): Buffer {
  const key = expandKeyTo16Bytes(keyString);

  let decrypted = encryptedData;

  for (let round = 0; round < TOTAL_ROUNDS; round++) {
    decrypted = xorWithKey(decrypted, key);
    decrypted = unshiftRows(decrypted);
    decrypted = applyInverseSubstitution(decrypted);
  }

  // Remove PKCS-style padding
  const padValue = decrypted[decrypted.length - 1];
  if (padValue > 0 && padValue <= 16) {
    decrypted = decrypted.subarray(0, decrypted.length - padValue);
  }

  return decrypted;
}
