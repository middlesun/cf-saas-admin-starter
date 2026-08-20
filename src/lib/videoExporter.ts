import { Project, TextAnnotation, ClickAnimation, TransitionCard } from '../types';
import { generateSynthesizedAudio } from './audioSynth';
import { calculateZoomTransformAtTime } from './zoomSystem';
import { StreamingGifEncoder, encodeCanvasFramesToGif } from './gifEncoder';

export { encodeCanvasFramesToGif };

export interface ExportProgress {
  percentage: number;
  status: string;
}

export interface ExportOptions {
  format?: 'mp4' | 'webm' | 'gif';
  resolution?: '720p' | '1080p' | '4k';
  fps?: number;
  quality?: 'medium' | 'high' | 'ultra';
}

/**
 * Fast asynchronous video seek helper with safety fallback
 */
async function seekVideoElement(video: HTMLVideoElement, targetTime: number): Promise<void> {
  const safeTime = Math.max(0, Math.min(targetTime, video.duration || targetTime));
  if (Math.abs(video.currentTime - safeTime) < 0.03 && video.readyState >= 2) {
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
    const onSeeked = () => finish();
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
    setTimeout(finish, 120);
  });
}

/**
 * Calculates the mapped source video timestamp for a given timeline time
 */
export function calculateSourceTime(project: Project, timelineTime: number): number {
  let accumulated = 0;

  for (const seg of project.videoSegments) {
    const segDuration = (seg.endTime - seg.startTime) / seg.speed;
    if (timelineTime >= accumulated && timelineTime <= accumulated + segDuration) {
      const elapsedInSeg = (timelineTime - accumulated) * seg.speed;
      return seg.startTime + elapsedInSeg;
    }
    accumulated += segDuration;
  }

  return project.duration || 0;
}

/**
 * Finds the active video segment for a given timeline time
 */
function getActiveSegment(project: Project, timelineTime: number) {
  let accumulated = 0;
  for (const seg of project.videoSegments) {
    const segDuration = (seg.endTime - seg.startTime) / seg.speed;
    if (timelineTime >= accumulated && timelineTime <= accumulated + segDuration) {
      return seg;
    }
    accumulated += segDuration;
  }
  return project.videoSegments[project.videoSegments.length - 1] || null;
}

