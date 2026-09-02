import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Project, VideoSegment } from '../../types';
import { renderClickAnimation, renderAnnotation, renderTransitionCardFrame } from '../../lib/videoExporter';
import { calculateZoomTransformAtTime } from '../../lib/zoomSystem';
import {
  Scissors,
  Trash2,
  CheckSquare,
  Square,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Clock,
  Layers,
  Check,
  X,
  SlidersHorizontal,
  Zap,
  ArrowLeftRight,
} from 'lucide-react';

interface FrameSlideStripProps {
  project: Project;
  currentTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onUpdateSegments: (segments: VideoSegment[]) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export interface FrameItem {
  index: number;
  startTime: number;
  durationMs: number;
  endTime: number;
  isKept: boolean;
}

export const FrameSlideStrip: React.FC<FrameSlideStripProps> = ({
  project,
  currentTime,
  isPlaying,
  onPlayPause,
  onSeek,
  onUpdateSegments,
  videoRef,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = useRef<boolean>(false);

  // Settings
  const [fps, setFps] = useState<number>(15); // 15 fps gives ~66ms per frame matching ScreenToGif
  const [zoomPercent, setZoomPercent] = useState<number>(68); // 68% default from screenshot
  const [autoScrollToPlayhead, setAutoScrollToPlayhead] = useState<boolean>(true);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  // Multi-selection state
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Cached thumbnails: timestamp string -> dataURL (prevents re-fetching when deleting frames)
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const isGeneratingRef = useRef<boolean>(false);

  // Calculate active segments
  const activeSegments = useMemo<VideoSegment[]>(() => {
    if (project.videoSegments && project.videoSegments.length > 0) {
      return project.videoSegments;
    }
    return [
      {
        id: 'seg_default',
        startTime: 0,
        endTime: Math.max(0.1, project.duration || 1),
        speed: 1.0,
      },
    ];
  }, [project.videoSegments, project.duration]);

  // Frame interval
  const frameInterval = 1 / fps; // in seconds
  const frameDurationMs = Math.round(frameInterval * 1000); // in ms (e.g. 66ms at 15fps)

  // Construct frame list ONLY from active kept segments (completely excluding deleted portions)
  const frames: FrameItem[] = useMemo(() => {
    const list: FrameItem[] = [];
    let runningIndex = 0;

    for (let segIdx = 0; segIdx < activeSegments.length; segIdx++) {
      const seg = activeSegments[segIdx];
      const segDuration = Math.max(0, seg.endTime - seg.startTime);
      const segFrames = Math.max(1, Math.round(segDuration / frameInterval));

      for (let i = 0; i < segFrames; i++) {
        const startTime = parseFloat((seg.startTime + i * frameInterval).toFixed(3));
        const endTime = parseFloat(Math.min(seg.endTime, seg.startTime + (i + 1) * frameInterval).toFixed(3));
        const durationMs = Math.max(1, Math.round((endTime - startTime) * 1000));

        list.push({
          index: runningIndex++,
          startTime,
          durationMs: durationMs > 0 ? durationMs : frameDurationMs,
          endTime,
          isKept: true,
        });
      }
    }
    return list;
  }, [activeSegments, frameInterval, frameDurationMs]);

  // Current active frame index based on playhead
  const currentFrameIndex = useMemo(() => {
    if (frames.length === 0) return 0;
    const matchIdx = frames.findIndex(
      (f) => currentTime >= f.startTime - 0.005 && currentTime <= f.endTime + 0.005
    );
    if (matchIdx !== -1) return matchIdx;

    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < frames.length; i++) {
      const diff = Math.abs(frames[i].startTime - currentTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    return closestIdx;
  }, [currentTime, frames]);

  // Auto-scroll filmstrip to keep playhead in view during playback
  useEffect(() => {
    if (!autoScrollToPlayhead || !scrollContainerRef.current || isPlaying === false) return;
    const container = scrollContainerRef.current;
    const cardWidth = Math.round(90 * (zoomPercent / 68));
    const targetScrollLeft = currentFrameIndex * (cardWidth + 8) - container.clientWidth / 2 + cardWidth / 2;

    isAutoScrollingRef.current = true;
    container.scrollTo({
      left: Math.max(0, targetScrollLeft),
      behavior: 'smooth',
    });
    setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 150);
  }, [currentFrameIndex, zoomPercent, autoScrollToPlayhead, isPlaying]);

  // Progressive thumbnail extractor from video & project overlays
  useEffect(() => {
    let isCancelled = false;

    const generateThumbnails = async () => {
      const video = videoRef.current;
      if (!video || isGeneratingRef.current) return;
      isGeneratingRef.current = true;

      // Offscreen canvas for rendering frame preview
      const canvas = document.createElement('canvas');
      const previewWidth = 160;
      const previewHeight = 90;
      canvas.width = previewWidth;
      canvas.height = previewHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        isGeneratingRef.current = false;
        return;
      }

      // Create an offscreen video element for background frame capture
      let offscreenVideo: HTMLVideoElement | null = null;
      if (project.sourceVideoBlobUrl) {
        offscreenVideo = document.createElement('video');
        offscreenVideo.src = project.sourceVideoBlobUrl;
        offscreenVideo.muted = true;
        offscreenVideo.preload = 'auto';
        offscreenVideo.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          if (!offscreenVideo) return resolve();
          if (offscreenVideo.readyState >= 1) return resolve();
          offscreenVideo.onloadedmetadata = () => resolve();
          offscreenVideo.onerror = () => resolve();
          setTimeout(resolve, 1000);
        });
      }

      const activeVideo = offscreenVideo || video;

      // Extract batch of thumbnails
      const newThumbs = new Map<string, string>(thumbnails);

      for (let i = 0; i < frames.length; i += 1) {
        if (isCancelled) break;
        const frame = frames[i];
        const timeKey = frame.startTime.toFixed(3);
        if (newThumbs.has(timeKey)) continue;

        const time = frame.startTime;

        // Clear canvas
        ctx.fillStyle = '#090d18';
        ctx.fillRect(0, 0, previewWidth, previewHeight);

        // Check if transition card is active
        const activeTransition = project.transitions.find(
          (tr) => time >= tr.timestamp && time < tr.timestamp + tr.duration
        );

        if (activeTransition) {
          renderTransitionCardFrame(ctx, previewWidth, previewHeight, activeTransition, time - activeTransition.timestamp);
        } else if (activeVideo) {
          try {
            if (Math.abs(activeVideo.currentTime - time) > 0.05) {
              await new Promise<void>((res) => {
                const onSeeked = () => {
                  activeVideo.removeEventListener('seeked', onSeeked);
                  res();
                };
                activeVideo.addEventListener('seeked', onSeeked, { once: true });
                activeVideo.currentTime = time;
                setTimeout(res, 120);
              });
            }

            const zoom = calculateZoomTransformAtTime(project.zoomEvents || [], time);
            ctx.save();
            if (zoom.scale > 1.0) {
              const cx = (zoom.x / 100) * previewWidth;
              const cy = (zoom.y / 100) * previewHeight;
              ctx.translate(cx, cy);
              ctx.scale(zoom.scale, zoom.scale);
              ctx.translate(-cx, -cy);
            }
            ctx.drawImage(activeVideo, 0, 0, previewWidth, previewHeight);

            // Draw overlay clicks & text callouts
            project.clickAnimations.forEach((c) => {
              if (time >= c.timestamp && time <= c.timestamp + c.duration) {
                renderClickAnimation(ctx, previewWidth, previewHeight, c, time - c.timestamp);
              }
            });
            project.annotations.forEach((a) => {
              if (time >= a.startTime && time <= a.startTime + a.duration) {
                renderAnnotation(ctx, previewWidth, previewHeight, a, time - a.startTime);
              }
            });

            ctx.restore();
          } catch {
            // Draw placeholder pattern if video seek fails
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, previewWidth, previewHeight);
            ctx.fillStyle = '#38bdf8';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Frame #${i}`, previewWidth / 2, previewHeight / 2);
          }
        }

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
          newThumbs.set(timeKey, dataUrl);
        } catch {
          // ignore
        }

        // Commit thumbnails every 4 frames so UI updates smoothly
        if (i % 4 === 0 || i === frames.length - 1) {
          setThumbnails(new Map(newThumbs));
          await new Promise((r) => setTimeout(r, 10));
        }
      }

