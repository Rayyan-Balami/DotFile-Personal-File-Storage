/**
 * Ensures the key is exactly 16 bytes long.
 */
function expandKeyTo16Bytes(originalKey: string): Buffer {
  const keyBytes = Buffer.from(originalKey);
  const finalKey = Buffer.alloc(16);

  for (let i = 0; i < 16; i++) {
    finalKey[i] = keyBytes[i % keyBytes.length];
  }

  return finalKey;
}

/**
 * Fake substitution (like AES S-box)
 */
function substituteByte(byte: number): number {
  return ((byte << 1) | (byte >> 7)) ^ 0x63;
}

function inverseSubstituteByte(byte: number): number {
  const step1 = byte ^ 0x63;
  return ((step1 >> 1) | (step1 << 7)) & 0xff;
}

/**
 * Apply substitution to all bytes
 */
function applySubstitution(data: Buffer): Buffer {
  const result = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = substituteByte(data[i]);
  }
  return result;
}

function applyInverseSubstitution(data: Buffer): Buffer {
  const result = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = inverseSubstituteByte(data[i]);
  }
  return result;
}

/**
 * Rearrange bytes in AES-like row shifting
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
 * XOR key with data
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
 * Encrypt buffer using basic AES-like steps
 */
export function encrypt(input: Buffer, keyString: string): Buffer {
  const key = expandKeyTo16Bytes(keyString);

  // Add padding
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
 * Decrypt buffer
 */
export function decrypt(encryptedData: Buffer, keyString: string): Buffer {
  const key = expandKeyTo16Bytes(keyString);

  let decrypted = encryptedData;

  for (let round = 0; round < TOTAL_ROUNDS; round++) {
    decrypted = xorWithKey(decrypted, key);
    decrypted = unshiftRows(decrypted);
    decrypted = applyInverseSubstitution(decrypted);
  }

  // Remove padding
  const padValue = decrypted[decrypted.length - 1];
  if (padValue > 0 && padValue <= 16) {
    decrypted = decrypted.subarray(0, decrypted.length - padValue);
  }

  return decrypted;
}
