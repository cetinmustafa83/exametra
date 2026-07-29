// CompetenceTrack — QR Code Generation Utility
// Generates QR codes as base64 PNG images using canvas

export type QRCodeType = 'student' | 'class' | 'attendance' | 'event';

export interface QRCodeData {
  type: QRCodeType;
  id: string;
  schoolId?: string;
  label?: string;
  // For attendance QR: session-specific data
  sessionId?: string;
  timestamp?: number;
}

/**
 * Build a URL string from QR code data that can be encoded into a QR code
 */
export function buildQRCodeUrl(data: QRCodeData): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://competencetrack.app';
  switch (data.type) {
    case 'student':
      return `${base}/?student=${data.id}`;
    case 'class':
      return `${base}/?class=${data.id}`;
    case 'attendance':
      return `${base}/?attendance=${data.sessionId || data.id}&t=${data.timestamp || Date.now()}`;
    case 'event':
      return `${base}/?event=${data.id}`;
    default:
      return `${base}/?id=${data.id}`;
  }
}

// Simple QR code encoder using Canvas API
// This implements a minimal QR code generator

// QR Code error correction levels
const ERROR_CORRECTION_LEVEL = {
  L: 0, // 7% recovery
  M: 1, // 15% recovery
  Q: 2, // 25% recovery
  H: 3, // 30% recovery
};

// QR Code version sizes (modules per side)
const VERSION_SIZES = [
  0, 21, 25, 29, 33, 37, 41, 45, 49, 53, 57, // 1-10
  61, 65, 69, 73, 77, 81, 85, 89, 93, 97, // 11-20
  101, 105, 109, 113, 117, 121, 125, 129, 133, 137, // 21-30
  141, 145, 149, 153, 157, 161, 165, 169, 173, 177, // 31-40
];

// Simplified QR code generation using canvas
// We use a well-known approach: encode data to a binary matrix, then render to canvas

function getAlphanumericCode(char: string): number {
  const codes = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
  const idx = codes.indexOf(char);
  return idx >= 0 ? idx : -1;
}

function isAlphanumeric(text: string): boolean {
  for (const c of text) {
    if (getAlphanumericCode(c) < 0) return false;
  }
  return true;
}

interface QRMatrix {
  size: number;
  modules: boolean[][]; // true = dark
  reserved: boolean[][];
}

function createMatrix(version: number): QRMatrix {
  const size = VERSION_SIZES[version];
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  return { size, modules, reserved };
}

function setFunctionPatterns(matrix: QRMatrix): void {
  const { size, modules, reserved } = matrix;

  // Finders: 7x7 at three corners
  const finderPositions = [
    [0, 0], [0, size - 7], [size - 7, 0],
  ];

  for (const [row, col] of finderPositions) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const isDark = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                       (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                       (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        modules[rr][cc] = isDark;
        reserved[rr][cc] = true;
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!reserved[6][i]) {
      modules[6][i] = i % 2 === 0;
      reserved[6][i] = true;
    }
    if (!reserved[i][6]) {
      modules[i][6] = i % 2 === 0;
      reserved[i][6] = true;
    }
  }

  // Alignment patterns (for version >= 2)
  if (size >= 25) {
    const alignPositions = getAlignmentPositions(size);
    for (const row of alignPositions) {
      for (const col of alignPositions) {
        if (reserved[row]?.[col]) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const rr = row + r;
            const cc = col + c;
            if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
            if (reserved[rr][cc]) continue;
            const isDark = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
            modules[rr][cc] = isDark;
            reserved[rr][cc] = true;
          }
        }
      }
    }
  }

  // Reserve format info areas
  for (let i = 0; i < 8; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }
  reserved[8][8] = true;
  reserved[size - 8][8] = true;
  reserved[8][size - 8] = true;
}

function getAlignmentPositions(size: number): number[] {
  // Simplified: common alignment positions for various versions
  const positions: number[] = [6];
  if (size === 25) positions.push(18);
  else if (size === 29) positions.push(22);
  else if (size === 33) positions.push(26);
  else if (size === 37) positions.push(30);
  else if (size === 41) positions.push(34);
  else if (size === 45) positions.push(38);
  else if (size === 49) positions.push(42);
  else if (size === 53) positions.push(46);
  else positions.push(size - 7);
  return positions;
}

function encodeData(text: string, version: number): number[] {
  // Simple byte encoding
  const data: number[] = [];

  // Mode indicator: 0100 (byte mode)
  data.push(0, 1, 0, 0);

  // Character count (8 bits for byte mode, version 1-9)
  const charCountBits = version <= 9 ? 8 : 16;
  const countBin = text.length.toString(2).padStart(charCountBits, '0');
  for (const bit of countBin) {
    data.push(parseInt(bit));
  }

  // Data
  for (const char of text) {
    const byte = char.charCodeAt(0);
    const byteBin = byte.toString(2).padStart(8, '0');
    for (const bit of byteBin) {
      data.push(parseInt(bit));
    }
  }

  // Terminator
  const maxDataBits = getDataCapacity(version);
  const terminatorLen = Math.min(4, maxDataBits - data.length);
  for (let i = 0; i < terminatorLen; i++) {
    data.push(0);
  }

  // Pad to byte boundary
  while (data.length % 8 !== 0) {
    data.push(0);
  }

  // Pad bytes
  const padBytes = [0xEC, 0x11];
  let padIdx = 0;
  while (data.length < maxDataBits) {
    const byte = padBytes[padIdx % 2];
    const byteBin = byte.toString(2).padStart(8, '0');
    for (const bit of byteBin) {
      data.push(parseInt(bit));
    }
    padIdx++;
  }

  return data;
}

