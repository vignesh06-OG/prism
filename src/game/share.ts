/**
 * Offline puzzle sharing. A board is packed into a compact byte stream,
 * checksummed and rendered as a Crockford base32 code:
 *
 *   PRISM-XXXX-XXXX-XXXX
 *
 * Decoding is fully local — no server, no database, no network.
 */
import type { Board, Piece } from "./types";
import { key, type PieceKind } from "./types";

const KINDS: PieceKind[] = [
  "emitter",
  "target",
  "mirror",
  "splitter",
  "filter",
  "prism",
  "wall",
  // Appended only — existing indices must never move or old codes break.
  "glass",
  "crystal",
  "water",
  "fog",
];

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32
const VERSION = 1;
const MAX_DIM = 12;
const MAX_PIECES = 96;

const encodePiece = (p: Piece): number[] => [
  KINDS.indexOf(p.kind) | (p.fixed ? 0x40 : 0),
  p.rot & 0x0f,
  (p.color ?? 7) & 0x07,
];

function toBytes(board: Board): number[] {
  const cells = Object.entries(board.cells).slice(0, MAX_PIECES);
  const tray = board.tray.slice(0, MAX_PIECES);
  const bytes: number[] = [VERSION, board.width, board.height, cells.length];
  for (const [k, piece] of cells) {
    const [x, y] = k.split(",").map(Number);
    bytes.push(x!, y!, ...encodePiece(piece));
  }
  bytes.push(tray.length);
  for (const piece of tray) bytes.push(...encodePiece(piece));
  const sum = bytes.reduce((a, b) => (a + b) & 0xff, 0);
  bytes.push(sum);
  return bytes;
}

function base32(bytes: number[]): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function unbase32(code: string): number[] | null {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of code) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return out;
}

const group = (s: string) => s.match(/.{1,4}/g)?.join("-") ?? s;

export function encodeBoard(board: Board): string {
  return `PRISM-${group(base32(toBytes(board)))}`;
}

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${(counter++).toString(36)}`;

export function decodeBoard(code: string): Board | null {
  const clean = code.trim().toUpperCase().replace(/^PRISM-?/, "").replace(/[-\s]/g, "");
  if (!clean || clean.length > 4096) return null;
  const bytes = unbase32(clean);
  if (!bytes || bytes.length < 6) return null;

  const checksum = bytes.pop()!;
  const sum = bytes.reduce((a, b) => (a + b) & 0xff, 0);
  if (sum !== checksum) return null;

  let i = 0;
  const read = () => bytes[i++];
  if (read() !== VERSION) return null;
  const width = read()!;
  const height = read()!;
  if (!width || !height || width > MAX_DIM || height > MAX_DIM) return null;

  const readPiece = (idPrefix: string): Piece | null => {
    const kindByte = read();
    const rot = read();
    const color = read();
    if (kindByte === undefined || rot === undefined || color === undefined) return null;
    const kind = KINDS[kindByte & 0x3f];
    if (!kind) return null;
    const piece: Piece = { id: nextId(idPrefix), kind, rot: rot & 0x0f, color: color & 7 };
    if (kindByte & 0x40) piece.fixed = true;
    return piece;
  };

  const cellCount = read();
  if (cellCount === undefined || cellCount > MAX_PIECES) return null;
  const cells: Record<string, Piece> = {};
  for (let n = 0; n < cellCount; n++) {
    const x = read();
    const y = read();
    if (x === undefined || y === undefined || x >= width || y >= height) return null;
    const piece = readPiece("c");
    if (!piece) return null;
    cells[key(x, y)] = piece;
  }

  const trayCount = read();
  if (trayCount === undefined || trayCount > MAX_PIECES) return null;
  const tray: Piece[] = [];
  for (let n = 0; n < trayCount; n++) {
    const piece = readPiece("t");
    if (!piece) return null;
    tray.push(piece);
  }

  return { width, height, cells, tray };
}
