import { GraphicTemplate, GraphicElement, Project } from '../../types';
import { generateSynthesizedAudio } from '../audioSynth';

// Image Cache Map to prevent flickering and ensure asynchronous images render immediately
const imageCache = new Map<string, HTMLImageElement>();
const loadingListeners = new Map<string, Set<() => void>>();

function getCachedImage(url: string, onLoaded?: () => void): HTMLImageElement | null {
  if (!url) return null;

  if (imageCache.has(url)) {
    const cached = imageCache.get(url)!;
    if (cached.complete && cached.naturalWidth > 0) return cached;
  }

  if (onLoaded) {
    if (!loadingListeners.has(url)) {
      loadingListeners.set(url, new Set());
    }
    loadingListeners.get(url)!.add(onLoaded);
  }

  if (!imageCache.has(url)) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      const listeners = loadingListeners.get(url);
      if (listeners) {
        listeners.forEach((fn) => fn());
        loadingListeners.delete(url);
      }
    };
    img.onerror = (e) => {
      console.warn('Failed to load canvas image:', url, e);
      loadingListeners.delete(url);
    };
    imageCache.set(url, img);
  }

  const existing = imageCache.get(url);
  return existing && existing.complete && existing.naturalWidth > 0 ? existing : null;
}

/**
 * Draws a GraphicTemplate onto an HTML5 Canvas Context
 */
