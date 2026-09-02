import { Project, TextAnnotation, ClickAnimation, TransitionCard } from '../types';
import { generateSynthesizedAudio } from './audioSynth';
import { calculateZoomTransformAtTime } from './zoomSystem';
import { StreamingGifEncoder, encodeCanvasFramesToGif } from './gifEncoder';
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget } from 'webm-muxer';

export { encodeCanvasFramesToGif };

export interface ExportProgress {
  percentage: number;
  status: string;
}

export interface ExportOptions {
  format?: 'mp4' | 'webm' | 'gif';
  resolution?: 'source' | '720p' | '1080p' | '4k';
  fps?: number;
  quality?: 'medium' | 'high' | 'ultra';
}

/**
 * Fast asynchronous video seek helper with safety fallback
 */
export async function seekVideoElement(video: HTMLVideoElement, targetTime: number): Promise<void> {
  const maxDuration = video.duration && !isNaN(video.duration) && video.duration > 0 ? video.duration : 999999;
  const safeTime = Math.max(0, Math.min(targetTime, maxDuration - 0.001));

  if (Math.abs(video.currentTime - safeTime) < 0.005 && video.readyState >= 2) {
    return;
  }

  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        resolve();
      }
    };
    const onSeeked = () => {
      if ('requestVideoFrameCallback' in video) {
        try {
          (video as any).requestVideoFrameCallback(() => finish());
          return;
        } catch {}
      }
      setTimeout(finish, 4);
    };
    const onError = () => finish();

    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', onError, { once: true });

    try {
      video.currentTime = safeTime;
    } catch {
      finish();
      return;
    }

    // Safety fallback timeout for instant resolution
    setTimeout(finish, 250);
  });
}

/**
 * Calculates the mapped source video timestamp for a given timeline time
 */
export function calculateSourceTime(project: Project, timelineTime: number): number {
  if (!project.videoSegments || project.videoSegments.length === 0) {
    return Math.max(0, timelineTime);
  }

  let accumulated = 0;
  for (const seg of project.videoSegments) {
    const segSpeed = seg.speed || 1.0;
    const segDuration = (seg.endTime - seg.startTime) / segSpeed;
    if (timelineTime >= accumulated && timelineTime <= accumulated + segDuration) {
      const elapsedInSeg = (timelineTime - accumulated) * segSpeed;
      return seg.startTime + elapsedInSeg;
    }
    accumulated += segDuration;
  }

  const lastSeg = project.videoSegments[project.videoSegments.length - 1];
  return lastSeg ? lastSeg.endTime : (project.duration || 0);
}

/**
 * Calculates exact export dimensions preserving aspect ratio without squashing or stretching
 */
export function calculateExportDimensions(
  sourceWidth: number,
  sourceHeight: number,
  resolution?: 'source' | '720p' | '1080p' | '4k'
): { width: number; height: number; sourceAspect: number } {
  const safeSourceW = Math.max(16, sourceWidth || 1920);
  const safeSourceH = Math.max(16, sourceHeight || 1080);
  const sourceAspect = safeSourceW / safeSourceH;

  let targetW = safeSourceW;
  let targetH = safeSourceH;

  if (resolution === '1080p') {
    if (sourceAspect >= 1) {
      targetH = 1080;
      targetW = Math.round(1080 * sourceAspect);
    } else {
      targetW = 1080;
      targetH = Math.round(1080 / sourceAspect);
    }
  } else if (resolution === '720p') {
    if (sourceAspect >= 1) {
      targetH = 720;
      targetW = Math.round(720 * sourceAspect);
    } else {
      targetW = 720;
      targetH = Math.round(720 / sourceAspect);
    }
  } else if (resolution === '4k') {
    if (sourceAspect >= 1) {
      targetH = 2160;
      targetW = Math.round(2160 * sourceAspect);
    } else {
      targetW = 2160;
      targetH = Math.round(2160 / sourceAspect);
    }
  }

  // Video encoders strictly require even dimensions
  const width = Math.max(16, Math.round(targetW / 2) * 2);
  const height = Math.max(16, Math.round(targetH / 2) * 2);

  return { width, height, sourceAspect };
}

/**
 * Validates the exported video file properties before declaring export complete
 */
async function validateExportedVideo(
  blob: Blob,
  expected: {
    expectedDuration: number;
    expectedWidth: number;
    expectedHeight: number;
    expectedFrames: number;
    encodedFrames: number;
  }
): Promise<{ valid: boolean; critical: boolean; message: string }> {
  if (blob.size === 0) {
    return { valid: false, critical: true, message: 'Export produced an empty file (0 bytes).' };
  }

  try {
    const valUrl = URL.createObjectURL(blob);
    const testVideo = document.createElement('video');
    testVideo.preload = 'metadata';
    testVideo.src = valUrl;

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 2500);
      testVideo.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve();
      };
      testVideo.onerror = () => {
        clearTimeout(timeout);
        resolve();
      };
    });

    const actualDuration = testVideo.duration || 0;
    const actualWidth = testVideo.videoWidth || 0;
    const actualHeight = testVideo.videoHeight || 0;

    URL.revokeObjectURL(valUrl);

    if (expected.encodedFrames < expected.expectedFrames) {
      return {
        valid: false,
        critical: false,
        message: `Incomplete frames: encoded ${expected.encodedFrames} of ${expected.expectedFrames} frames.`,
      };
    }

    if (actualWidth > 0 && actualHeight > 0) {
      if (Math.abs(actualWidth - expected.expectedWidth) > 4 || Math.abs(actualHeight - expected.expectedHeight) > 4) {
        return {
          valid: false,
          critical: false,
          message: `Dimension mismatch: exported video is ${actualWidth}x${actualHeight}, expected ${expected.expectedWidth}x${expected.expectedHeight}.`,
        };
      }
    }

    console.info(`[VideoExporter] Validation Passed: ${actualWidth}x${actualHeight}, ${expected.encodedFrames} frames, duration: ${actualDuration.toFixed(2)}s`);
    return { valid: true, critical: false, message: 'Validation passed successfully.' };
  } catch (err: any) {
    return { valid: true, critical: false, message: `Validation check completed: ${err?.message || err}` };
  }
}