      if (offscreenVideo) {
        offscreenVideo.src = '';
        offscreenVideo.remove();
      }

      isGeneratingRef.current = false;
    };

    generateThumbnails();

    return () => {
      isCancelled = true;
      isGeneratingRef.current = false;
    };
  }, [frames, project, videoRef]);

  // Click / Selection Handlers
  const handleFrameClick = (e: React.MouseEvent, index: number) => {
    const frame = frames[index];
    if (!frame) return;

    if (e.shiftKey && lastClickedIndex !== null) {
      // Range select from lastClickedIndex to index
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const updated = new Set(selectedIndices);
      for (let i = start; i <= end; i++) {
        updated.add(i);
      }
      setSelectedIndices(updated);
    } else if (e.ctrlKey || e.metaKey) {
      // Multi-select toggle
      const updated = new Set(selectedIndices);
      if (updated.has(index)) {
        updated.delete(index);
      } else {
        updated.add(index);
      }
      setSelectedIndices(updated);
      setLastClickedIndex(index);
    } else {
      // Single select
      setSelectedIndices(new Set([index]));
      setLastClickedIndex(index);
    }

    // Seek video to frame timestamp
    onSeek(frame.startTime);
  };

  // Bulk Selection Commands
  const handleSelectAll = () => {
    const all = new Set<number>();
    frames.forEach((f) => all.add(f.index));
    setSelectedIndices(all);
  };

  const handleInvertSelection = () => {
    const inverted = new Set<number>();
    frames.forEach((f) => {
      if (!selectedIndices.has(f.index)) {
        inverted.add(f.index);
      }
    });
    setSelectedIndices(inverted);
  };

  const handleClearSelection = () => {
    setSelectedIndices(new Set());
    setLastClickedIndex(null);
  };

  const handleSelectFromStartToCurrent = () => {
    const updated = new Set(selectedIndices);
    for (let i = 0; i <= currentFrameIndex; i++) {
      updated.add(i);
    }
    setSelectedIndices(updated);
  };

  const handleSelectFromCurrentToEnd = () => {
    const updated = new Set(selectedIndices);
    for (let i = currentFrameIndex; i < frames.length; i++) {
      updated.add(i);
    }
    setSelectedIndices(updated);
  };

  const handleSelectAlternateFrames = () => {
    // Select every 2nd frame (odd indices)
    const updated = new Set<number>();
    frames.forEach((f, idx) => {
      if (idx % 2 === 1) updated.add(f.index);
    });
    setSelectedIndices(updated);
  };

  // Deletion / Frame Removal Logic
  const handleDeleteSelectedFrames = () => {
    if (selectedIndices.size === 0) return;

    // Filter out frames that are selected for deletion
    const keptFrames = frames.filter((f) => !selectedIndices.has(f.index));

    if (keptFrames.length === 0) {
      alert('Cannot delete all frames. At least one frame must remain.');
      return;
    }

    // Group contiguous kept frames into segments
    const newSegments: VideoSegment[] = [];
    let segStart = keptFrames[0].startTime;
    let segEnd = keptFrames[0].endTime;

    for (let i = 1; i < keptFrames.length; i++) {
      const prevFrame = keptFrames[i - 1];
      const currFrame = keptFrames[i];

      // If frames are contiguous in source video time
      if (Math.abs(currFrame.startTime - prevFrame.endTime) < 0.02) {
        segEnd = currFrame.endTime;
      } else {
        // Break in sequence -> finish current segment and start next
        newSegments.push({
          id: `seg_${newSegments.length}_${Date.now()}`,
          startTime: segStart,
          endTime: segEnd,
          speed: 1.0,
        });
        segStart = currFrame.startTime;
        segEnd = currFrame.endTime;
      }
    }

    // Push the final segment
    newSegments.push({
      id: `seg_${newSegments.length}_${Date.now()}`,
      startTime: segStart,
      endTime: segEnd,
      speed: 1.0,
    });

    onUpdateSegments(newSegments);
    setSelectedIndices(new Set());
    setLastClickedIndex(null);

    // Seek to first kept frame
    if (keptFrames.length > 0) {
      onSeek(keptFrames[0].startTime);
    }
  };

  // Keyboard navigation & delete hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if focus is on an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((document.activeElement?.tagName || ''))) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIndices.size > 0) {
          e.preventDefault();
          handleDeleteSelectedFrames();
        }
      } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSelectAll();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClearSelection();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIdx = Math.min(frames.length - 1, currentFrameIndex + 1);
        onSeek(frames[nextIdx].startTime);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIdx = Math.max(0, currentFrameIndex - 1);
        onSeek(frames[prevIdx].startTime);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndices, currentFrameIndex, frames]);

  // Frame Card Dimensions scaled by zoomPercent
  const scale = zoomPercent / 68;
  const cardWidth = Math.round(96 * scale);
  const cardHeight = Math.round(54 * scale);

  const selectedCount = selectedIndices.size;
  const unselectedCount = frames.length - selectedCount;

  return (
    <div className="bg-[#0b101d] border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl flex flex-col select-none text-slate-200">
      {/* Top Action Ribbon / Bulk Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#0e1628] border-b border-slate-800/80 gap-2 text-xs">
        {/* Left: Quick Select Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-slate-300 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Frame Slides:</span>
          </span>

          <button
            onClick={handleSelectAll}
            className="px-2.5 py-1 rounded-lg bg-[#141e34] hover:bg-slate-700 text-slate-300 font-medium transition-all flex items-center gap-1 border border-slate-700/60"
            title="Select all frames (Ctrl+A)"
          >
            <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
            <span>Select All</span>
          </button>

          <button
            onClick={handleInvertSelection}
            className="px-2.5 py-1 rounded-lg bg-[#141e34] hover:bg-slate-700 text-slate-300 font-medium transition-all flex items-center gap-1 border border-slate-700/60"
            title="Invert frame selection"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
            <span>Invert</span>
          </button>

          {selectedCount > 0 && (
            <button
              onClick={handleClearSelection}
              className="px-2.5 py-1 rounded-lg bg-[#141e34] hover:bg-slate-700 text-slate-300 font-medium transition-all flex items-center gap-1 border border-slate-700/60"
              title="Clear selection (Esc)"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
              <span>Deselect ({selectedCount})</span>
            </button>
          )}

          {/* Quick Select Range Presets */}
          <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

          <button
            onClick={handleSelectFromStartToCurrent}
            className="px-2 py-1 rounded-lg bg-[#141e34]/70 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] transition-all hidden md:flex items-center gap-1"
            title="Select all frames from 0 to playhead"
          >
            <span>Start → Playhead</span>
          </button>

          <button
            onClick={handleSelectFromCurrentToEnd}
            className="px-2 py-1 rounded-lg bg-[#141e34]/70 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] transition-all hidden md:flex items-center gap-1"
            title="Select all frames from playhead to end"
          >
            <span>Playhead → End</span>
          </button>

          <button
            onClick={handleSelectAlternateFrames}
            className="px-2 py-1 rounded-lg bg-[#141e34]/70 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] transition-all hidden lg:flex items-center gap-1"
            title="Select every 2nd frame (reduce frame rate by 50%)"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Every 2nd Frame</span>
          </button>
        </div>

        {/* Right: Delete Actions & FPS Density Switcher */}
        <div className="flex items-center gap-2">
          {/* Sampling Density / FPS */}
          <div className="flex items-center gap-1 bg-[#141e34] px-2 py-0.5 rounded-lg border border-slate-700/60 text-[11px]">
            <Clock className="w-3 h-3 text-sky-400" />
            <span className="text-slate-400">FPS:</span>
            <select
              value={fps}
              onChange={(e) => {
                setFps(Number(e.target.value));
                setThumbnails(new Map());
              }}
              className="bg-transparent text-sky-300 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              <option value={10} className="bg-slate-900 text-slate-200">10 fps (100ms)</option>
              <option value={15} className="bg-slate-900 text-slate-200">15 fps (66ms - Default)</option>
              <option value={20} className="bg-slate-900 text-slate-200">20 fps (50ms)</option>
              <option value={30} className="bg-slate-900 text-slate-200">30 fps (33ms)</option>
            </select>
          </div>

          {/* Delete Action Button */}
          <button
            onClick={handleDeleteSelectedFrames}
            disabled={selectedCount === 0}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-md ${
              selectedCount > 0
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 active:scale-95 cursor-pointer animate-pulse'
                : 'bg-slate-800/80 text-slate-500 cursor-not-allowed'
            }`}
            title="Delete selected frames (Delete key)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected {selectedCount > 0 ? `(${selectedCount})` : ''}</span>
          </button>
        </div>
      </div>

      {/* Frame Filmstrip Container (Scrollable Horizontal Strip like ScreenToGif) */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-hidden p-3 bg-[#080c16] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-950 flex items-stretch gap-2.5 min-h-[125px] relative"
        style={{ scrollBehavior: 'auto' }}
      >
        {frames.map((frame) => {
          const isSelected = selectedIndices.has(frame.index);
          const isCurrentPlayhead = frame.index === currentFrameIndex;
          const thumbUrl = thumbnails.get(frame.startTime.toFixed(3));

          return (
            <div
              key={`${frame.index}_${frame.startTime}`}
              onClick={(e) => handleFrameClick(e, frame.index)}
              style={{ width: `${cardWidth}px` }}
              className={`shrink-0 flex flex-col rounded-lg transition-all cursor-pointer select-none group relative ${
                isSelected
                  ? 'ring-2 ring-sky-400 bg-sky-950/40 border-2 border-dashed border-sky-400 shadow-lg shadow-sky-500/20'
                  : isCurrentPlayhead
                  ? 'ring-2 ring-amber-400 bg-amber-950/20 border border-amber-400/80'
                  : 'border border-slate-800 bg-[#0d1424] hover:border-slate-600 hover:bg-slate-800/60'
              }`}
              title={`Frame #${frame.index} | Time: ${frame.startTime.toFixed(3)}s | Duration: ${frame.durationMs}ms ${
                isSelected ? '(Selected)' : ''
              }`}
            >
              {/* Playhead Marker Tag */}
              {isCurrentPlayhead && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-tight shadow-md z-10 flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-950 animate-ping" />
                  <span>NOW</span>
                </div>
              )}

              {/* Selection Checkmark Badge */}
              {isSelected && (
                <div className="absolute top-1 right-1 bg-sky-500 text-white rounded-full p-0.5 shadow-md z-10">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}

              {/* Thumbnail Container */}
              <div
                style={{ height: `${cardHeight}px` }}
                className="w-full bg-[#05070e] rounded-t-md overflow-hidden relative flex items-center justify-center"
              >
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={`Frame ${frame.index}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[10px] text-slate-500 animate-pulse">
                    <span className="font-mono">#{frame.index}</span>
                  </div>
                )}
              </div>

              {/* Frame Footer (Index + Milliseconds Duration matching ScreenToGif) */}
              <div className="px-1.5 py-1 flex items-center justify-between text-[10px] font-mono border-t border-slate-800/60 bg-[#0a0f1d] rounded-b-md">
                <span className={`font-bold ${isSelected ? 'text-sky-300' : isCurrentPlayhead ? 'text-amber-300' : 'text-slate-300'}`}>
                  {frame.index}
                </span>
                <span className={`text-[9px] ${isSelected ? 'text-sky-400 font-semibold' : 'text-slate-400'}`}>
                  {frame.durationMs} ms
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ScreenToGif-Style Status & Navigation Footer */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0c1220] border-t border-slate-800/90 text-xs font-mono">
        {/* Left: Scroll Jump & Info */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollBy({ left: -250, behavior: 'smooth' });
              }
            }}
            className="p-1 rounded bg-[#131b2d] hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/60"
            title="Scroll Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Frame: <strong className="text-slate-200">{currentFrameIndex}</strong> / {frames.length - 1} ({currentTime.toFixed(2)}s)
          </span>
        </div>

        {/* Right: Zoom Slider, ScreenToGif Color Badges, Frame Step Controls */}
        <div className="flex items-center gap-3">
          {/* Zoom Slider (68% like screenshot) */}
          <div className="flex items-center gap-1.5 bg-[#131b2d] px-2.5 py-1 rounded-lg border border-slate-700/60">
            <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="range"
              min={40}
              max={150}
              value={zoomPercent}
              onChange={(e) => setZoomPercent(Number(e.target.value))}
              className="w-16 sm:w-20 accent-sky-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              title="Adjust frame slide thumbnail scale"
            />
            <span className="text-[11px] font-bold text-slate-300 min-w-[32px] text-right">{zoomPercent} %</span>
          </div>

          {/* ScreenToGif Colored Statistics Badges: Green Total, Red Selected, Blue Unselected */}
          <div className="flex items-center gap-2 font-bold text-xs bg-[#080c16] px-2.5 py-1 rounded-lg border border-slate-800">
            {/* Total Frames in Green (like 3415 in screenshot) */}
            <span className="text-emerald-400" title="Total Frame Count">
              {frames.length}
            </span>
            {/* Selected Frames in Red / Rose (like 1 in screenshot) */}
            <span className="text-rose-400" title="Selected Frames for Deletion">
              {selectedCount}
            </span>
            {/* Unselected Frames in Blue / Cyan (like 0 in screenshot) */}
            <span className="text-sky-400" title="Unselected Frames">
              {unselectedCount}
            </span>
          </div>

          {/* Frame Step Navigation Controls (|<<  <|  |>  |>  >>|) */}
          <div className="flex items-center gap-0.5 bg-[#131b2d] p-0.5 rounded-lg border border-slate-700/60">
            <button
              onClick={() => onSeek(0)}
              className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-all"
              title="First Frame (|<<)"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                const prev = Math.max(0, currentFrameIndex - 1);
                onSeek(frames[prev].startTime);
              }}
              className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-all"
              title="Previous Frame (<|)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onPlayPause}
              className="p-1 px-1.5 rounded bg-sky-500 hover:bg-sky-400 text-white font-bold transition-all shadow-sm"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            </button>

            <button
              onClick={() => {
                const next = Math.min(frames.length - 1, currentFrameIndex + 1);
                onSeek(frames[next].startTime);
              }}
              className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-all"
              title="Next Frame (|>)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onSeek(frames[frames.length - 1].startTime)}
              className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-all"
              title="Last Frame (>>|)"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => {
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollBy({ left: 250, behavior: 'smooth' });
              }
            }}
            className="p-1 rounded bg-[#131b2d] hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/60"
            title="Scroll Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
