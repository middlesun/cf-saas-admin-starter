/**
 * High-Fidelity Pure TypeScript GIF89a Encoder
 * Features:
 * - Median-Cut Color Quantization for crisp UI text, sharp icons, and accurate colors
 * - Perceptual color distance metric (Redmean approximation to CIELAB)
 * - Floyd-Steinberg error-diffusion dithering for smooth gradients without color banding
 * - Per-frame Local Color Tables (256 colors per frame) for optimal fidelity across video transitions
 * - Standard-compliant LZW compression with Netscape 2.0 infinite loop extension
 */

export interface GifOptions {
  fps: number;
  quality?: 'medium' | 'high' | 'ultra';
  dither?: boolean;
}

interface ColorBox {
  pixels: number[]; // indices into RGB array
  rMin: number;
  rMax: number;
  gMin: number;
  gMax: number;
  bMin: number;
  bMax: number;
  volume: number;
  count: number;
}

/**
 * Calculates perceptual distance between two RGB colors (Redmean formula)
 */
function colorDistanceSq(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const rMean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return (
    (((512 + rMean) * dr * dr) >> 8) +
    4 * dg * dg +
    (((767 - rMean) * db * db) >> 8)
  );
}

/**
 * Quantizes an ImageData into a 256-color palette using Median-Cut and perceptual color weighting
 */
