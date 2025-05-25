import logger from './logger.utils.js';

/**
 * Simple and concise Huffman coding implementation
 */

class Node {
  constructor(
    public byte: number | null = null,
    public freq: number = 0,
    public left: Node | null = null,
    public right: Node | null = null
  ) {}
}

const huffman = {
  compress(data: Buffer): Buffer {
    // If data is empty or too small, just return it
    if (data.length === 0) return data;

    // Store original length for decompression
    const originalLength = Buffer.alloc(4);
    originalLength.writeUInt32BE(data.length, 0);

    // Count frequency of each byte
    const freq = [...data].reduce((map, byte) => 
      map.set(byte, (map.get(byte) || 0) + 1), new Map<number, number>());
    
    // Build Huffman tree
    let nodes = [...freq.entries()].map(([byte, f]) => new Node(byte, f));
    
    // Handle edge case with only one unique byte
    if (nodes.length === 1) {
      const byte = nodes[0].byte;
      return Buffer.concat([
        originalLength,
        Buffer.from(JSON.stringify([[byte, data.length]])),
        Buffer.from([0xFF, 0xFF]),
        Buffer.alloc(0)
      ]);
    }

    while (nodes.length > 1) {
      nodes.sort((a, b) => a.freq - b.freq);
      const [left, right] = nodes.splice(0, 2);
      nodes.push(new Node(null, left.freq + right.freq, left, right));
    }

    // Generate codes for each byte
    const codes = new Map<number, string>();
    const traverse = (node: Node, code: string) => {
      if (node.byte !== null) codes.set(node.byte, code);
      if (node.left) traverse(node.left, code + '0');
      if (node.right) traverse(node.right, code + '1');
    };
    traverse(nodes[0], '');

    // Encode data using the generated codes
    let bits = '';
    for (const byte of data) {
      bits += codes.get(byte) || '';
    }

    // Add padding to complete the last byte
    const padding = 8 - (bits.length % 8 || 8);
    bits = bits.padEnd(bits.length + padding, '0');
    
    // Convert bit string to bytes
    const encoded = Buffer.alloc(Math.ceil(bits.length / 8));
    for (let i = 0; i < bits.length; i += 8) 
      encoded[i/8] = parseInt(bits.substring(i, i + 8), 2);

    // Create the compressed buffer with metadata
    return Buffer.concat([
      originalLength,
      Buffer.from(JSON.stringify([...freq])), 
      Buffer.from([0xFF, 0xFF]), // Marker to separate frequency table from data
      encoded
    ]);
  },

  decompress(data: Buffer): Buffer {
    if (data.length === 0) return data;

    // Extract original length
    const originalLength = data.readUInt32BE(0);

    // Find the separator marker
    const sep = data.indexOf(0xFF, 4);
    if (sep === -1 || data[sep + 1] !== 0xFF) {
      throw new Error('Invalid compressed data format');
    }

    // Parse frequency table
    const freqData = data.subarray(4, sep).toString();
    const freq = new Map<number, number>(JSON.parse(freqData));
    
    // Extract encoded data
    const encoded = data.subarray(sep + 2);
    
    // Handle edge case with single byte
    if (freq.size === 1 && encoded.length === 0) {
      const [[byte, count]] = [...freq.entries()];
      return Buffer.alloc(count, byte);
    }
    
    // Rebuild the Huffman tree
    const root = this.buildTree(freq);
    
    // Convert encoded bytes to bit string
    let bits = '';
    for (const byte of encoded) 
      bits += byte.toString(2).padStart(8, '0');

    // Decode by traversing the tree
    const result = [];
    let node = root;

    for (let i = 0; i < bits.length && result.length < originalLength; i++) {
      node = bits[i] === '0' ? node.left! : node.right!;
      
      if (node.byte !== null) {
        result.push(node.byte);
        node = root; // Reset to root for next symbol
        
        // Stop if we've reached the original length
        if (result.length >= originalLength) break;
      }
    }
    
    return Buffer.from(result);
  },

  buildTree(freq: Map<number, number>): Node {
    let nodes = [...freq.entries()].map(([byte, f]) => new Node(byte, f));
    
    // Handle the case of only one unique byte
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

// Export functions with the same interface as before for compatibility with existing code
function compressBuffer(data: Buffer): Buffer {
  if (data.length === 0) return data;
  
  try {
    const result = huffman.compress(data);
    logger.debug(`Compressed ${data.length} bytes to ${result.length} bytes`);
    return result;
  } catch (error) {
    logger.error('Error during compression:', error);
    return data; // Return original data if compression fails
  }
}

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
