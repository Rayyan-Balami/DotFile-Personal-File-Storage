import logger from "@utils/logger.utils.js";

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
   * Returns compressed buffer or original if compression not beneficial.
   */
  compress(data: Buffer): Buffer {
    if (data.length === 0) return data;

    // Count frequency of each byte
    const freq = [...data].reduce(
      (map, byte) => map.set(byte, (map.get(byte) || 0) + 1),
      new Map<number, number>()
    );

    // If data has low entropy (few unique bytes), compression may not be beneficial
    if (freq.size > data.length * 0.8) {
      logger.debug("High entropy data, skipping compression");
      return data;
    }

    // Original length for decompression
    const originalLength = Buffer.alloc(4);
    originalLength.writeUInt32BE(data.length, 0);

    // Single byte case optimization
    if (freq.size === 1) {
      const [[byte]] = [...freq.entries()];
      const compressed = Buffer.concat([
        originalLength,
        Buffer.from(JSON.stringify([[byte, data.length]])),
        Buffer.from([0xff, 0xff]),
      ]);

      // Only use compression if it saves space
      if (compressed.length < data.length) {
        logger.debug(
          `Single-byte data compressed: ${data.length} -> ${compressed.length} bytes (${((compressed.length / data.length) * 100).toFixed(1)}%)`
        );
        return compressed;
      }
      return data;
    }

    // Build Huffman tree
    const root = this.buildTree(freq);

    // Generate codes and encode data
    const codes = new Map<number, string>();
    const traverse = (node: Node, code: string) => {
      if (node.byte !== null) codes.set(node.byte, code);
      if (node.left) traverse(node.left, code + "0");
      if (node.right) traverse(node.right, code + "1");
    };
    traverse(root, "");

    // Convert to bit string and pad
    let bits = [...data].map((byte) => codes.get(byte)).join("");
    const padding = 8 - (bits.length % 8 || 8);
    bits = bits.padEnd(bits.length + padding, "0");

    // Convert bits to bytes
    const encoded = Buffer.alloc(Math.ceil(bits.length / 8));
    for (let i = 0; i < bits.length; i += 8) {
      encoded[i / 8] = parseInt(bits.slice(i, i + 8), 2);
    }

    const compressed = Buffer.concat([
      originalLength,
      Buffer.from(JSON.stringify([...freq])),
      Buffer.from([0xff, 0xff]),
      encoded,
    ]);

    // Only use compression if it actually saves space
    if (compressed.length >= data.length) {
      logger.debug(
        `Compression not beneficial: ${data.length} -> ${compressed.length} bytes. Using original.`
      );
      return data;
    }

    const ratio = ((compressed.length / data.length) * 100).toFixed(1);
    logger.debug(
      `Compressed successfully: ${data.length} -> ${compressed.length} bytes (${ratio}%)`
    );
    return compressed;
  },

  /**
   * Decompress a Huffman compressed Buffer.
   */
  decompress(data: Buffer): Buffer {
    if (data.length === 0) return data;

    try {
      // Check if this is actually compressed data
      const sep = data.indexOf(0xff, 4);
      if (sep === -1 || data[sep + 1] !== 0xff) {
        logger.debug("Not a compressed buffer, returning as is");
        return data;
      }

      const originalLength = data.readUInt32BE(0);
      const freqData = data.subarray(4, sep).toString();
      const freq = new Map<number, number>(JSON.parse(freqData));
      const encoded = data.subarray(sep + 2);

      // Handle single byte case
      if (freq.size === 1) {
        const [[byte, count]] = [...freq.entries()];
        return Buffer.alloc(count, byte);
      }

      // Rebuild tree and decode
      const root = this.buildTree(freq);
      let bits = [...encoded]
        .map((byte) => byte.toString(2).padStart(8, "0"))
        .join("");
      const result: number[] = [];
      let node = root;

      for (let i = 0; result.length < originalLength && i < bits.length; i++) {
        node = bits[i] === "0" ? node.left! : node.right!;
        if (node.byte !== null) {
          result.push(node.byte);
          node = root;
        }
      }

      const decompressed = Buffer.from(result);
      logger.debug(
        `Decompressed successfully: ${data.length} -> ${decompressed.length} bytes`
      );
      return decompressed;
    } catch (error) {
      logger.debug("Decompression failed, returning original buffer");
      return data;
    }
  },

  // Build Huffman tree from frequency map
  buildTree(freq: Map<number, number>): Node {
    let nodes = [...freq.entries()].map(([byte, f]) => new Node(byte, f));
    while (nodes.length > 1) {
      nodes.sort((a, b) => a.freq - b.freq);
      const [left, right] = nodes.splice(0, 2);
      nodes.push(new Node(null, left.freq + right.freq, left, right));
    }
    return nodes[0];
  },
};

/**
 * Public compression interface with error handling
 */
function compressBuffer(data: Buffer): Buffer {
  try {
    return huffman.compress(data);
  } catch (error) {
    logger.error("Compression failed:", error);
    return data;
  }
}

/**
 * Public decompression interface with error handling
 */
function decompressBuffer(data: Buffer): Buffer {
  try {
    return huffman.decompress(data);
  } catch (error) {
    logger.error("Decompression failed:", error);
    return data;
  }
}

export { compressBuffer, decompressBuffer };
export default huffman;