function getDataCapacity(version: number): number {
  // Simplified: total data bits for byte mode with L error correction
  const capacities = [0, 152, 272, 400, 576, 752, 976, 1200, 1456, 1728, 2032];
  return capacities[Math.min(version, 10)] || 2032;
}

function placeData(matrix: QRMatrix, data: number[]): void {
  const { size, modules, reserved } = matrix;
  let bitIdx = 0;
  let upward = true;

  for (let col = size - 1; col >= 0; col -= 2) {
    if (col === 6) col = 5; // Skip timing column

    for (let row = 0; row < size; row++) {
      const actualRow = upward ? (size - 1 - row) : row;

      for (let c = 0; c < 2; c++) {
        const actualCol = col - c;
        if (actualCol < 0 || actualCol >= size) continue;
        if (reserved[actualRow][actualCol]) continue;

        if (bitIdx < data.length) {
          modules[actualRow][actualCol] = data[bitIdx] === 1;
          bitIdx++;
        }
        // If no more data, leave as false (white)
      }
    }
    upward = !upward;
  }
}

function applyMask(matrix: QRMatrix): void {
  const { size, modules, reserved } = matrix;

  // Apply mask pattern 0: (row + col) % 2 === 0
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (reserved[row][col]) continue;
      if ((row + col) % 2 === 0) {
        modules[row][col] = !modules[row][col];
      }
    }
  }
}

function addFormatInfo(matrix: QRMatrix): void {
  const { size, modules, reserved } = matrix;

  // Format info for L error correction + mask 0: 0x77C4
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];

  // Horizontal format info
  for (let i = 0; i < 8; i++) {
    if (!reserved[8][i]) modules[8][i] = formatBits[i] === 1;
    if (!reserved[8][size - 1 - i]) modules[8][size - 1 - i] = formatBits[7 + i] === 1;
  }

  // Vertical format info
  for (let i = 0; i < 7; i++) {
    if (!reserved[i][8]) modules[i][8] = formatBits[i] === 1;
    if (!reserved[size - 7 + i][8]) modules[size - 7 + i][8] = formatBits[i] === 1;
  }
}

function selectVersion(text: string): number {
  const byteLen = new TextEncoder().encode(text).length;
  // Capacities for byte mode, L error correction
  const capacities = [0, 17, 32, 53, 78, 106, 134, 154, 192, 230, 271];
  for (let v = 1; v <= 10; v++) {
    if (byteLen <= capacities[v]) return v;
  }
  return 10; // Max version we support
}

/**
 * Generate a QR code matrix from text
 */
function generateQRMatrix(text: string): QRMatrix {
  const version = selectVersion(text);
  const matrix = createMatrix(version);

  setFunctionPatterns(matrix);

  const data = encodeData(text, version);
  placeData(matrix, data);
  applyMask(matrix);
  addFormatInfo(matrix);

  return matrix;
}

/**
 * Render QR matrix to canvas and return base64 PNG
 */
function renderToBase64(matrix: QRMatrix, size: number = 256, fgColor: string = '#000000', bgColor: string = '#ffffff'): string {
  // Only works in browser
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const quietZone = 4; // 4 module quiet zone
  const totalModules = matrix.size + quietZone * 2;
  const moduleSize = size / totalModules;

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  // Modules
  ctx.fillStyle = fgColor;
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (matrix.modules[row][col]) {
        const x = (col + quietZone) * moduleSize;
        const y = (row + quietZone) * moduleSize;
        ctx.fillRect(x, y, moduleSize + 0.5, moduleSize + 0.5); // +0.5 to avoid gaps
      }
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Generate a QR code as a base64 PNG data URL
 */
export async function generateQRCode(
  data: QRCodeData,
  options?: { size?: number; fgColor?: string; bgColor?: string }
): Promise<string> {
  const url = buildQRCodeUrl(data);
  const matrix = generateQRMatrix(url);
  const size = options?.size ?? 256;
  const fgColor = options?.fgColor ?? '#000000';
  const bgColor = options?.bgColor ?? '#ffffff';

  return renderToBase64(matrix, size, fgColor, bgColor);
}

/**
 * Generate a QR code as a base64 PNG data URL (sync version for browser)
 */
export function generateQRCodeSync(
  data: QRCodeData,
  options?: { size?: number; fgColor?: string; bgColor?: string }
): string {
  const url = buildQRCodeUrl(data);
  const matrix = generateQRMatrix(url);
  const size = options?.size ?? 256;
  const fgColor = options?.fgColor ?? '#000000';
  const bgColor = options?.bgColor ?? '#ffffff';

  return renderToBase64(matrix, size, fgColor, bgColor);
}

/**
 * Download a QR code image
 */
export function downloadQRCode(dataUrl: string, filename: string = 'qrcode.png'): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