export function renderGraphicTemplateToCanvas(
  ctx: CanvasRenderingContext2D,
  template: GraphicTemplate,
  canvasWidth: number,
  canvasHeight: number,
  sourceVideoElement?: HTMLVideoElement | null,
  selectedElementId?: string | null,
  onImageLoaded?: () => void
): void {
  ctx.save();
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 1. Draw Background
  const bg = template.background;
  if (bg.type === 'color') {
    ctx.fillStyle = bg.value || '#0f172a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (bg.type === 'gradient') {
    const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    if (bg.value.includes('#7e22ce')) {
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(1, '#7e22ce');
    } else if (bg.value.includes('#06b6d4')) {
      grad.addColorStop(0, '#1d4ed8');
      grad.addColorStop(1, '#06b6d4');
    } else if (bg.value.includes('#ec4899')) {
      grad.addColorStop(0, '#9333ea');
      grad.addColorStop(1, '#ec4899');
    } else if (bg.value.includes('#f8fafc')) {
      grad.addColorStop(0, '#e0f2fe');
      grad.addColorStop(1, '#f8fafc');
    } else {
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#020617');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (bg.type === 'image' && bg.value) {
    // Solid fallback color
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const img = getCachedImage(bg.value, onImageLoaded);
    if (img) {
      ctx.save();
      if (bg.brightness !== undefined && bg.brightness !== 100) {
        ctx.filter = `brightness(${bg.brightness}%)`;
      }

      const zoom = bg.zoom ? bg.zoom / 100 : 1.0;
      const offsetX = bg.offsetX ? (bg.offsetX / 100) * canvasWidth : 0;
      const offsetY = bg.offsetY ? (bg.offsetY / 100) * canvasHeight : 0;

      // Aspect Cover calculation
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = canvasWidth / canvasHeight;

      let drawW = canvasWidth * zoom;
      let drawH = canvasHeight * zoom;

      if (imgRatio > canvasRatio) {
        drawW = canvasHeight * imgRatio * zoom;
      } else {
        drawH = (canvasWidth / imgRatio) * zoom;
      }

      const drawX = (canvasWidth - drawW) / 2 + offsetX;
      const drawY = (canvasHeight - drawH) / 2 + offsetY;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    }
  }

  // 1b. Background Overlay Tint (Darkens / colors background so text pops!)
  if (bg.overlayColor || bg.overlayOpacity !== undefined) {
    const overlayCol = bg.overlayColor || '#000000';
    const overlayOp = bg.overlayOpacity !== undefined ? bg.overlayOpacity : 0.4;
    if (overlayOp > 0) {
      ctx.save();
      ctx.fillStyle = overlayCol;
      ctx.globalAlpha = overlayOp;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    }
  }

  // 2. Sort Elements by zIndex or order
  const sortedElements = [...template.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  // 3. Render Elements
  for (const el of sortedElements) {
    const x = (el.x / 100) * canvasWidth;
    const elY = (el.y / 100) * canvasHeight;
    const w = (el.width / 100) * canvasWidth;
    const h = (el.height / 100) * canvasHeight;

    ctx.save();
    if (el.opacity !== undefined) {
      ctx.globalAlpha = el.opacity;
    }

    if (el.type === 'video_placeholder') {
      ctx.fillStyle = '#000000';
      if (el.borderRadius) {
        drawRoundedRect(ctx, x, elY, w, h, el.borderRadius);
        ctx.fill();
      } else {
        ctx.fillRect(x, elY, w, h);
      }

      if (sourceVideoElement && sourceVideoElement.readyState >= 2) {
        ctx.save();
        if (el.borderRadius) {
          ctx.beginPath();
          drawRoundedRectPath(ctx, x, elY, w, h, el.borderRadius);
          ctx.clip();
        }

        const vW = sourceVideoElement.videoWidth || 1280;
        const vH = sourceVideoElement.videoHeight || 720;
        const videoRatio = vW / vH;
        const regionRatio = w / h;

        let drawW = w;
        let drawH = h;
        let drawX = x;
        let drawY = elY;

        if (videoRatio > regionRatio) {
          drawH = w / videoRatio;
          drawY = elY + (h - drawH) / 2;
        } else {
          drawW = h * videoRatio;
          drawX = x + (w - drawW) / 2;
        }

        ctx.drawImage(sourceVideoElement, drawX, drawY, drawW, drawH);
        ctx.restore();
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎬 Source Video Placeholder Region', x + w / 2, elY + h / 2);
      }

      if (el.borderWidth && el.borderColor) {
        ctx.strokeStyle = el.borderColor;
        ctx.lineWidth = el.borderWidth;
        if (el.borderRadius) {
          drawRoundedRectPath(ctx, x, elY, w, h, el.borderRadius);
          ctx.stroke();
        } else {
          ctx.strokeRect(x, elY, w, h);
        }
      }
    } else if (el.type === 'text') {
      const padding = el.padding || 0;

      // Background Highlight Box
      if (el.backgroundColor) {
        ctx.fillStyle = el.backgroundColor;
        if (el.borderRadius) {
          drawRoundedRect(ctx, x, elY, w, h, el.borderRadius);
          ctx.fill();
        } else {
          ctx.fillRect(x, elY, w, h);
        }
      }

      // Border
      if (el.borderWidth && el.borderColor) {
        ctx.strokeStyle = el.borderColor;
        ctx.lineWidth = el.borderWidth;
        if (el.borderRadius) {
          drawRoundedRectPath(ctx, x, elY, w, h, el.borderRadius);
          ctx.stroke();
        } else {
          ctx.strokeRect(x, elY, w, h);
        }
      }

      // Text Shadow / Glow
      if (el.textShadow || el.boxShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
      }

      // Text Content
      ctx.fillStyle = el.color || '#ffffff';
      const weight = el.fontWeight || 'normal';
      const fontFam = el.fontFamily || 'Inter, sans-serif';
      const fontSizePx = Math.max(12, Math.round((el.fontSize || 24) * (canvasWidth / 1080)));
      ctx.font = `${weight} ${fontSizePx}px ${fontFam}`;
      ctx.textAlign = el.textAlign || 'left';
      ctx.textBaseline = 'middle';

      let textX = x + padding;
      if (el.textAlign === 'center') textX = x + w / 2;
      if (el.textAlign === 'right') textX = x + w - padding;

      const textY = elY + h / 2;

      // Optional Stroke / Outline
      if (el.strokeColor && el.strokeWidth) {
        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth = el.strokeWidth;
        ctx.strokeText(el.content || '', textX, textY, w - padding * 2);
      }

      ctx.fillText(el.content || '', textX, textY, w - padding * 2);
    } else if (el.type === 'shape') {
      ctx.fillStyle = el.backgroundColor || 'rgba(30, 41, 59, 0.8)';
      if (el.borderRadius) {
        drawRoundedRect(ctx, x, elY, w, h, el.borderRadius);
        ctx.fill();
      } else {
        ctx.fillRect(x, elY, w, h);
      }

      if (el.borderWidth && el.borderColor) {
        ctx.strokeStyle = el.borderColor;
        ctx.lineWidth = el.borderWidth;
        if (el.borderRadius) {
          drawRoundedRectPath(ctx, x, elY, w, h, el.borderRadius);
          ctx.stroke();
        } else {
          ctx.strokeRect(x, elY, w, h);
        }
      }
    } else if ((el.type === 'image' || el.type === 'logo') && el.content) {
      const img = getCachedImage(el.content, onImageLoaded);
      if (img) {
        ctx.save();
        if (el.borderRadius) {
          drawRoundedRectPath(ctx, x, elY, w, h, el.borderRadius);
          ctx.clip();
        }
        ctx.drawImage(img, x, elY, w, h);
        ctx.restore();
      } else {
        // Subtle loading box
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, elY, w, h);
      }

      if (el.borderWidth && el.borderColor) {
        ctx.strokeStyle = el.borderColor;
        ctx.lineWidth = el.borderWidth;
        if (el.borderRadius) {
          drawRoundedRectPath(ctx, x, elY, w, h, el.borderRadius);
          ctx.stroke();
        } else {
          ctx.strokeRect(x, elY, w, h);
        }
      }
    }

    // Selection Highlight Boundary Box on Canvas
    if (selectedElementId === el.id) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x - 2, elY - 2, w + 4, h + 4);

      // Corner handles
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x - 5, elY - 5, 10, 10);
      ctx.fillRect(x + w - 5, elY - 5, 10, 10);
      ctx.fillRect(x - 5, elY + h - 5, 10, 10);
      ctx.fillRect(x + w - 5, elY + h - 5, 10, 10);
      ctx.restore();
    }

    ctx.restore();
  }

  ctx.restore();
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  drawRoundedRectPath(ctx, x, y, w, h, r);
}