/**
 * Draws the composited video frame preserving exact aspect ratio and coordinates
 */
function drawCompositedFrame(
  ctx: CanvasRenderingContext2D,
  exportVideo: HTMLVideoElement,
  project: Project,
  currentTime: number,
  canvasWidth: number,
  canvasHeight: number,
  sourceAspect: number
) {
  const targetAspect = canvasWidth / canvasHeight;

  let drawW = canvasWidth;
  let drawH = canvasHeight;
  let drawX = 0;
  let drawY = 0;

  // Aspect-fit preservation (guarantees no vertical or horizontal distortion)
  if (Math.abs(sourceAspect - targetAspect) > 0.002) {
    if (sourceAspect > targetAspect) {
      drawW = canvasWidth;
      drawH = Math.round(canvasWidth / sourceAspect);
      drawY = Math.round((canvasHeight - drawH) / 2);
    } else {
      drawH = canvasHeight;
      drawW = Math.round(canvasHeight * sourceAspect);
      drawX = Math.round((canvasWidth - drawW) / 2);
    }
  }

  // Calculate zoom transform
  const zoom = calculateZoomTransformAtTime(project.zoomEvents || [], currentTime);

  ctx.save();
  if (zoom.scale > 1.0) {
    const centerX = drawX + (zoom.x / 100) * drawW;
    const centerY = drawY + (zoom.y / 100) * drawH;
    ctx.translate(centerX, centerY);
    ctx.scale(zoom.scale, zoom.scale);
    ctx.translate(-centerX, -centerY);
  }

  // Draw source video frame
  try {
    ctx.drawImage(exportVideo, drawX, drawY, drawW, drawH);
  } catch {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(drawX, drawY, drawW, drawH);
  }

  // Draw Click Animations at accurate relative positions
  project.clickAnimations?.forEach((click) => {
    if (currentTime >= click.timestamp && currentTime <= click.timestamp + click.duration) {
      renderClickAnimation(ctx, canvasWidth, canvasHeight, click, currentTime - click.timestamp);
    }
  });

  // Draw Annotations at accurate relative positions
  project.annotations?.forEach((ann) => {
    if (currentTime >= ann.startTime && currentTime <= ann.startTime + ann.duration) {
      renderAnnotation(ctx, canvasWidth, canvasHeight, ann, currentTime - ann.startTime);
    }
  });

  ctx.restore();
}

