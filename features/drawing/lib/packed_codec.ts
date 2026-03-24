import {
  BASE64_CHARS,
  DRAWING_HEIGHT,
  DRAWING_WIDTH,
} from "../constants";

const BASE64_LOOKUP: number[] = (() => {
  const table = new Array<number>(256).fill(-1);
  for (let i = 0; i < BASE64_CHARS.length; i += 1) {
    table[BASE64_CHARS.charCodeAt(i)] = i;
  }
  return table;
})();

export const decodeBase64 = (encoded: string): Uint8Array | null => {
  const clean = encoded.replace(/\s/g, "");
  if (!clean.length || clean.length % 4 !== 0) {
    return null;
  }

  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  const outputLength = (clean.length / 4) * 3 - padding;
  const output = new Uint8Array(outputLength);

  let outIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = clean.charCodeAt(i);
    const c1 = clean.charCodeAt(i + 1);
    const c2 = clean.charCodeAt(i + 2);
    const c3 = clean.charCodeAt(i + 3);

    const v0 = BASE64_LOOKUP[c0];
    const v1 = BASE64_LOOKUP[c1];
    const v2 = c2 === 61 ? 0 : BASE64_LOOKUP[c2];
    const v3 = c3 === 61 ? 0 : BASE64_LOOKUP[c3];

    if (v0 < 0 || v1 < 0 || (c2 !== 61 && v2 < 0) || (c3 !== 61 && v3 < 0)) {
      return null;
    }

    const group = (v0 << 18) | (v1 << 12) | (v2 << 6) | v3;
    if (outIndex < outputLength) output[outIndex++] = (group >> 16) & 255;
    if (outIndex < outputLength) output[outIndex++] = (group >> 8) & 255;
    if (outIndex < outputLength) output[outIndex++] = group & 255;
  }

  return output;
};

export const encodeBase64 = (bytes: Uint8Array): string => {
  let output = "";
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;

    const triplet = (b0 << 16) | (b1 << 8) | b2;
    output += BASE64_CHARS[(triplet >> 18) & 63];
    output += BASE64_CHARS[(triplet >> 12) & 63];
    output += i + 1 < bytes.length ? BASE64_CHARS[(triplet >> 6) & 63] : "=";
    output += i + 2 < bytes.length ? BASE64_CHARS[triplet & 63] : "=";

    i += 3;
  }
  return output;
};

export const packedToBitmap = (packed?: string): Uint8Array => {
  const bitmap = new Uint8Array(DRAWING_WIDTH * DRAWING_HEIGHT);
  bitmap.fill(1);

  if (!packed) {
    return bitmap;
  }

  const decoded = decodeBase64(packed);
  if (!decoded) {
    return bitmap;
  }

  const maxPixels = DRAWING_WIDTH * DRAWING_HEIGHT;
  for (let i = 0; i < maxPixels; i += 1) {
    const byteIndex = Math.floor(i / 8);
    if (byteIndex >= decoded.length) {
      break;
    }
    const bitIndex = 7 - (i % 8);
    bitmap[i] = (decoded[byteIndex] >> bitIndex) & 1;
  }

  return bitmap;
};

export const bitmapToPacked = (bitmap: Uint8Array): string => {
  const packedLength = Math.ceil((DRAWING_WIDTH * DRAWING_HEIGHT) / 8);
  const packed = new Uint8Array(packedLength);

  for (let i = 0; i < DRAWING_WIDTH * DRAWING_HEIGHT; i += 1) {
    if (bitmap[i] === 1) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = 7 - (i % 8);
      packed[byteIndex] |= 1 << bitIndex;
    }
  }

  return encodeBase64(packed);
};
