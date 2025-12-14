export function validate8CharHex(hexString: string) {
  // Remove any whitespace and convert to uppercase
  const cleanHex = hexString.replace(/\s/g, '').toUpperCase();
  
  // Validate hex string
  if (!/^[0-9A-F]{8}$/.test(cleanHex)) {
    throw new Error('Invalid hex string: must be exactly 8 hexadecimal characters');
  }

  return cleanHex;
}

/**
 * Converts an 8-character hex string to a 32-bit float
 * Uses big-endian byte order (GameCube standard)
 */
export function hexToFloat(hexString: string): number {
  const cleanHex = validate8CharHex(hexString);
  
  // Convert hex string to bytes and create DataView
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  
  // Parse each byte pair and set in buffer
  for (let i = 0; i < 4; i++) {
    const byte = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
    view.setUint8(i, byte);
  }
  
  // Return as 32-bit float (big-endian)
  return view.getFloat32(0, false);
}

/**
 * Converts an 8-character hex string to a 32-bit signed integer
 * Uses big-endian byte order (GameCube standard)
 */
export function hexToInt(hexString: string): number {
  const cleanHex = validate8CharHex(hexString);
  
  // Convert hex string to bytes and create DataView
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  
  // Parse each byte pair and set in buffer
  for (let i = 0; i < 4; i++) {
    const byte = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
    view.setUint8(i, byte);
  }
  
  // Return as 32-bit signed integer (big-endian)
  return view.getInt32(0, false);
}

/**
 * Converts a 2/4/6/8-character hex string to a 32-bit unsigned integer
 * Uses big-endian byte order (GameCube standard)
 * Shorter hex strings are zero-padded on the left (e.g., "0A" -> 10)
 */
export function hexToUint(hexString: string): number {
  // Remove any whitespace and convert to uppercase
  const cleanHex = hexString.replace(/\s/g, '').toUpperCase();
  
  // Validate hex string (2, 4, 6, or 8 characters)
  if (!/^[0-9A-F]{2}$|^[0-9A-F]{4}$|^[0-9A-F]{6}$|^[0-9A-F]{8}$/.test(cleanHex)) {
    throw new Error('Invalid hex string: must be 2, 4, 6, or 8 hexadecimal characters');
  }
  
  // Pad to 8 characters (zero-pad on the left)
  const paddedHex = cleanHex.padStart(8, '0');
  
  // Convert hex string to bytes and create DataView
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  
  // Parse each byte pair and set in buffer
  for (let i = 0; i < 4; i++) {
    const byte = parseInt(paddedHex.substring(i * 2, i * 2 + 2), 16);
    view.setUint8(i, byte);
  }
  
  // Return as 32-bit unsigned integer (big-endian)
  return view.getUint32(0, false);
}

/**
 * Converts a hex string to ASCII characters
 * Works with any even-length hex string (each pair represents one byte/character)
 */
export function hexToAscii(hexString: string): string {
  // Remove any whitespace and convert to uppercase
  const cleanHex = hexString.replace(/\s/g, '').toUpperCase();
  
  // Validate hex string
  if (!/^[0-9A-F]*$/.test(cleanHex)) {
    throw new Error('Invalid hex string: contains non-hexadecimal characters');
  }
  
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string: must have even number of characters');
  }
  
  let result = '';
  
  // Process each pair of hex characters as one byte
  for (let i = 0; i < cleanHex.length; i += 2) {
    const hexPair = cleanHex.substring(i, i + 2);
    const charCode = parseInt(hexPair, 16);
    
    // Convert to character (handle non-printable characters)
    if (charCode >= 32 && charCode <= 126) {
      // Printable ASCII character
      result += String.fromCharCode(charCode);
    } else if (charCode === 0) {
      // Null terminator - often end of string in games
      break;
    } else {
      // Non-printable character - represent as hex code
      result += `\\x${hexPair}`;
    }
  }
  
  return result;
}
