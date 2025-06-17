import { Request } from "express";
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

/**
 * Format tree or codebook for visualization - limited to top 5 entries
 */
const formatCodebook = (codes: Map<number, string>, freq?: Map<number, number>): string => {
  // Limit to top 5 entries
  const MAX_ENTRIES = 5;
  
  // Sort entries by frequency if available, otherwise by byte value
  let entries: [number, string][];
  if (freq && freq.size > 0) {
    entries = [...codes.entries()]
      .sort((a, b) => (freq.get(b[0]) || 0) - (freq.get(a[0]) || 0))
      .slice(0, MAX_ENTRIES);
  } else {
    entries = [...codes.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(0, MAX_ENTRIES);
  }
  
  let result = `Huffman Codes (showing top ${entries.length} of ${codes.size} total):\n`;
  for (const [byte, code] of entries) {
    // Show printable ASCII as characters, others as hex
    const byteValue = byte >= 32 && byte <= 126 
      ? `'${String.fromCharCode(byte)}'` 
      : `0x${byte.toString(16).padStart(2, '0')}`;
    
    result += `${byteValue.padEnd(10)} -> ${code}\n`;
  }
  
  if (codes.size > MAX_ENTRIES) {
    result += `... (${codes.size - MAX_ENTRIES} more entries truncated)\n`;
  }
  
  return result;
};

/**
 * Format frequency table for visualization - limited to top 5 entries
 */
const formatFrequencies = (freq: Map<number, number>): string => {
  // Limit to top 5 entries
  const MAX_ENTRIES = 5;
  
  const entries = [...freq.entries()]
    .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
    .slice(0, MAX_ENTRIES); // Show only top entries
  
  let result = `Byte Frequencies (top ${entries.length} of ${freq.size} total):\n`;
  for (const [byte, count] of entries) {
    const byteValue = byte >= 32 && byte <= 126 
      ? `'${String.fromCharCode(byte)}'` 
      : `0x${byte.toString(16).padStart(2, '0')}`;
    
    result += `${byteValue.padEnd(10)}: ${count}\n`;
  }
  
  if (freq.size > MAX_ENTRIES) {
    result += `... (${freq.size - MAX_ENTRIES} more entries truncated)\n`;
  }
  
  return result;
};

const huffman = {
  /**
   * Compress a Buffer using Huffman coding with detailed logging.
   * Returns compressed buffer or original if compression not beneficial.
   */
  compress(data: Buffer, req?: Request): Buffer {
    if (data.length === 0) return data;

    if (req?.addLog) {
      req.addLog("Huffman", "INFO", `Starting Huffman compression on ${data.length} bytes`);
    }

    // Count frequency of each byte
    const freq = [...data].reduce(
      (map, byte) => map.set(byte, (map.get(byte) || 0) + 1),
      new Map<number, number>()
    );

    if (req?.addLog) {
      req.addLog("Huffman", "DEBUG", `Found ${freq.size} unique bytes in input of ${data.length} bytes`);
      
      // Only show detailed frequency table for small to medium files
      if (data.length <= 1024 * 1024) { // 1MB threshold
        req.addLog("Huffman", "DEBUG", formatFrequencies(freq));
      } else {
        // For large files, just show a summary
        req.addLog("Huffman", "DEBUG", `Large file: frequency details truncated`);
      }
    }

    // If data has low entropy (few unique bytes), compression may not be beneficial
    if (freq.size > data.length * 0.8) {
      logger.debug("High entropy data, skipping compression");
      
      if (req?.addLog) {
        req.addLog("Huffman", "INFO", `High entropy data detected (${freq.size} unique bytes / ${data.length} total)`);
        req.addLog("Huffman", "INFO", `Skipping compression, returning original buffer`);
      }
      
      return data;
    }

    // Original length for decompression
    const originalLength = Buffer.alloc(4);
    originalLength.writeUInt32BE(data.length, 0);

    // Single byte case optimization
    if (freq.size === 1) {
      const [[byte]] = [...freq.entries()];
      
      if (req?.addLog) {
        req.addLog("Huffman", "DEBUG", `Single byte data: all ${data.length} bytes are value ${byte}`);
        req.addLog("Huffman", "DEBUG", `Using special single-byte encoding`);
      }
      
      const compressed = Buffer.concat([
        originalLength,
        Buffer.from(JSON.stringify([[byte, data.length]])),
        Buffer.from([0xff, 0xff]),
      ]);

      // Only use compression if it saves space
      if (compressed.length < data.length) {
        const ratio = ((compressed.length / data.length) * 100).toFixed(1);
        logger.debug(
          `Single-byte data compressed: ${data.length} -> ${compressed.length} bytes (${ratio}%)`
        );
        
        if (req?.addLog) {
          req.addLog("Huffman", "INFO", 
            `Single-byte compression successful: ${data.length} → ${compressed.length} bytes (${ratio}%)`);
        }
        
        return compressed;
      }
      
      if (req?.addLog) {
        req.addLog("Huffman", "INFO", `Compression not beneficial, returning original buffer`);
      }
      
      return data;
    }

    // Build Huffman tree
    const root = this.buildTree(freq);
    
    if (req?.addLog) {
      req.addLog("Huffman", "DEBUG", `Built Huffman tree with ${freq.size} nodes`);
    }

    // Generate codes and encode data
    const codes = new Map<number, string>();
    const traverse = (node: Node, code: string) => {
      if (node.byte !== null) codes.set(node.byte, code);
      if (node.left) traverse(node.left, code + "0");
      if (node.right) traverse(node.right, code + "1");
    };
    traverse(root, "");
    
    if (req?.addLog) {
      // For large files, log less detail
      if (data.length > 1024 * 1024) { // 1MB threshold
        req.addLog("Huffman", "DEBUG", `Generated ${codes.size} Huffman codes for large file (details truncated)`);
      } else {
        req.addLog("Huffman", "DEBUG", formatCodebook(codes, freq));
      }
      
      // Calculate some statistics
      const avgBitLength = [...codes.entries()].reduce((sum, [byte, code]) => 
        sum + code.length * (freq.get(byte) || 0), 0) / data.length;
      
      req.addLog("Huffman", "DEBUG", 
        `Average code length: ${avgBitLength.toFixed(2)} bits/byte (ideal: ${(Math.log2(freq.size)).toFixed(2)} bits)`);
    }

    // Convert to bit string and pad
    let bits = [...data].map((byte) => codes.get(byte)).join("");
    const padding = 8 - (bits.length % 8 || 8);
    bits = bits.padEnd(bits.length + padding, "0");
    
    if (req?.addLog) {
      // More concise log for large files
      req.addLog("Huffman", "DEBUG", 
        `Encoded ${data.length} bytes to ${Math.ceil(bits.length/8)} bytes (${padding} padding bits added)`);
    }

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
      
      if (req?.addLog) {
        req.addLog("Huffman", "INFO", 
          `Compression not beneficial: ${data.length} → ${compressed.length} bytes. Using original.`);
      }
      
      return data;
    }

    const ratio = ((compressed.length / data.length) * 100).toFixed(1);
    logger.debug(
      `Compressed successfully: ${data.length} -> ${compressed.length} bytes (${ratio}%)`
    );
    
    if (req?.addLog) {
      req.addLog("Huffman", "INFO", 
        `Compressed successfully: ${data.length} → ${compressed.length} bytes (${ratio}%)`);
    }
    
    return compressed;
  },

  /**
   * Decompress a Huffman compressed Buffer with detailed logging.
   */
  decompress(data: Buffer, req?: Request): Buffer {
    if (data.length === 0) return data;

    try {
      if (req?.addLog) {
        req.addLog("Huffman", "INFO", `Starting decompression of ${data.length} bytes`);
      }
      
      // Check if this is actually compressed data
      const sep = data.indexOf(0xff, 4);
      if (sep === -1 || data[sep + 1] !== 0xff) {
        logger.debug("Not a compressed buffer, returning as is");
        
        if (req?.addLog) {
          req.addLog("Huffman", "DEBUG", `No compression header found, returning original data`);
        }
        
        return data;
      }

      const originalLength = data.readUInt32BE(0);
      
      if (req?.addLog) {
        req.addLog("Huffman", "DEBUG", `Found compression header, original length: ${originalLength} bytes`);
      }
      
      const freqData = data.subarray(4, sep).toString();
      const freq = new Map<number, number>(JSON.parse(freqData));
      const encoded = data.subarray(sep + 2);
      
      if (req?.addLog) {
        req.addLog("Huffman", "DEBUG", `Parsed frequency table with ${freq.size} entries`);
        
        // Only log frequency details for smaller files
        if (originalLength <= 1024 * 1024 && freq.size <= 100) {
          req.addLog("Huffman", "DEBUG", formatFrequencies(freq));
        }
        
        req.addLog("Huffman", "DEBUG", `Encoded data size: ${encoded.length} bytes`);
      }

      // Handle single byte case
      if (freq.size === 1) {
        const [[byte, count]] = [...freq.entries()];
        
        if (req?.addLog) {
          req.addLog("Huffman", "DEBUG", `Single byte data detected, value: ${byte}, count: ${count}`);
        }
        
        const result = Buffer.alloc(count, byte);
        
        if (req?.addLog) {
          req.addLog("Huffman", "INFO", `Decompression complete: ${data.length} → ${result.length} bytes`);
        }
        
        return result;
      }

      // Rebuild tree and decode
      const root = this.buildTree(freq);
      
      if (req?.addLog) {
        req.addLog("Huffman", "DEBUG", `Rebuilt Huffman tree with ${freq.size} leaf nodes`);
      }
      
      let bits = [...encoded]
        .map((byte) => byte.toString(2).padStart(8, "0"))
        .join("");
      
      if (req?.addLog) {
        // For large files, log less detail
        if (bits.length > 8192) { // About 1KB
          req.addLog("Huffman", "DEBUG", `Decoding ${Math.ceil(bits.length/8)} bytes of compressed data`);
        } else {
          req.addLog("Huffman", "DEBUG", `Decoding ${bits.length} bits`);
        }
      }
      
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
      
      if (req?.addLog) {
        req.addLog("Huffman", "INFO", 
          `Decompressed successfully: ${data.length} → ${decompressed.length} bytes`);
      }
      
      return decompressed;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.debug("Decompression failed, returning original buffer");
      
      if (req?.addLog) {
        req.addLog("Huffman", "ERROR", `Decompression failed: ${errMsg}`);
        req.addLog("Huffman", "DEBUG", `Returning original buffer`);
      }
      
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
 * Public compression interface with detailed logging
 */
function compressBuffer(data: Buffer, req?: Request): Buffer {
  try {
    // Skip detailed logging for large files (over 5MB)
    if (req?.addLog && data.length > 5 * 1024 * 1024) {
      req.addLog("Huffman", "INFO", `Processing large file (${(data.length / (1024 * 1024)).toFixed(2)} MB), detailed logs disabled`);
      
      // For large files, just skip sending the request object altogether
      return huffman.compress(data);
    }
    
    return huffman.compress(data, req);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error("Compression failed:", errMsg);
    
    if (req?.addLog) {
      req.addLog("Huffman", "ERROR", `Compression error: ${errMsg}`);
    }
    
    return data;
  }
}

/**
 * Public decompression interface with detailed logging
 */
function decompressBuffer(data: Buffer, req?: Request): Buffer {
  try {
    // Skip detailed logging for large files (over 5MB)
    if (req?.addLog && data.length > 5 * 1024 * 1024) {
      req.addLog("Huffman", "INFO", `Processing large compressed file (${(data.length / (1024 * 1024)).toFixed(2)} MB), detailed logs disabled`);
      
      // For large files, skip sending the request object
      return huffman.decompress(data);
    }
    
    return huffman.decompress(data, req);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error("Decompression failed:", errMsg);
    
    if (req?.addLog) {
      req.addLog("Huffman", "ERROR", `Decompression error: ${errMsg}`);
    }
    
    return data;
  }
}

export { compressBuffer, decompressBuffer };
export default huffman;
