import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const targets = [
  { file: "public/apple-touch-icon.png", size: 180 },
  { file: "public/pwa-icon-192.png", size: 192 },
  { file: "public/pwa-icon-512.png", size: 512 },
];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function insideRoundedRect(px, py, x, y, width, height, radius) {
  const cx = Math.max(x + radius, Math.min(px, x + width - radius));
  const cy = Math.max(y + radius, Math.min(py, y + height - radius));
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function blendPixel(data, width, x, y, color, alpha = 1) {
  const index = (y * width + x) * 4;
  const inverse = 1 - alpha;
  data[index] = Math.round(color[0] * alpha + data[index] * inverse);
  data[index + 1] = Math.round(color[1] * alpha + data[index + 1] * inverse);
  data[index + 2] = Math.round(color[2] * alpha + data[index + 2] * inverse);
  data[index + 3] = 255;
}

function drawRoundedRect(data, size, rect, color) {
  const samples = 3;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = x + (sx + 0.5) / samples;
          const py = y + (sy + 0.5) / samples;
          if (insideRoundedRect(px, py, rect.x, rect.y, rect.width, rect.height, rect.radius)) {
            hits += 1;
          }
        }
      }
      if (hits) {
        blendPixel(data, size, x, y, color, hits / (samples * samples));
      }
    }
  }
}

function drawCircle(data, size, cx, cy, radius, color) {
  const radiusSquared = radius * radius;
  for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(size, Math.ceil(cy + radius)); y += 1) {
    for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(size, Math.ceil(cx + radius)); x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= radiusSquared) {
        blendPixel(data, size, x, y, color, 1);
      }
    }
  }
}

function encodePng(width, height, rgba) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0;
    Buffer.from(rgba.buffer, y * width * 4, width * 4).copy(scanlines, rowStart + 1);
  }

  return Buffer.concat([header, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(scanlines)), chunk("IEND", Buffer.alloc(0))]);
}

function createIcon(size) {
  const data = new Uint8ClampedArray(size * size * 4);
  const scale = size / 128;

  drawRoundedRect(data, size, { x: 0, y: 0, width: size, height: size, radius: 26 * scale }, [17, 17, 17]);
  drawCircle(data, size, 64 * scale, 64 * scale, 47 * scale, [33, 33, 28]);
  drawRoundedRect(data, size, { x: 26 * scale, y: 59 * scale, width: 76 * scale, height: 10 * scale, radius: 5 * scale }, [184, 255, 60]);
  drawRoundedRect(data, size, { x: 37 * scale, y: 42 * scale, width: 12 * scale, height: 44 * scale, radius: 6 * scale }, [184, 255, 60]);
  drawRoundedRect(data, size, { x: 79 * scale, y: 42 * scale, width: 12 * scale, height: 44 * scale, radius: 6 * scale }, [184, 255, 60]);
  drawRoundedRect(data, size, { x: 17 * scale, y: 52 * scale, width: 11 * scale, height: 28 * scale, radius: 5 * scale }, [255, 255, 255]);
  drawRoundedRect(data, size, { x: 100 * scale, y: 52 * scale, width: 11 * scale, height: 28 * scale, radius: 5 * scale }, [255, 255, 255]);
  drawRoundedRect(data, size, { x: 55 * scale, y: 27 * scale, width: 18 * scale, height: 74 * scale, radius: 9 * scale }, [184, 255, 60]);
  drawCircle(data, size, 64 * scale, 64 * scale, 11 * scale, [17, 17, 17]);
  drawRoundedRect(data, size, { x: 59 * scale, y: 41 * scale, width: 10 * scale, height: 46 * scale, radius: 5 * scale }, [17, 17, 17]);

  return encodePng(size, size, data);
}

targets.forEach(({ file, size }) => {
  writeFileSync(file, createIcon(size));
  console.log(`Generated ${file}`);
});