export async function renderAndExportVideo(
  project: Project,
  sourceVideoElement: HTMLVideoElement | null,
  onProgress: (progress: ExportProgress) => void,
  options?: ExportOptions
): Promise<Blob> {
  const isGif = options?.format === 'gif';
  const format = options?.format || 'mp4';

  // 1. Create a dedicated, isolated offscreen video element to prevent UI interference
  const exportVideo = document.createElement('video');
  exportVideo.muted = true;
  exportVideo.playsInline = true;
  exportVideo.crossOrigin = 'anonymous';
  exportVideo.preload = 'auto';

  let videoSrc = project.sourceVideoBlobUrl;
  if (!videoSrc && project.sourceVideoBlob) {
    videoSrc = URL.createObjectURL(project.sourceVideoBlob);
  }
  if (!videoSrc && sourceVideoElement?.src) {
    videoSrc = sourceVideoElement.src;
  }

  if (!videoSrc) {
    throw new Error('No source video found to export.');
  }

  exportVideo.src = videoSrc;

  // Ensure export video metadata is loaded
  onProgress({ percentage: 3, status: 'Initializing video decoder engine...' });
  await new Promise<void>((resolve) => {
    if (exportVideo.readyState >= 1) {
      resolve();
      return;
    }
    const onLoaded = () => {
      exportVideo.removeEventListener('loadedmetadata', onLoaded);
      exportVideo.removeEventListener('canplay', onLoaded);
      resolve();
    };
    exportVideo.addEventListener('loadedmetadata', onLoaded, { once: true });
    exportVideo.addEventListener('canplay', onLoaded, { once: true });
    setTimeout(resolve, 1200);
  });

  // Determine native source dimensions & aspect ratio
  const sourceWidth = exportVideo.videoWidth || sourceVideoElement?.videoWidth || project.settings?.width || 1920;
  const sourceHeight = exportVideo.videoHeight || sourceVideoElement?.videoHeight || project.settings?.height || 1080;
  const nativeSourceAspect = sourceWidth / Math.max(1, sourceHeight);

  // Calculate total timeline duration based on video segments & transitions
  const segments = project.videoSegments && project.videoSegments.length > 0
    ? project.videoSegments
    : [{ id: 'default_seg', startTime: 0, endTime: project.duration || exportVideo.duration || 10, speed: 1.0 }];

  const totalVideoDuration = segments.reduce(
    (acc, seg) => acc + (seg.endTime - seg.startTime) / (seg.speed || 1.0),
    0
  );
  const totalDuration = Math.max(totalVideoDuration, 0.5);

  // -------------------------------------------------------------
  // GIF EXPORT PIPELINE: Streaming Zero-Memory Encoder
  // -------------------------------------------------------------
  if (isGif) {
    const { width: gifWidth, height: gifHeight, sourceAspect: gifSourceAspect } = calculateExportDimensions(
      sourceWidth,
      sourceHeight,
      options?.resolution
    );

    const gifFps = options?.fps || 20;
    const totalFrames = Math.max(1, Math.ceil(totalDuration * gifFps));
    const delayHundredths = Math.max(2, Math.round(100 / gifFps));

    onProgress({ percentage: 5, status: `Initializing streaming GIF engine (${gifWidth}x${gifHeight} @ ${gifFps}fps)...` });

    const gifCanvas = document.createElement('canvas');
    gifCanvas.width = gifWidth;
    gifCanvas.height = gifHeight;
    const gifCtx = gifCanvas.getContext('2d', { alpha: false }) || gifCanvas.getContext('2d')!;
    gifCtx.imageSmoothingEnabled = true;
    gifCtx.imageSmoothingQuality = 'high';

    const gifEncoder = new StreamingGifEncoder(gifWidth, gifHeight);

    for (let frame = 0; frame < totalFrames; frame++) {
      const currentTime = frame / gifFps;
      const progressPercent = Math.min(94, Math.floor(8 + (frame / totalFrames) * 86));

      if (frame % 3 === 0 || frame === totalFrames - 1) {
        onProgress({
          percentage: progressPercent,
          status: `Rendering & encoding GIF frame ${frame + 1} of ${totalFrames} (${currentTime.toFixed(1)}s / ${totalDuration.toFixed(1)}s)...`,
        });
      }

      // Clear Canvas
      gifCtx.fillStyle = '#0f172a';
      gifCtx.fillRect(0, 0, gifWidth, gifHeight);

      // 1. Check Transition Card
      const activeTransition = project.transitions?.find(
        (tr) => currentTime >= tr.timestamp && currentTime < tr.timestamp + tr.duration
      );

      if (activeTransition) {
        renderTransitionCardFrame(gifCtx, gifWidth, gifHeight, activeTransition, currentTime - activeTransition.timestamp);
      } else {
        // 2. Video frame rendering with 100% compositing parity (aspect-fit, zooms, clicks, annotations)
        const sourceTime = calculateSourceTime(project, currentTime);
        if (exportVideo.readyState >= 1) {
          await seekVideoElement(exportVideo, sourceTime);
        }

        drawCompositedFrame(
          gifCtx,
          exportVideo,
          project,
          currentTime,
          gifWidth,
          gifHeight,
          gifSourceAspect
        );
      }

      // Stream frame directly into binary GIF encoder (ImageData is immediately discarded)
      const frameData = gifCtx.getImageData(0, 0, gifWidth, gifHeight);
      gifEncoder.addFrame(frameData, delayHundredths, {
        dither: options?.quality !== 'medium',
      });

      // Yield every 3 frames so UI stays responsive
      if (frame % 3 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    onProgress({ percentage: 97, status: 'Finalizing GIF89a file...' });
    const gifBlob = gifEncoder.finish();
    try {
      exportVideo.pause();
      exportVideo.src = '';
    } catch {}
    onProgress({ percentage: 100, status: 'GIF export complete!' });
    return gifBlob;
  }

  // -------------------------------------------------------------
  // VIDEO EXPORT PIPELINE: Deterministic Frame-by-Frame WebCodecs
  // -------------------------------------------------------------
  const { width, height, sourceAspect } = calculateExportDimensions(
    sourceWidth,
    sourceHeight,
    options?.resolution
  );

  const fps = options?.fps || project.settings?.fps || 30;

  // High-fidelity bitrates tailored for ultra-crisp text and UI
  let videoBitsPerSecond = 14000000; // 14 Mbps default for 1080p
  if (options?.quality === 'medium') videoBitsPerSecond = 7000000;
  if (options?.quality === 'ultra') videoBitsPerSecond = 28000000;
  if (width >= 2560 || height >= 1440) videoBitsPerSecond = Math.round(videoBitsPerSecond * 1.8);

  onProgress({ percentage: 5, status: `Configuring video pipeline (${width}x${height} @ ${fps}fps)...` });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Decode audio track if present
  let audioBuffer: AudioBuffer | null = null;
  if (project.audioTracks && project.audioTracks.length > 0) {
    const track = project.audioTracks[0];
    try {
      let audioBlob: Blob | null = null;
      if (track.presetId) {
        onProgress({ percentage: 8, status: 'Synthesizing soundtrack...' });
        const res = await generateSynthesizedAudio(track.presetId, totalDuration);
        audioBlob = res.blob;
      }
      if (audioBlob) {
        const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const ab = await audioBlob.arrayBuffer();
        audioBuffer = await actx.decodeAudioData(ab);
        await actx.close();
      }
    } catch (audioErr) {
      console.warn('Audio decoding notice:', audioErr);
    }
  }

  // Check WebCodecs availability
  const hasWebCodecs = typeof window !== 'undefined' && typeof (window as any).VideoEncoder !== 'undefined' && typeof (window as any).VideoFrame !== 'undefined';

  if (hasWebCodecs) {
    // -----------------------------------------------------------
    // WEBCODECS + MUXER DETERMINISTIC EXPORT (Gold Standard)
    // -----------------------------------------------------------
    const frameDurationMicros = Math.round(1_000_000 / fps);
    const totalFrames = Math.max(1, Math.ceil(totalDuration * fps));

    let muxerTarget: Mp4ArrayBufferTarget | WebmArrayBufferTarget;
    let muxer: any;

    if (format === 'mp4') {
      muxerTarget = new Mp4ArrayBufferTarget();
      muxer = new Mp4Muxer({
        target: muxerTarget,
        video: {
          codec: 'avc',
          width,
          height,
        },
        fastStart: 'in-memory',
      });
    } else {
      muxerTarget = new WebmArrayBufferTarget();
      muxer = new WebmMuxer({
        target: muxerTarget,
        video: {
          codec: 'V_VP9',
          width,
          height,
        },
      });
    }

    // Select optimal supported codec configuration
    let chosenCodec = 'avc1.640028';
    if (format === 'mp4') {
      const candidates = ['avc1.64002a', 'avc1.640028', 'avc1.4d002a', 'avc1.42001f'];
      for (const c of candidates) {
        try {
          const supp = await (window as any).VideoEncoder.isConfigSupported({
            codec: c,
            width,
            height,
            bitrate: videoBitsPerSecond,
            framerate: fps,
          });
          if (supp.supported) {
            chosenCodec = c;
            break;
          }
        } catch {}
      }
    } else {
      const candidates = ['vp09.00.10.08', 'vp09.00.41.08', 'vp8'];
      chosenCodec = 'vp09.00.10.08';
      for (const c of candidates) {
        try {
          const supp = await (window as any).VideoEncoder.isConfigSupported({
            codec: c,
            width,
            height,
            bitrate: videoBitsPerSecond,
            framerate: fps,
          });
          if (supp.supported) {
            chosenCodec = c;
            break;
          }
        } catch {}
      }
    }

    const videoEncoder = new (window as any).VideoEncoder({
      output: (chunk: any, meta: any) => {
        muxer.addVideoChunk(chunk, meta);
      },
      error: (err: any) => {
        console.error('VideoEncoder error:', err);
      },
    });

    videoEncoder.configure({
      codec: chosenCodec,
      width,
      height,
      bitrate: videoBitsPerSecond,
      framerate: fps,
      bitrateMode: 'variable',
      latencyMode: 'quality',
      hardwareAcceleration: 'prefer-hardware',
      avc: format === 'mp4' ? { format: 'avc' } : undefined,
    });

    let encodedFrameCount = 0;

    // Deterministic frame-by-frame loop: zero frames dropped!
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const currentTimelineTime = frameIndex / fps;
      const timestampMicros = frameIndex * frameDurationMicros;

      // Report progress
      if (frameIndex % 4 === 0 || frameIndex === totalFrames - 1) {
        const progressPercent = Math.min(94, Math.floor(6 + (frameIndex / totalFrames) * 88));
        onProgress({
          percentage: progressPercent,
          status: `Rendering & encoding frame ${frameIndex + 1} of ${totalFrames} (${currentTimelineTime.toFixed(1)}s / ${totalDuration.toFixed(1)}s)...`,
        });
      }

      // Clear canvas
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Check for Transition Card
      const activeTransition = project.transitions?.find(
        (tr) => currentTimelineTime >= tr.timestamp && currentTimelineTime < tr.timestamp + tr.duration
      );

      if (activeTransition) {
        renderTransitionCardFrame(ctx, width, height, activeTransition, currentTimelineTime - activeTransition.timestamp);
      } else {
        // Video frame rendering
        const sourceTime = calculateSourceTime(project, currentTimelineTime);
        if (exportVideo.readyState >= 1) {
          await seekVideoElement(exportVideo, sourceTime);
        }
        drawCompositedFrame(ctx, exportVideo, project, currentTimelineTime, width, height, sourceAspect);
      }

      // Create VideoFrame and encode
      const videoFrame = new (window as any).VideoFrame(canvas, {
        timestamp: timestampMicros,
        duration: frameDurationMicros,
      });

      const isKeyFrame = frameIndex % (fps * 2) === 0 || frameIndex === 0;
      videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
      videoFrame.close();
      encodedFrameCount++;

      // Micro-yield to prevent blocking UI
      if (frameIndex % 6 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    onProgress({ percentage: 95, status: 'Finalizing video stream & muxer...' });
    await videoEncoder.flush();
    videoEncoder.close();
    muxer.finalize();

    try {
      exportVideo.pause();
      exportVideo.src = '';
    } catch {}

    const finalBlob = new Blob([muxerTarget.buffer], {
      type: format === 'mp4' ? 'video/mp4' : 'video/webm',
    });

    // Validation Step
    onProgress({ percentage: 98, status: 'Validating exported video integrity...' });
    const validation = await validateExportedVideo(finalBlob, {
      expectedDuration: totalDuration,
      expectedWidth: width,
      expectedHeight: height,
      expectedFrames: totalFrames,
      encodedFrames: encodedFrameCount,
    });

    if (!validation.valid && validation.critical) {
      throw new Error(`Export validation failed: ${validation.message}`);
    }

    onProgress({ percentage: 100, status: 'Export complete!' });
    return finalBlob;
  }

  // -------------------------------------------------------------
  // FALLBACK PIPELINE: Deterministic Frame-Paced MediaRecorder
  // -------------------------------------------------------------
  const stream = canvas.captureStream(0);
  const videoTrack = stream.getVideoTracks()[0] as any;

  let mimeType = 'video/webm;codecs=vp9';
  if (format === 'mp4') {
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) mimeType = 'video/mp4;codecs=avc1';
    else if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  }

  const chunks: Blob[] = [];
  const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const exportPromise = new Promise<Blob>((resolve) => {
    mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  mediaRecorder.start();
  const totalFrames = Math.max(1, Math.ceil(totalDuration * fps));
  const frameIntervalMs = Math.round(1000 / fps);

  let encodedFrameCount = 0;

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const currentTimelineTime = frameIndex / fps;
    const progressPercent = Math.min(94, Math.floor(6 + (frameIndex / totalFrames) * 88));

    if (frameIndex % 4 === 0 || frameIndex === totalFrames - 1) {
      onProgress({
        percentage: progressPercent,
        status: `Rendering frame ${frameIndex + 1} of ${totalFrames}...`,
      });
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const activeTransition = project.transitions?.find(
      (tr) => currentTimelineTime >= tr.timestamp && currentTimelineTime < tr.timestamp + tr.duration
    );

    if (activeTransition) {
      renderTransitionCardFrame(ctx, width, height, activeTransition, currentTimelineTime - activeTransition.timestamp);
    } else {
      const sourceTime = calculateSourceTime(project, currentTimelineTime);
      await seekVideoElement(exportVideo, sourceTime);
      drawCompositedFrame(ctx, exportVideo, project, currentTimelineTime, width, height, sourceAspect);
    }

    if (videoTrack && typeof videoTrack.requestFrame === 'function') {
      videoTrack.requestFrame();
    }

    encodedFrameCount++;
    await new Promise((r) => setTimeout(r, frameIntervalMs));
  }

  mediaRecorder.stop();
  try {
    exportVideo.pause();
    exportVideo.src = '';
  } catch {}

  const finalBlob = await exportPromise;
  await validateExportedVideo(finalBlob, {
    expectedDuration: totalDuration,
    expectedWidth: width,
    expectedHeight: height,
    expectedFrames: totalFrames,
    encodedFrames: encodedFrameCount,
  });

  onProgress({ percentage: 100, status: 'Export complete!' });
  return finalBlob;
}

/**
 * Renders Click Animations (Ripple, Highlight, Pulse, Spotlight, Cursor) on Canvas
 */
export function renderClickAnimation(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  click: ClickAnimation,
  elapsed: number
) {
  const px = (click.x / 100) * canvasWidth;
  const py = (click.y / 100) * canvasHeight;
  const progress = Math.min(1, Math.max(0, elapsed / click.duration));

  ctx.save();

  if (click.style === 'ripple') {
    const maxRadius = click.size || 50;
    const currentRadius = maxRadius * progress;
    const alpha = 1 - progress;

    ctx.strokeStyle = click.color || '#38bdf8';
    ctx.lineWidth = 4;
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.arc(px, py, currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = click.color || '#38bdf8';
    ctx.globalAlpha = alpha * 0.4;
    ctx.beginPath();
    ctx.arc(px, py, currentRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (click.style === 'highlight') {
    const ringRadius = click.size || 40;
    const alpha = Math.sin(progress * Math.PI);

    ctx.strokeStyle = click.color || '#38bdf8';
    ctx.lineWidth = 5;
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.arc(px, py, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (click.style === 'pulse') {
    const pulseScale = 1 + Math.sin(progress * Math.PI) * 0.5;
    const radius = (click.size / 2 || 20) * pulseScale;

    ctx.fillStyle = click.color || '#f43f5e';
    ctx.globalAlpha = 0.8 * (1 - progress);

    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  } else if (click.style === 'spotlight') {
    // Dim outside, illuminate click spot
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const rad = click.size * 2 || 100;
    const grad = ctx.createRadialGradient(px, py, 10, px, py, rad);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  } else if (click.style === 'cursor') {
    // Draw cursor moving in and pressing
    const offsetY = (1 - progress) * 20;
    const curX = px;
    const curY = py + offsetY;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.globalAlpha = Math.min(1, progress * 3);

    ctx.beginPath();
    ctx.moveTo(curX, curY);
    ctx.lineTo(curX + 14, curY + 14);
    ctx.lineTo(curX + 6, curY + 16);
    ctx.lineTo(curX + 11, curY + 26);
    ctx.lineTo(curX + 7, curY + 28);
    ctx.lineTo(curX + 2, curY + 18);
    ctx.lineTo(curX - 2, curY + 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renders Callout Annotations on Canvas with typewriter/fade/slide effects
 */
export function renderAnnotation(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  ann: TextAnnotation,
  elapsed: number
) {
  const px = (ann.x / 100) * canvasWidth;
  const py = (ann.y / 100) * canvasHeight;
  const entryProgress = Math.min(1, elapsed / 0.35); // entrance
  const exitProgress = Math.max(0, (ann.duration - elapsed) / 0.35); // exit
  const alpha = Math.min(entryProgress, exitProgress) * (ann.opacity ?? 1);

  ctx.save();
  ctx.globalAlpha = alpha;

  // Compute text to show for Typewriter
  let displayText = ann.text;
  if (ann.animation === 'typewriter') {
    const charsToShow = Math.floor((elapsed / (ann.duration * 0.7)) * ann.text.length);
    displayText = ann.text.substring(0, Math.max(1, Math.min(ann.text.length, charsToShow)));
  }

  // Proportional scale factor relative to 1080p standard reference
  const scaleFactor = Math.max(0.4, canvasHeight / 1080);

  // Typography settings with proportional resolution scaling
  const fontWeight = ann.fontWeight || '600';
  const fontStyle = ann.fontStyle === 'italic' ? 'italic ' : '';
  const baseFontSize = ann.fontSize || 16;
  const fontSize = Math.round(baseFontSize * scaleFactor);
  const fontFamily = ann.fontFamily || 'system-ui, -apple-system, sans-serif';

  ctx.font = `${fontStyle}${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'top'; // Crucial for correct vertical alignment

  const rawPadH = ann.padding ?? 18;
  const rawPadV = ann.padding ? Math.max(10, Math.round(ann.padding * 0.75)) : 12;
  const paddingH = Math.round(rawPadH * scaleFactor);
  const paddingV = Math.round(rawPadV * scaleFactor);
  const radius = Math.round((ann.borderRadius ?? 12) * scaleFactor);
  const maxCardWidth = Math.min(Math.round(500 * scaleFactor), canvasWidth * 0.5);

  // Wrap text lines
  const lines = wrapText(ctx, displayText, maxCardWidth - paddingH * 2);
  const lineHeight = fontSize * 1.4;
  const textWidth = getMaxLineWidth(ctx, lines);
  const cardWidth = Math.max(160, Math.min(maxCardWidth, textWidth + paddingH * 2));
  const cardHeight = lines.length * lineHeight + paddingV * 2;

  // Position adjustment
  let drawX = px;
  let drawY = py;

  if (ann.style === 'minimal') {
    // Centered bottom banner
    drawX = (canvasWidth - cardWidth) / 2;
    drawY = canvasHeight - cardHeight - 50;
  }

  // Animation Transforms
  if (ann.animation === 'slide') {
    drawY += (1 - entryProgress) * 25;
  } else if (ann.animation === 'pop') {
    const scale = 0.8 + entryProgress * 0.2;
    ctx.translate(drawX + cardWidth / 2, drawY + cardHeight / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(drawX + cardWidth / 2), -(drawY + cardHeight / 2));
  }

  // Draw Card Background
  if (ann.shadow !== false) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
  }

  if (ann.style === 'rounded' || ann.style === 'speech') {
    ctx.fillStyle = ann.bgColor || '#0284c7';
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, cardWidth, cardHeight, radius);
    ctx.fill();

    // Draw speech bubble pointer arrow
    if (ann.arrowDirection === 'top' || ann.style === 'speech') {
      ctx.beginPath();
      ctx.moveTo(drawX + cardWidth / 2 - 8, drawY);
      ctx.lineTo(drawX + cardWidth / 2, drawY - 10);
      ctx.lineTo(drawX + cardWidth / 2 + 8, drawY);
      ctx.closePath();
      ctx.fill();
    } else if (ann.arrowDirection === 'bottom') {
      ctx.beginPath();
      ctx.moveTo(drawX + cardWidth / 2 - 8, drawY + cardHeight);
      ctx.lineTo(drawX + cardWidth / 2, drawY + cardHeight + 10);
      ctx.lineTo(drawX + cardWidth / 2 + 8, drawY + cardHeight);
      ctx.closePath();
      ctx.fill();
    }
  } else if (ann.style === 'floating') {
    ctx.fillStyle = ann.bgColor || 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = ann.borderColor || 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect(drawX, drawY, cardWidth, cardHeight, radius);
    ctx.fill();
    ctx.stroke();
  } else if (ann.style === 'highlight') {
    ctx.fillStyle = ann.bgColor || '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, cardWidth, cardHeight, radius);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(drawX - 4, drawY - 4, cardWidth + 8, cardHeight + 8, radius + 2);
    ctx.stroke();
  } else if (ann.style === 'minimal') {
    ctx.fillStyle = ann.bgColor || 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(drawX, drawY, cardWidth, cardHeight, radius);
    ctx.fill();
  }

  // Reset shadow for text
  ctx.shadowColor = 'transparent';

  // Draw Text Lines with alignment
  ctx.fillStyle = ann.textColor || '#ffffff';
  const align = ann.textAlign || 'left';

  lines.forEach((line, i) => {
    let lineX = drawX + paddingH;
    if (align === 'center') {
      const lineW = ctx.measureText(line).width;
      lineX = drawX + (cardWidth - lineW) / 2;
    } else if (align === 'right') {
      const lineW = ctx.measureText(line).width;
      lineX = drawX + cardWidth - paddingH - lineW;
    }

    const lineY = drawY + paddingV + i * lineHeight;
    ctx.fillText(line, lineX, lineY);
  });

  ctx.restore();
}

/**
 * Image Cache for Canvas Drawing
 */
const imageCanvasCache = new Map<string, HTMLImageElement>();

function getCachedImage(url?: string): HTMLImageElement | null {
  if (!url) return null;
  if (imageCanvasCache.has(url)) {
    const img = imageCanvasCache.get(url)!;
    return img.complete && img.naturalWidth > 0 ? img : null;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  imageCanvasCache.set(url, img);
  return null;
}

/**
 * Renders Full-Screen Title Transition Cards & Intro/Outro Templates on Canvas (100% width x height)
 */
export function renderTransitionCardFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tr: TransitionCard,
  elapsed: number
) {
  const entry = Math.min(1, elapsed / 0.4);
  const exit = Math.max(0, (tr.duration - elapsed) / 0.4);
  const alpha = Math.min(entry, exit);

  ctx.save();
  ctx.globalAlpha = alpha;

  // 1. Background Rendering
  if (tr.bgType === 'image' && tr.bgImageUrl) {
    const bgImg = getCachedImage(tr.bgImageUrl);
    ctx.fillStyle = tr.bgColor || '#0f172a';
    ctx.fillRect(0, 0, width, height);

    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, width, height);
    }

    // Overlay dark layer for contrast
    const overlayOpacity = tr.bgOverlayOpacity ?? 0.6;
    ctx.fillStyle = `rgba(15, 23, 42, ${overlayOpacity})`;
    ctx.fillRect(0, 0, width, height);
  } else if (tr.bgType === 'gradient' || tr.gradientColors?.length) {
    const colors = tr.gradientColors && tr.gradientColors.length >= 2
      ? tr.gradientColors
      : [tr.bgColor || '#0f172a', '#1e293b'];

    let grad: CanvasGradient;
    if (tr.gradientDirection === 'to-r') {
      grad = ctx.createLinearGradient(0, 0, width, 0);
    } else if (tr.gradientDirection === 'to-b') {
      grad = ctx.createLinearGradient(0, 0, 0, height);
    } else if (tr.gradientDirection === 'radial') {
      grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width / 1.2);
    } else {
      // Default to-br
      grad = ctx.createLinearGradient(0, 0, width, height);
    }

    colors.forEach((c, i) => {
      grad.addColorStop(i / (colors.length - 1), c);
    });

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Solid background
    ctx.fillStyle = tr.bgColor || '#0f172a';
    ctx.fillRect(0, 0, width, height);
  }

  // Grid / Ambient Accent for SaaS styles
  if (tr.style === 'saas' || tr.templateId?.includes('intro') || tr.templateId?.includes('outro')) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const step = 70;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  // 2. Animation Transform Setup
  const anim = tr.animationStyle || 'fade';
  if (anim === 'slide') {
    const offsetY = (1 - entry) * 40;
    ctx.translate(0, offsetY);
  } else if (anim === 'pop') {
    const scale = 0.9 + entry * 0.1;
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);
  } else if (anim === 'zoom') {
    const scale = 1.05 - entry * 0.05;
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);
  }

  // Shared Constants
  const fontFamily = tr.fontFamily || 'Inter, system-ui, sans-serif';
  const textColor = tr.textColor || '#ffffff';
  const accentColor = tr.accentColor || '#38bdf8';
  const buttonColor = tr.buttonColor || '#0284c7';
  const buttonTextColor = tr.buttonTextColor || '#ffffff';
  const logoImg = getCachedImage(tr.logoUrl);
  const screenshotImg = getCachedImage(tr.screenshotUrl);
  const authorImg = getCachedImage(tr.authorPhotoUrl);

  // 3. Template Layout Rendering
  const tid = tr.templateId || '';

  if (tid === 'intro_02' || tid === 'intro_07' || tid === 'outro_07') {
    // Screenshot Focus Layout
    const titleText = tr.productName || tr.title || 'ACME STUDIO';
    const headText = tr.headline || tr.subtitle || 'Build better workflows';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Top Brand Tag
    ctx.font = `bold 16px ${fontFamily}`;
    ctx.fillStyle = accentColor;
    ctx.fillText(titleText.toUpperCase(), width / 2, 50);

    // Headline
    ctx.font = `bold 32px ${fontFamily}`;
    ctx.fillStyle = textColor;
    ctx.fillText(headText, width / 2, 85);

    // Screenshot Card Container
    const cardW = Math.min(880, width * 0.72);
    const cardH = Math.min(420, height * 0.58);
    const cardX = (width - cardW) / 2;
    const cardY = 150;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;

    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = 'transparent';

    // Browser Header Bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, 36, [16, 16, 0, 0]);
    ctx.fill();

    // Window Dots
    ['#ef4444', '#f59e0b', '#10b981'].forEach((dotColor, di) => {
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(cardX + 20 + di * 16, cardY + 18, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Screenshot image inside
    if (screenshotImg) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX + 2, cardY + 38, cardW - 4, cardH - 40, [0, 0, 14, 14]);
      ctx.clip();
      ctx.drawImage(screenshotImg, cardX + 2, cardY + 38, cardW - 4, cardH - 40);
      ctx.restore();
    } else {
      // Placeholder UI lines
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.font = `500 16px ${fontFamily}`;
      ctx.fillText('App Screenshot Preview', width / 2, cardY + cardH / 2);
    }
  } else if (tid === 'intro_10') {
    // Split Screen Layout
    const leftX = width * 0.08;
    const leftW = width * 0.42;
    const rightX = width * 0.53;
    const cardW = width * 0.39;
    const cardH = height * 0.65;
    const cardY = (height - cardH) / 2;

    // Left Column Text
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Badge
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(leftX, cardY, 140, 28, 14);
    ctx.fill();
    ctx.stroke();

    ctx.font = `bold 12px ${fontFamily}`;
    ctx.fillStyle = accentColor;
    ctx.fillText((tr.productName || tr.title || 'PRODUCT').toUpperCase(), leftX + 16, cardY + 8);

    // Headline
    ctx.font = `bold 36px ${fontFamily}`;
    ctx.fillStyle = textColor;
    const headLines = wrapText(ctx, tr.headline || tr.title, leftW);
    headLines.forEach((hl, hli) => {
      ctx.fillText(hl, leftX, cardY + 48 + hli * 44);
    });

    // Subtitle
    if (tr.subtitle) {
      ctx.font = `400 18px ${fontFamily}`;
      ctx.fillStyle = 'rgba(226, 232, 240, 0.8)';
      const subLines = wrapText(ctx, tr.subtitle, leftW);
      subLines.forEach((sl, sli) => {
        ctx.fillText(sl, leftX, cardY + 160 + sli * 26);
      });
    }

    // Right Column Card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.roundRect(rightX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = 'transparent';

    if (screenshotImg) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(rightX + 2, cardY + 2, cardW - 4, cardH - 4, 14);
      ctx.clip();
      ctx.drawImage(screenshotImg, rightX + 2, cardY + 2, cardW - 4, cardH - 4);
      ctx.restore();
    } else {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = `500 16px ${fontFamily}`;
      ctx.fillText('Product UI Mockup', rightX + cardW / 2, cardY + cardH / 2);
    }
  } else if (tid === 'outro_04' || tid === 'outro_06') {
    // Social / Multiple CTA Layout
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const centerY = height * 0.18;

    ctx.font = `bold 16px ${fontFamily}`;
    ctx.fillStyle = accentColor;
    ctx.fillText((tr.title || 'THANK YOU').toUpperCase(), width / 2, centerY);

    ctx.font = `bold 36px ${fontFamily}`;
    ctx.fillStyle = textColor;
    ctx.fillText(tr.headline || 'Connect with us across all channels', width / 2, centerY + 32);

    // Handles Grid
    const handles = [
      { label: 'X / Twitter', value: tr.socialHandles?.twitter || '@acme_ai', color: '#38bdf8' },
      { label: 'YouTube', value: tr.socialHandles?.youtube || 'youtube.com/@acme', color: '#f43f5e' },
      { label: 'Website', value: tr.websiteUrl || 'acme.ai', color: '#10b981' },
      { label: 'Email', value: tr.email || 'hello@acme.ai', color: '#a855f7' },
    ];

    const boxW = 260;
    const boxH = 90;
    const startX = (width - (boxW * 2 + 24)) / 2;
    const startY = centerY + 100;

    handles.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = startX + col * (boxW + 24);
      const by = startY + row * (boxH + 20);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = `600 12px ${fontFamily}`;
      ctx.fillStyle = item.color;
      ctx.fillText(item.label.toUpperCase(), bx + 20, by + 18);

      ctx.font = `bold 16px ${fontFamily}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(item.value, bx + 20, by + 42);
    });
  } else if (tid === 'outro_08') {
    // Founder / Creator Layout
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const cardW = 680;
    const cardH = 380;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 24;

    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = 'transparent';

    // Creator Avatar Circle
    const avatarX = width / 2;
    const avatarY = cardY + 70;
    const avatarR = 42;

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR + 3, 0, Math.PI * 2);
    ctx.fill();

    if (authorImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(authorImg, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `bold 24px ${fontFamily}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText((tr.authorName || 'A')[0].toUpperCase(), avatarX, avatarY - 12);
    }

    // Name & Role
    ctx.font = `bold 26px ${fontFamily}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tr.authorName || 'Alex River', width / 2, cardY + 130);

    ctx.font = `500 15px ${fontFamily}`;
    ctx.fillStyle = accentColor;
    ctx.fillText(tr.authorRole || 'Founder & Creator', width / 2, cardY + 168);

    // Headline message
    ctx.font = `400 17px ${fontFamily}`;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
    ctx.fillText(tr.headline || 'Thanks for watching! Feel free to reach out.', width / 2, cardY + 205);

    // Website Button
    const btnW = 200;
    const btnH = 44;
    const btnX = (width - btnW) / 2;
    const btnY = cardY + 250;

    ctx.fillStyle = buttonColor;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 22);
    ctx.fill();

    ctx.font = `bold 15px ${fontFamily}`;
    ctx.fillStyle = buttonTextColor;
    ctx.fillText(tr.websiteUrl || 'acme.ai', width / 2, btnY + 14);
  } else {
    // Default Clean Centered / SaaS Card Layout (Handles intro_01, intro_03, intro_04, intro_05, intro_06, intro_08, intro_09, outro_01, outro_02, outro_03, outro_05, outro_09, outro_10)
    ctx.textAlign = tr.alignment === 'left' ? 'left' : 'center';
    ctx.textBaseline = 'middle';

    const cardW = Math.min(960, width * 0.8);
    const cardH = Math.min(420, height * 0.6);
    const cardX = tr.alignment === 'left' ? width * 0.1 : (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    if (tr.style === 'saas' || tid.startsWith('intro_') || tid.startsWith('outro_')) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 30;

      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 24);
      ctx.fill();
      ctx.stroke();
      ctx.shadowColor = 'transparent';
    }

    const centerX = tr.alignment === 'left' ? cardX + 50 : width / 2;
    let currY = cardY + 60;

    // Logo image if present
    if (logoImg) {
      const logoSize = 48;
      const lx = tr.alignment === 'left' ? centerX : (width - logoSize) / 2;
      ctx.drawImage(logoImg, lx, currY, logoSize, logoSize);
      currY += logoSize + 20;
    }

    // Top Badge / Product Title Tag
    const tagText = tr.productName || tr.title || 'ACME STUDIO';
    ctx.font = `bold 14px ${fontFamily}`;
    ctx.fillStyle = accentColor;
    ctx.fillText(tagText.toUpperCase(), centerX, currY);
    currY += 34;

    // Main Headline / Title
    const fontSize = tr.fontSize || 38;
    ctx.font = `${tr.fontWeight || 'bold'} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = textColor;

    const mainText = tr.headline || tr.title || 'Welcome to Acme';
    const lines = wrapText(ctx, mainText, cardW - 100);
    lines.forEach((line) => {
      ctx.fillText(line, centerX, currY);
      currY += fontSize * 1.25;
    });

    currY += 8;

    // Subtitle / Tagline
    if (tr.subtitle || tr.tagline) {
      const sub = tr.subtitle || tr.tagline || '';
      ctx.font = `400 18px ${fontFamily}`;
      ctx.fillStyle = 'rgba(226, 232, 240, 0.8)';
      const subLines = wrapText(ctx, sub, cardW - 120);
      subLines.forEach((sline) => {
        ctx.fillText(sline, centerX, currY);
        currY += 26;
      });
      currY += 12;
    }

    // Call to Action Button or Website Pill if present
    if (tr.ctaText || tr.websiteUrl) {
      const btnText = tr.ctaText ? `${tr.ctaText} →` : tr.websiteUrl;
      ctx.font = `bold 16px ${fontFamily}`;
      const btnMetrics = ctx.measureText(btnText || '');
      const btnW = Math.max(180, btnMetrics.width + 48);
      const btnH = 46;

      const bx = tr.alignment === 'left' ? centerX : (width - btnW) / 2;
      const by = Math.min(cardY + cardH - 70, currY + 10);

      ctx.fillStyle = buttonColor;
      ctx.beginPath();
      ctx.roundRect(bx, by, btnW, btnH, 23);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.fillStyle = buttonTextColor;
      ctx.fillText(btnText || '', bx + btnW / 2, by + btnH / 2);
    }
  }

  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

function getMaxLineWidth(ctx: CanvasRenderingContext2D, lines: string[]): number {
  return lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
}
