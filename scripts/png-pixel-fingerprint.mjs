import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function parsePng(buffer) {
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('not a valid PNG');
  }

  let offset = 8;
  let header = null;
  const compressed = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) throw new Error('truncated PNG chunk');
    const data = buffer.subarray(dataStart, dataEnd);

    if (type === 'IHDR') {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === 'IDAT') {
      compressed.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset = dataEnd + 4;
  }

  if (!header || compressed.length === 0) throw new Error('PNG is missing IHDR or IDAT data');
  return { ...header, compressed: Buffer.concat(compressed) };
}

export function pngDimensions(buffer) {
  const { width, height } = parsePng(buffer);
  return { width, height };
}

function paeth(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
}

/**
 * Hashes decoded, normalized RGBA pixels after reducing each channel to four
 * significant bits. This keeps the entire rendered image under fingerprint
 * while ignoring imperceptible one-level compositor antialiasing noise.
 */
export function quantizedPixelDigest(buffer) {
  const png = parsePng(buffer);
  if (
    png.bitDepth !== 8 ||
    ![2, 6].includes(png.colorType) ||
    png.compression !== 0 ||
    png.filter !== 0 ||
    png.interlace !== 0
  ) {
    throw new Error('pixel fingerprint supports non-interlaced 8-bit RGB/RGBA PNGs only');
  }

  const channels = png.colorType === 2 ? 3 : 4;
  const rowBytes = png.width * channels;
  const inflated = inflateSync(png.compressed);
  if (inflated.length !== (rowBytes + 1) * png.height) {
    throw new Error('unexpected decoded PNG size');
  }

  const digest = createHash('sha256');
  let previous = Buffer.alloc(rowBytes);
  let inputOffset = 0;
  for (let y = 0; y < png.height; y += 1) {
    const filterType = inflated[inputOffset];
    inputOffset += 1;
    const row = Buffer.allocUnsafe(rowBytes);
    for (let x = 0; x < rowBytes; x += 1) {
      const encoded = inflated[inputOffset + x];
      const left = x >= channels ? row[x - channels] : 0;
      const up = previous[x];
      const upperLeft = x >= channels ? previous[x - channels] : 0;
      let value;
      if (filterType === 0) value = encoded;
      else if (filterType === 1) value = encoded + left;
      else if (filterType === 2) value = encoded + up;
      else if (filterType === 3) value = encoded + Math.floor((left + up) / 2);
      else if (filterType === 4) value = encoded + paeth(left, up, upperLeft);
      else throw new Error(`unsupported PNG filter ${filterType}`);
      row[x] = value & 0xff;
    }
    inputOffset += rowBytes;

    const normalized = Buffer.allocUnsafe(png.width * 4);
    for (let x = 0; x < png.width; x += 1) {
      const source = x * channels;
      const target = x * 4;
      normalized[target] = row[source] >> 4;
      normalized[target + 1] = row[source + 1] >> 4;
      normalized[target + 2] = row[source + 2] >> 4;
      normalized[target + 3] = channels === 4 ? row[source + 3] >> 4 : 0x0f;
    }
    digest.update(normalized);
    previous = row;
  }
  return digest.digest('hex');
}
