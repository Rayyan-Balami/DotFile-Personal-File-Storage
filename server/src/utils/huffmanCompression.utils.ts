import logger from './logger.utils.js';

/** Node of Huffman tree */
class Node {
  constructor(
    public byte: number | null = null,
    public freq: number = 0,
    public left: Node | null = null,
    public right: Node | null = null
  ) {}
}

const huffman = {
  /**
   * Compress a Buffer using Huffman coding.
   * Returns buffer with original length, frequency table, and encoded data.
   * 
   * @param data - Raw data buffer to compress
   * @returns Compressed Buffer with metadata
   */
  compress(data: Buffer): Buffer {
    if (data.length === 0) return data;

    // Store original length for decompression
    const originalLength = Buffer.alloc(4);
    originalLength.writeUInt32BE(data.length, 0);

    // Count frequency of each byte
    const freq = [...data].reduce((map, byte) =>
      map.set(byte, (map.get(byte) || 0) + 1), new Map<number, number>());

    // Create initial nodes from frequency map
    let nodes = [...freq.entries()].map(([byte, f]) => new Node(byte, f));

    // Edge case: single unique byte
    if (nodes.length === 1) {
      const byte = nodes[0].byte;
      return Buffer.concat([
        originalLength,
        Buffer.from(JSON.stringify([[byte, data.length]])),
        Buffer.from([0xFF, 0xFF]),
        Buffer.alloc(0)
      ]);
    }

    // Build Huffman tree by combining lowest frequency nodes
    while (nodes.length > 1) {
      nodes.sort((a, b) => a.freq - b.freq);
      const [left, right] = nodes.splice(0, 2);
      nodes.push(new Node(null, left.freq + right.freq, left, right));
    }

    // Generate binary codes for each byte
    const codes = new Map<number, string>();
    const traverse = (node: Node, code: string) => {
      if (node.byte !== null) codes.set(node.byte, code);
      if (node.left) traverse(node.left, code + '0');
      if (node.right) traverse(node.right, code + '1');
    };
    traverse(nodes[0], '');

    // Encode data to bits string
    let bits = '';
    for (const byte of data) {
      bits += codes.get(byte) || '';
    }

    // Pad bits to full byte length
    const padding = 8 - (bits.length % 8 || 8);
    bits = bits.padEnd(bits.length + padding, '0');

    // Convert bits to bytes buffer
    const encoded = Buffer.alloc(Math.ceil(bits.length / 8));
    for (let i = 0; i < bits.length; i += 8)
      encoded[i / 8] = parseInt(bits.substring(i, i + 8), 2);

    // Compose output: original length + freq table + separator + encoded data
    return Buffer.concat([
      originalLength,
      Buffer.from(JSON.stringify([...freq])),
      Buffer.from([0xFF, 0xFF]), // separator marker
      encoded
    ]);
  },

  /**
   * Decompress a Huffman compressed Buffer.
   * Reads original length and frequency table, rebuilds tree, decodes data.
   * 
   * @param data - Compressed data buffer with metadata
   * @returns Decompressed raw data buffer
   * @throws Error if format invalid or decompression fails
   */
  decompress(data: Buffer): Buffer {
    if (data.length === 0) return data;

    // Read original uncompressed length
    const originalLength = data.readUInt32BE(0);

    // Find separator marker (0xFF, 0xFF) after freq table
    const sep = data.indexOf(0xFF, 4);
    if (sep === -1 || data[sep + 1] !== 0xFF)
      throw new Error('Invalid compressed data format');

    // Parse frequency table JSON string
    const freqData = data.subarray(4, sep).toString();
    const freq = new Map<number, number>(JSON.parse(freqData));

    // Extract encoded data buffer after separator
    const encoded = data.subarray(sep + 2);

    // Single-byte edge case: repeated byte data
    if (freq.size === 1 && encoded.length === 0) {
      const [[byte, count]] = [...freq.entries()];
      return Buffer.alloc(count, byte);
    }

    // Rebuild Huffman tree from freq map
    const root = this.buildTree(freq);

    // Convert bytes to bit string for decoding
    let bits = '';
    for (const byte of encoded)
      bits += byte.toString(2).padStart(8, '0');

    // Decode bits by traversing tree nodes
    const result: number[] = [];
    let node = root;

    for (let i = 0; i < bits.length && result.length < originalLength; i++) {
      node = bits[i] === '0' ? node.left! : node.right!;
      if (node.byte !== null) {
        result.push(node.byte);
        node = root;
        if (result.length >= originalLength) break;
      }
    }

    return Buffer.from(result);
  },

  /**
   * Build Huffman tree from byte frequencies.
   * Combines lowest frequency nodes until one root node remains.
   * 
   * @param freq - Map of byte values to their frequencies
   * @returns Root node of Huffman tree
   */
  buildTree(freq: Map<number, number>): Node {
    let nodes = [...freq.entries()].map(([byte, f]) => new Node(byte, f));

    // Handle single unique byte by creating root with one child
    if (nodes.length === 1) {
      const root = new Node(null, nodes[0].freq);
      root.left = nodes[0];
      return root;
    }

    while (nodes.length > 1) {
      nodes.sort((a, b) => a.freq - b.freq);
      const [left, right] = nodes.splice(0, 2);
      nodes.push(new Node(null, left.freq + right.freq, left, right));
    }

    return nodes[0];
  }
};

/**
 * Compress buffer with Huffman coding.
 * Returns compressed buffer or original if compression fails.
 * 
 * @param data - Input buffer to compress
 * @returns Compressed buffer
 */
function compressBuffer(data: Buffer): Buffer {
  if (data.length === 0) return data;

  try {
    const result = huffman.compress(data);
    logger.debug(`Compressed ${data.length} bytes to ${result.length} bytes`);
    return result;
  } catch (error) {
    logger.error('Error during compression:', error);
    return data; // fallback to original data
  }
}

/**
 * Decompress buffer with Huffman coding.
 * Throws error if decompression fails.
 * 
 * @param data - Compressed buffer to decompress
 * @returns Decompressed buffer
 */
function decompressBuffer(data: Buffer): Buffer {
  if (data.length === 0) return data;

  try {
    return huffman.decompress(data);
  } catch (error) {
    logger.error('Error during decompression:', error);
    throw new Error('Failed to decompress data');
  }
}

export { compressBuffer, decompressBuffer };
export default huffman;