/**
 * Export Graphic Template to PNG Image Blob URL
 */
export async function exportGraphicTemplateToPng(
  template: GraphicTemplate,
  sourceVideoElement?: HTMLVideoElement | null
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = template.width || 1080;
  canvas.height = template.height || 1080;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas 2d context');

  renderGraphicTemplateToCanvas(ctx, template, canvas.width, canvas.height, sourceVideoElement);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(URL.createObjectURL(blob));
      } else {
        reject(new Error('Failed to generate PNG blob'));
      }
    }, 'image/png');
  });
}

/**
 * Export Reformatted Social Video with source video rendered inside template frame
 */
export async function exportReformattedSocialVideo(
  project: Project,
  template: GraphicTemplate,
  onProgress: (pct: number, status: string) => void
): Promise<string> {
  onProgress(5, 'Preparing video export canvas...');

  const canvas = document.createElement('canvas');
  canvas.width = template.width || 1080;
  canvas.height = template.height || 1920;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Load Source Video
  const videoElement = document.createElement('video');
  videoElement.src = project.sourceVideoBlobUrl || '';
  videoElement.crossOrigin = 'anonymous';
  videoElement.muted = true;
  videoElement.playsInline = true;

  await new Promise((resolve, reject) => {
    videoElement.onloadeddata = resolve;
    videoElement.onerror = reject;
    setTimeout(resolve, 3000); // safety fallback
  });

  const duration = project.duration || videoElement.duration || 10;
  const fps = 30;
  const totalFrames = Math.ceil(duration * fps);

  // Setup Canvas MediaStream Recorder
  const stream = canvas.captureStream(fps);

  // Synthesize Audio if present
  let audioTrack: MediaStreamTrack | null = null;
  if (project.audioTracks && project.audioTracks.length > 0) {
    try {
      const presetId = project.audioTracks[0].presetId || 'upbeat';
      const synthResult = await generateSynthesizedAudio(presetId, duration);
      if (synthResult && synthResult.url) {
        const audioCtx = new AudioContext();
        const response = await fetch(synthResult.url);
        const arrayBuf = await response.arrayBuffer();
        const decodedBuffer = await audioCtx.decodeAudioData(arrayBuf);

        const dest = audioCtx.createMediaStreamDestination();
        const source = audioCtx.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(dest);
        source.start();
        audioTrack = dest.stream.getAudioTracks()[0] || null;
        if (audioTrack) stream.addTrack(audioTrack);
      }
    } catch (e) {
      console.warn('Audio synthesis skipped for social export:', e);
    }
  }

  const mimeType = MediaRecorder.isTypeSupported('video/mp4')
    ? 'video/mp4'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8000000, // 8 Mbps high quality
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.start();

  // Render Frame Loop
  videoElement.currentTime = 0;
  await videoElement.play().catch(() => {});

  for (let frame = 0; frame < totalFrames; frame++) {
    const currentTime = frame / fps;
    videoElement.currentTime = currentTime;

    // Render graphic frame
    renderGraphicTemplateToCanvas(ctx, template, canvas.width, canvas.height, videoElement);

    const pct = Math.min(98, Math.round((frame / totalFrames) * 90) + 5);
    onProgress(pct, `Encoding social video frame ${frame}/${totalFrames}...`);

    await new Promise((r) => setTimeout(r, 1000 / fps));
  }

  recorder.stop();
  videoElement.pause();

  onProgress(99, 'Finalizing video container...');

  return new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      onProgress(100, 'Export complete!');
      resolve(url);
    };
  });
}