function quantizeFrame(
  imageData: ImageData,
  maxColors: number = 256,
  dither: boolean = true
): { palette: number[][]; indexedPixels: Uint8Array } {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const pixelCount = width * height;

  // 1. Sample pixels for color palette generation (sample step scales for performance while preserving fidelity)
  const sampleStep = pixelCount > 500000 ? 2 : 1;
  const sampledIndices: number[] = [];

  for (let i = 0; i < pixelCount; i += sampleStep) {
    // Ignore fully transparent pixels if any (treat as opaque)
    sampledIndices.push(i);
  }

  // Helper to compute bounds of a box
  const computeBoxBounds = (indices: number[]): ColorBox => {
    let rMin = 255,
      rMax = 0,
      gMin = 255,
      gMax = 0,
      bMin = 255,
      bMax = 0;

    for (let k = 0; k < indices.length; k++) {
      const idx = indices[k] * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (r < rMin) rMin = r;
      if (r > rMax) rMax = r;
      if (g < gMin) gMin = g;
      if (g > gMax) gMax = g;
      if (b < bMin) bMin = b;
      if (b > bMax) bMax = b;
    }

    // Weight spread by human perceptual sensitivity: Green (0.59), Red (0.30), Blue (0.11)
    const rSpan = (rMax - rMin) * 0.3;
    const gSpan = (gMax - gMin) * 0.59;
    const bSpan = (bMax - bMin) * 0.11;
    const volume = (rSpan + gSpan + bSpan) * indices.length;

    return {
      pixels: indices,
      rMin,
      rMax,
      gMin,
      gMax,
      bMin,
      bMax,
      volume,
      count: indices.length,
    };
  };

  // Initialize with all sampled pixels in one box
  const boxes: ColorBox[] = [computeBoxBounds(sampledIndices)];

  // Iteratively split boxes along their largest dimension
  while (boxes.length < maxColors) {
    // Find box with the highest score to split
    let bestBoxIdx = -1;
    let maxVolume = -1;

    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].count > 1 && boxes[i].volume > maxVolume) {
        maxVolume = boxes[i].volume;
        bestBoxIdx = i;
      }
    }

    if (bestBoxIdx === -1 || maxVolume <= 0) break;

    const box = boxes[bestBoxIdx];
    const rSpan = (box.rMax - box.rMin) * 0.3;
    const gSpan = (box.gMax - box.gMin) * 0.59;
    const bSpan = (box.bMax - box.bMin) * 0.11;

    // Determine axis with widest span
    let channelOffset = 0; // Red
    if (gSpan >= rSpan && gSpan >= bSpan) {
      channelOffset = 1; // Green
    } else if (bSpan >= rSpan && bSpan >= gSpan) {
      channelOffset = 2; // Blue
    }

    // Sort pixels along selected channel
    box.pixels.sort((a, b) => data[a * 4 + channelOffset] - data[b * 4 + channelOffset]);

    // Split at median
    const mid = Math.floor(box.pixels.length / 2);
    const leftPixels = box.pixels.slice(0, mid);
    const rightPixels = box.pixels.slice(mid);

    if (leftPixels.length === 0 || rightPixels.length === 0) break;

    boxes.splice(bestBoxIdx, 1, computeBoxBounds(leftPixels), computeBoxBounds(rightPixels));
  }

  // 2. Build Palette from Box Averages
  const palette: number[][] = [];
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    let sumR = 0,
      sumG = 0,
      sumB = 0;
    const total = box.pixels.length;

    for (let k = 0; k < total; k++) {
      const idx = box.pixels[k] * 4;
      sumR += data[idx];
      sumG += data[idx + 1];
      sumB += data[idx + 2];
    }

    palette.push([
      Math.round(sumR / total),
      Math.round(sumG / total),
      Math.round(sumB / total),
    ]);
  }

  // Pad palette to 256 colors if fewer boxes were created
  while (palette.length < 256) {
    palette.push([0, 0, 0]);
  }

  // 3. Fast Color Lookup with 15-bit RGB Hash Cache
  const colorCache = new Int16Array(32768);
  colorCache.fill(-1);

  const findNearestColorIndex = (r: number, g: number, b: number): number => {
    const cr = Math.max(0, Math.min(255, r));
    const cg = Math.max(0, Math.min(255, g));
    const cb = Math.max(0, Math.min(255, b));

    const key = ((cr >> 3) << 10) | ((cg >> 3) << 5) | (cb >> 3);
    const cached = colorCache[key];
    if (cached !== -1) return cached;

    let bestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < boxes.length; i++) {
      const p = palette[i];
      const dist = colorDistanceSq(cr, cg, cb, p[0], p[1], p[2]);
      if (dist < minDistance) {
        minDistance = dist;
        bestIdx = i;
        if (dist === 0) break;
      }
    }

    colorCache[key] = bestIdx;
    return bestIdx;
  };

  // 4. Map Pixels to Palette with Optional Floyd-Steinberg Dithering
  const indexedPixels = new Uint8Array(pixelCount);

  if (dither) {
    // High-quality Floyd-Steinberg error diffusion buffers
    const rErrors = new Float32Array(width + 2);
    const gErrors = new Float32Array(width + 2);
    const bErrors = new Float32Array(width + 2);

    let nextRErrors = new Float32Array(width + 2);
    let nextGErrors = new Float32Array(width + 2);
    let nextBErrors = new Float32Array(width + 2);

    for (let y = 0; y < height; y++) {
      nextRErrors.fill(0);
      nextGErrors.fill(0);
      nextBErrors.fill(0);

      for (let x = 0; x < width; x++) {
        const pIdx = y * width + x;
        const dIdx = pIdx * 4;

        // Add diffused error from previous pixels
        const rWithErr = data[dIdx] + rErrors[x + 1];
        const gWithErr = data[dIdx + 1] + gErrors[x + 1];
        const bWithErr = data[dIdx + 2] + bErrors[x + 1];

        const palIdx = findNearestColorIndex(
          Math.round(rWithErr),
          Math.round(gWithErr),
          Math.round(bWithErr)
        );
        indexedPixels[pIdx] = palIdx;

        const palColor = palette[palIdx];
        const errR = (rWithErr - palColor[0]) * 0.75; // 75% error strength prevents noisy artifacting on flat UI
        const errG = (gWithErr - palColor[1]) * 0.75;
        const errB = (bWithErr - palColor[2]) * 0.75;

        // Diffuse to neighbors
        // (x + 1, y) -> 7/16
        rErrors[x + 2] += (errR * 7) / 16;
        gErrors[x + 2] += (errG * 7) / 16;
        bErrors[x + 2] += (errB * 7) / 16;

        // (x - 1, y + 1) -> 3/16
        nextRErrors[x] += (errR * 3) / 16;
        nextGErrors[x] += (errG * 3) / 16;
        nextBErrors[x] += (errB * 3) / 16;

        // (x, y + 1) -> 5/16
        nextRErrors[x + 1] += (errR * 5) / 16;
        nextGErrors[x + 1] += (errG * 5) / 16;
        nextBErrors[x + 1] += (errB * 5) / 16;

        // (x + 1, y + 1) -> 1/16
        nextRErrors[x + 2] += (errR * 1) / 16;
        nextGErrors[x + 2] += (errG * 1) / 16;
        nextBErrors[x + 2] += (errB * 1) / 16;
      }

      // Swap error lines
      rErrors.set(nextRErrors);
      gErrors.set(nextGErrors);
      bErrors.set(nextBErrors);
    }
  } else {
    // Direct Nearest Match (maximum sharpness for ultra-dense text)
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      indexedPixels[i] = findNearestColorIndex(data[idx], data[idx + 1], data[idx + 2]);
    }
  }

  return { palette, indexedPixels };
}

/**
 * Encodes an array of ImageData frames into an animated GIF Blob with crystal-clear color fidelity
 */
