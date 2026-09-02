import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  pngDimensions,
  quantizedPixelDigest,
} from '../../scripts/png-pixel-fingerprint.mjs';

function chunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  // The decoder intentionally does not use CRC as part of rendered pixels.
  return Buffer.concat([length, typeBuffer, data, Buffer.alloc(4)]);
}

function rgbPng(red: number, green: number, blue: number) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 2;
  const scanline = Buffer.from([0, red, green, blue]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(scanline)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('quantized visual pixel fingerprints', () => {
  it('keeps full-image verification stable across one-level compositor noise', () => {
    const approved = rgbPng(211, 216, 223);
    const current = rgbPng(210, 215, 222);

    expect(createHash('sha256').update(approved).digest('hex')).not.toBe(
      createHash('sha256').update(current).digest('hex'),
    );
    expect(quantizedPixelDigest(approved)).toBe(quantizedPixelDigest(current));
    expect(pngDimensions(current)).toEqual({ width: 1, height: 1 });
  });

  it('still rejects a meaningful channel change', () => {
    expect(quantizedPixelDigest(rgbPng(211, 216, 223))).not.toBe(
      quantizedPixelDigest(rgbPng(191, 216, 223)),
    );
  });
});