export async function renderAndExportVideo(
  project: Project,
  videoElement: HTMLVideoElement,
  onProgress: (progress: ExportProgress) => void,
  options?: ExportOptions
): Promise<Blob> {
  const isGif = options?.format === 'gif';

  // Ensure video element is ready
  if (videoElement.readyState < 2) {
    onProgress({ percentage: 2, status: 'Preparing video stream buffers...' });
    await new Promise<void>((res) => {
      const finish = () => {
        videoElement.removeEventListener('loadeddata', finish);
        videoElement.removeEventListener('canplay', finish);
        res();
      };
      videoElement.addEventListener('loadeddata', finish, { once: true });
      videoElement.addEventListener('canplay', finish, { once: true });
      setTimeout(finish, 600);
    });
  }

  // Determine native source dimensions & aspect ratio
  const sourceWidth = videoElement.videoWidth || project.settings?.width || 1920;
  const sourceHeight = videoElement.videoHeight || project.settings?.height || 1080;
  const sourceAspect = sourceWidth / Math.max(1, sourceHeight);

  // Calculate total timeline duration based on video segments & transitions
  const totalVideoDuration = project.videoSegments.reduce(
    (acc, seg) => acc + (seg.endTime - seg.startTime) / seg.speed,
    0
  );
  const totalDuration = Math.max(totalVideoDuration, 0.5);

  // -------------------------------------------------------------
  // GIF EXPORT PIPELINE: Streaming Zero-Memory Encoder
  // -------------------------------------------------------------
  if (isGif) {
    // Optimal dimensions profile for crisp, fast-loading animated GIFs
    let gifWidth = 800;
    if (options?.quality === 'medium') gifWidth = 640;
    if (options?.quality === 'ultra') gifWidth = 960;
    if (options?.resolution === '720p') gifWidth = Math.min(1280, Math.round(720 * sourceAspect));

    let gifHeight = Math.round(gifWidth / sourceAspect);
    gifWidth = Math.round(gifWidth / 2) * 2;
    gifHeight = Math.round(gifHeight / 2) * 2;

    const gifFps = options?.fps || 15;
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

      onProgress({
        percentage: progressPercent,
        status: `Rendering & encoding GIF frame ${frame + 1} of ${totalFrames} (${currentTime.toFixed(1)}s / ${totalDuration.toFixed(1)}s)...`,
      });

      // Clear Canvas
      gifCtx.fillStyle = '#0f172a';
      gifCtx.fillRect(0, 0, gifWidth, gifHeight);

      // 1. Check Transition Card
      const activeTransition = project.transitions.find(
        (tr) => currentTime >= tr.timestamp && currentTime < tr.timestamp + tr.duration
      );

      if (activeTransition) {
        renderTransitionCardFrame(gifCtx, gifWidth, gifHeight, activeTransition, currentTime - activeTransition.timestamp);
      } else {
        // 2. Video frame rendering
        const sourceTime = calculateSourceTime(project, currentTime);
        if (videoElement.readyState >= 1) {
          await seekVideoElement(videoElement, sourceTime);
        }

        const zoom = calculateZoomTransformAtTime(project.zoomEvents || [], currentTime);

        gifCtx.save();
        if (zoom.scale > 1.0) {
          const centerX = (zoom.x / 100) * gifWidth;
          const centerY = (zoom.y / 100) * gifHeight;
          gifCtx.translate(centerX, centerY);
          gifCtx.scale(zoom.scale, zoom.scale);
          gifCtx.translate(-centerX, -centerY);
        }

        try {
          gifCtx.drawImage(videoElement, 0, 0, gifWidth, gifHeight);
        } catch {
          gifCtx.fillStyle = '#0f172a';
          gifCtx.fillRect(0, 0, gifWidth, gifHeight);
        }

        // Draw Clicks
        project.clickAnimations.forEach((click) => {
          if (currentTime >= click.timestamp && currentTime <= click.timestamp + click.duration) {
            renderClickAnimation(gifCtx, gifWidth, gifHeight, click, currentTime - click.timestamp);
          }
        });

        // Draw Annotations
        project.annotations.forEach((ann) => {
          if (currentTime >= ann.startTime && currentTime <= ann.startTime + ann.duration) {
            renderAnnotation(gifCtx, gifWidth, gifHeight, ann, currentTime - ann.startTime);
          }
        });

        gifCtx.restore();
      }

      // Stream frame directly into binary GIF encoder (ImageData is immediately discarded)
      const frameData = gifCtx.getImageData(0, 0, gifWidth, gifHeight);
      gifEncoder.addFrame(frameData, delayHundredths, {
        dither: options?.quality !== 'medium',
      });

      // Yield every 4 frames so UI stays responsive
      if (frame % 4 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    onProgress({ percentage: 97, status: 'Finalizing GIF89a file...' });
    const gifBlob = gifEncoder.finish();
    onProgress({ percentage: 100, status: 'GIF export complete!' });
    return gifBlob;
  }

  // -------------------------------------------------------------
  // VIDEO EXPORT PIPELINE: Real-Time Synchronized Canvas Stream
  // -------------------------------------------------------------
  let width = sourceWidth;
  let height = sourceHeight;

  if (options?.resolution === '1080p') {
    if (sourceAspect >= 1) {
      height = 1080;
      width = Math.round(1080 * sourceAspect);
    } else {
      width = 1080;
      height = Math.round(1080 / sourceAspect);
    }
  } else if (options?.resolution === '720p') {
    if (sourceAspect >= 1) {
      height = 720;
      width = Math.round(720 * sourceAspect);
    } else {
      width = 720;
      height = Math.round(720 / sourceAspect);
    }
  } else if (options?.resolution === '4k') {
    if (sourceAspect >= 1) {
      height = 2160;
      width = Math.round(2160 * sourceAspect);
    } else {
      width = 2160;
      height = Math.round(2160 / sourceAspect);
    }
  }

  width = Math.round(width / 2) * 2;
  height = Math.round(height / 2) * 2;

  const fps = options?.fps || project.settings?.fps || 30;

  let videoBitsPerSecond = 8000000;
  if (options?.quality === 'medium') videoBitsPerSecond = 4000000;
  if (options?.quality === 'ultra') videoBitsPerSecond = 16000000;

  onProgress({ percentage: 5, status: `Initializing real-time video recorder (${width}x${height} @ ${fps}fps)...` });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Setup Web Audio Stream
  let audioContext: AudioContext | null = null;
  let audioBufferSource: AudioBufferSourceNode | null = null;
  let mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;

  if (project.audioTracks && project.audioTracks.length > 0) {
    const track = project.audioTracks[0];
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      if (audioContext.createMediaStreamDestination) {
        mediaStreamDestination = audioContext.createMediaStreamDestination();
      }

      let audioBlob: Blob | null = null;
      if (track.presetId) {
        onProgress({ percentage: 8, status: 'Synthesizing soundtrack...' });
        const res = await generateSynthesizedAudio(track.presetId, totalDuration);
        audioBlob = res.blob;
      }

      if (audioBlob) {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);

        audioBufferSource = audioContext.createBufferSource();
        audioBufferSource.buffer = decodedBuffer;
        audioBufferSource.loop = track.loop;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = track.volume;

        audioBufferSource.connect(gainNode);
        if (mediaStreamDestination) {
          gainNode.connect(mediaStreamDestination);
        } else {
          gainNode.connect(audioContext.destination);
        }
      }
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  // Combine Canvas Video Track + Web Audio Track
  const canvasStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream();

  canvasStream.getVideoTracks().forEach((t) => combinedStream.addTrack(t));
  if (mediaStreamDestination && mediaStreamDestination.stream.getAudioTracks().length > 0) {
    mediaStreamDestination.stream.getAudioTracks().forEach((t) => combinedStream.addTrack(t));
  }

  // Select optimal supported container & codec
  let mimeType = 'video/webm;codecs=vp9';
  if (options?.format === 'mp4') {
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
      mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
    } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
      mimeType = 'video/mp4;codecs=avc1';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    }
  }

  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';
  }

  const chunks: Blob[] = [];
  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond,
  });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const exportPromise = new Promise<Blob>((resolve) => {
    mediaRecorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  // Prepare source video element for playback recording
  videoElement.muted = true;
  videoElement.playsInline = true;
  videoElement.currentTime = calculateSourceTime(project, 0);

  // Start recording
  mediaRecorder.start(100);
  if (audioBufferSource && audioContext) {
    try {
      audioBufferSource.start(0);
    } catch {}
  }

  const exportStartTime = performance.now();
  await videoElement.play().catch(() => {});

  // High-precision real-time render engine
  await new Promise<void>((resolve) => {
    let animId: number;

    const tick = () => {
      const now = performance.now();
      const elapsedSeconds = (now - exportStartTime) / 1000;
      const currentTimelineTime = Math.min(elapsedSeconds, totalDuration);

      const progressPct = Math.min(95, Math.floor(10 + (currentTimelineTime / totalDuration) * 85));
      onProgress({
        percentage: progressPct,
        status: `Recording video (${currentTimelineTime.toFixed(1)}s / ${totalDuration.toFixed(1)}s)...`,
      });

      // Clear Canvas
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Check for Transition Card
      const activeTransition = project.transitions.find(
        (tr) => currentTimelineTime >= tr.timestamp && currentTimelineTime < tr.timestamp + tr.duration
      );

      if (activeTransition) {
        if (!videoElement.paused) {
          videoElement.pause();
        }
        renderTransitionCardFrame(ctx, width, height, activeTransition, currentTimelineTime - activeTransition.timestamp);
      } else {
        // Active video segment synchronization
        const targetSourceTime = calculateSourceTime(project, currentTimelineTime);
        const activeSeg = getActiveSegment(project, currentTimelineTime);
        const targetSpeed = activeSeg ? activeSeg.speed : 1.0;

        if (videoElement.paused) {
          videoElement.play().catch(() => {});
        }
        if (Math.abs(videoElement.playbackRate - targetSpeed) > 0.05) {
          videoElement.playbackRate = targetSpeed;
        }

        // Resync if video element drifted significantly (> 0.25s)
        if (Math.abs(videoElement.currentTime - targetSourceTime) > 0.25) {
          videoElement.currentTime = targetSourceTime;
        }

        // Apply Zoom Transform
        const zoom = calculateZoomTransformAtTime(project.zoomEvents || [], currentTimelineTime);

        ctx.save();
        if (zoom.scale > 1.0) {
          const centerX = (zoom.x / 100) * width;
          const centerY = (zoom.y / 100) * height;
          ctx.translate(centerX, centerY);
          ctx.scale(zoom.scale, zoom.scale);
          ctx.translate(-centerX, -centerY);
        }

        // Draw Video Frame
        try {
          ctx.drawImage(videoElement, 0, 0, width, height);
        } catch {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, width, height);
        }

        // Draw Clicks active at current time
        project.clickAnimations.forEach((click) => {
          if (currentTimelineTime >= click.timestamp && currentTimelineTime <= click.timestamp + click.duration) {
            renderClickAnimation(ctx, width, height, click, currentTimelineTime - click.timestamp);
          }
        });

        // Draw Annotations active at current time
        project.annotations.forEach((ann) => {
          if (currentTimelineTime >= ann.startTime && currentTimelineTime <= ann.startTime + ann.duration) {
            renderAnnotation(ctx, width, height, ann, currentTimelineTime - ann.startTime);
          }
        });

        ctx.restore();
      }

      if (currentTimelineTime >= totalDuration) {
        cancelAnimationFrame(animId);
        resolve();
        return;
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
  });

  // Stop recorder and cleanup media elements
  try {
    mediaRecorder.stop();
  } catch {}

  try {
    videoElement.pause();
    videoElement.playbackRate = 1.0;
  } catch {}

  if (audioBufferSource) {
    try {
      audioBufferSource.stop();
    } catch {}
  }
  if (audioContext) {
    try {
      audioContext.close();
    } catch {}
  }

  onProgress({ percentage: 98, status: `Packaging final ${options?.format === 'mp4' ? 'MP4' : 'WebM'} video...` });
  const finalBlob = await exportPromise;
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

  // Typography settings
  const fontWeight = ann.fontWeight || '600';
  const fontStyle = ann.fontStyle === 'italic' ? 'italic ' : '';
  const fontSize = ann.fontSize || 16;
  const fontFamily = ann.fontFamily || 'system-ui, -apple-system, sans-serif';

  ctx.font = `${fontStyle}${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'top'; // Crucial for correct vertical alignment

  const paddingH = ann.padding ?? 18;
  const paddingV = ann.padding ? Math.max(10, Math.round(ann.padding * 0.75)) : 12;
  const radius = ann.borderRadius ?? 12;
  const maxCardWidth = Math.min(500, canvasWidth * 0.5);

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