export function encodeCanvasFramesToGif(
  frames: ImageData[],
  width: number,
  height: number,
  fps: number,
  options?: { dither?: boolean; quality?: 'medium' | 'high' | 'ultra' }
): Blob {
  const bytes: number[] = [];

  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));
  };
  const writeUint16 = (val: number) => {
    bytes.push(val & 0xff);
    bytes.push((val >> 8) & 0xff);
  };

  // Delay time in 1/100ths of second (e.g. 20 fps -> 5 / 100 s)
  const delayTime = Math.max(2, Math.round(100 / fps));
  const useDither = options?.dither !== false;

  // 1. Header & Logical Screen Descriptor (GIF89a)
  writeString('GIF89a');
  writeUint16(width);
  writeUint16(height);
  // Packed field: Global Color Table flag (0x80) + Color Resolution (7 << 4) + GCT Size (7 -> 256 colors)
  bytes.push(0xf7);
  bytes.push(0x00); // Background color index
  bytes.push(0x00); // Pixel aspect ratio

  // Initial Global Color Table (First frame palette or neutral grayscale)
  const firstFrameQuant = quantizeFrame(frames[0], 256, useDither);
  for (let i = 0; i < 256; i++) {
    const c = firstFrameQuant.palette[i] || [0, 0, 0];
    bytes.push(c[0], c[1], c[2]);
  }

  // 2. Netscape 2.0 Loop Extension (Infinite loop)
  bytes.push(0x21, 0xff, 0x0b);
  writeString('NETSCAPE2.0');
  bytes.push(0x03, 0x01, 0x00, 0x00, 0x00);

  // 3. Process & Write Frames
  for (let f = 0; f < frames.length; f++) {
    const frameData = frames[f];
    const { palette, indexedPixels } =
      f === 0 ? firstFrameQuant : quantizeFrame(frameData, 256, useDither);

    // Graphic Control Extension (0x21, 0xF9, 0x04)
    // Disposal method: 0x01 (do not dispose, overwrite) or 0x02 (restore background)
    bytes.push(0x21, 0xf9, 0x04, 0x04);
    writeUint16(delayTime);
    bytes.push(0x00, 0x00); // No transparent index

    // Image Descriptor (0x2C)
    bytes.push(0x2c);
    writeUint16(0); // Left
    writeUint16(0); // Top
    writeUint16(width);
    writeUint16(height);
    // Packed Field: Local Color Table Flag (0x80) + Size (0x07 -> 256 colors) = 0x87
    bytes.push(0x87);

    // Local Color Table (256 * 3 bytes of pristine RGB colors for this specific frame)
    for (let i = 0; i < 256; i++) {
      const c = palette[i] || [0, 0, 0];
      bytes.push(c[0], c[1], c[2]);
    }

    // LZW Raster Data
    const lzwMinCodeSize = 8;
    bytes.push(lzwMinCodeSize);

    const clearCode = 1 << lzwMinCodeSize; // 256
    const eoiCode = clearCode + 1; // 257

    let curCodeSize = lzwMinCodeSize + 1; // 9
    let nextCode = eoiCode + 1; // 258

    // Hash table for fast LZW dictionary lookups (key: (prefix << 8) | suffix)
    const HASH_SIZE = 5003;
    const htab = new Int32Array(HASH_SIZE);
    const codetab = new Int32Array(HASH_SIZE);

    const clearHashTable = () => {
      htab.fill(-1);
      codetab.fill(-1);
    };
    clearHashTable();

    const bitBuffer: number[] = [];
    let curBits = 0;
    let curBitCount = 0;

    const emitBits = (code: number, bits: number) => {
      curBits |= code << curBitCount;
      curBitCount += bits;
      while (curBitCount >= 8) {
        bitBuffer.push(curBits & 0xff);
        curBits >>= 8;
        curBitCount -= 8;
      }
    };

    // Emit initial Clear Code
    emitBits(clearCode, curCodeSize);

    let prefix = indexedPixels[0];

    for (let p = 1; p < indexedPixels.length; p++) {
      const suffix = indexedPixels[p];
      const hashKey = (((prefix << 8) | suffix) >>> 0) % HASH_SIZE;

      let idx = hashKey;
      let found = false;

      while (htab[idx] !== -1) {
        if (htab[idx] === ((prefix << 8) | suffix)) {
          prefix = codetab[idx];
          found = true;
          break;
        }
        idx = (idx + 1) % HASH_SIZE;
      }

      if (!found) {
        emitBits(prefix, curCodeSize);

        if (nextCode < 4096) {
          htab[idx] = (prefix << 8) | suffix;
          codetab[idx] = nextCode++;
          if (nextCode > (1 << curCodeSize) && curCodeSize < 12) {
            curCodeSize++;
          }
        } else {
          // Dictionary full, reset
          emitBits(clearCode, curCodeSize);
          clearHashTable();
          curCodeSize = lzwMinCodeSize + 1;
          nextCode = eoiCode + 1;
        }
        prefix = suffix;
      }
    }

    emitBits(prefix, curCodeSize);
    emitBits(eoiCode, curCodeSize);

    if (curBitCount > 0) {
      bitBuffer.push(curBits & 0xff);
    }

    // Write sub-blocks (max 254 bytes per block)
    let offset = 0;
    while (offset < bitBuffer.length) {
      const blockSize = Math.min(254, bitBuffer.length - offset);
      bytes.push(blockSize);
      for (let b = 0; b < blockSize; b++) {
        bytes.push(bitBuffer[offset + b]);
      }
      offset += blockSize;
    }
    bytes.push(0x00); // Block Terminator
  }

  // 4. Trailer (0x3B)
  bytes.push(0x3b);

  return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
}
