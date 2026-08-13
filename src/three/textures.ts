/**
 * Procedural textures for the AURA data-centre twin.
 *
 * Every texture is generated locally on a 2D canvas: no network request, no
 * external HDRI or texture dependency, so the scene renders offline and never
 * blocks canvas mount. Textures are cached and reused across all instances.
 */

import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();

function makeCanvas(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function finish(key: string, canvas: HTMLCanvasElement, repeat: [number, number]): THREE.Texture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  texture.name = `aura/tex/${key}`;
  cache.set(key, texture);
  return texture;
}

/**
 * Alpha map for perforated rack doors and perforated floor tiles.
 * Black = hole, white = metal, giving a real see-through mesh look instead of
 * a flat grey panel.
 */
export function perforationAlpha(repeat = 10): THREE.Texture {
  const key = `perforation:${repeat}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 128;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  const pitch = 16;
  for (let y = pitch / 2; y < size; y += pitch) {
    for (let x = pitch / 2; x < size; x += pitch) {
      const offset = (Math.round(y / pitch) % 2) * (pitch / 2);
      ctx.beginPath();
      ctx.arc(x + offset, y, pitch * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return finish(key, canvas, [repeat, repeat]);
}

/** Server faceplate detail: vents, drive bays, bezel shading. */
export function faceplateMap(): THREE.Texture {
  const key = 'faceplate';
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 256;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#23262b';
  ctx.fillRect(0, 0, size, size);

  // Ventilation grille across the centre band
  ctx.fillStyle = '#15171a';
  for (let x = 24; x < size - 40; x += 6) {
    ctx.fillRect(x, 40, 3, size - 80);
  }
  // Left ear / handle block
  ctx.fillStyle = '#31353b';
  ctx.fillRect(4, 16, 16, size - 32);
  ctx.fillRect(size - 20, 16, 16, size - 32);
  // Drive bay separators
  ctx.strokeStyle = '#3b4046';
  ctx.lineWidth = 2;
  for (let y = 40; y < size - 40; y += 48) {
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(size - 24, y);
    ctx.stroke();
  }
  return finish(key, canvas, [1, 1]);
}

/** Raised-floor tile map: 600 mm tiles with visible seams and stringer bolts. */
export function floorTileMap(repeat = 40): THREE.Texture {
  const key = `floorTile:${repeat}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 256;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#4c5157';
  ctx.fillRect(0, 0, size, size);
  // subtle speckle for a matt vinyl finish
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  // tile seam
  ctx.strokeStyle = '#33373c';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);
  // corner bolts
  ctx.fillStyle = '#6c7278';
  for (const [x, y] of [[10, 10], [size - 10, 10], [10, size - 10], [size - 10, size - 10]]) {
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(key, canvas, [repeat, repeat]);
}

/** Dispose every cached texture (facility switch / unmount teardown). */
export function disposeTextureCache() {
  cache.forEach((t) => t.dispose());
  cache.clear();
}
