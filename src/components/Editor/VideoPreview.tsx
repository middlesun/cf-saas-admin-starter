import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Project, TextAnnotation, ClickAnimation, TransitionCard } from '../../types';
import { renderClickAnimation, renderAnnotation, renderTransitionCardFrame, ExportOptions } from '../../lib/videoExporter';
import { calculateZoomTransformAtTime } from '../../lib/zoomSystem';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  MousePointerClick,
  MessageSquarePlus,
  Sparkles,
  Tv2,
  Download,
  ChevronDown,
  Film,
  FileImage,
  Settings2,
  SkipBack,
} from 'lucide-react';

interface VideoPreviewProps {
  project: Project;
  currentTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  selectedAnnotationId?: string | null;
  selectedClickId?: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onSelectClick: (id: string | null) => void;
  onUpdateAnnotationPosition: (id: string, x: number, y: number) => void;
  onAddClickAtPosition: (x: number, y: number) => void;
  onAddAnnotationAtPosition: (x: number, y: number) => void;
  playbackSpeed: number;
  onChangePlaybackSpeed: (speed: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  layoutViewMode?: 'standard' | 'widescreen';
  onChangeLayoutViewMode?: (mode: 'standard' | 'widescreen') => void;
  onTriggerExport?: (options?: ExportOptions) => void;
  onOpenExportModal?: (options?: ExportOptions) => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  project,
  currentTime,
  isPlaying,
  onPlayPause,
  onSeek,
  selectedAnnotationId,
  selectedClickId,
  onSelectAnnotation,
  onSelectClick,
  onUpdateAnnotationPosition,
  onAddClickAtPosition,
  onAddAnnotationAtPosition,
  playbackSpeed,
  onChangePlaybackSpeed,
  videoRef,
  layoutViewMode = 'standard',
  onChangeLayoutViewMode,
  onTriggerExport,
  onOpenExportModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineTrackRef = useRef<HTMLDivElement>(null);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDraggingAnnotation, setIsDraggingAnnotation] = useState<boolean>(false);
  const [addMode, setAddMode] = useState<'none' | 'click' | 'annotation'>('none');

  // Timeline Scrubbing & Hover States
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPositionPercent, setHoverPositionPercent] = useState<number | null>(null);

  const duration = Math.max(project.duration || 1, 0.1);
  const progressPercent = Math.min(100, Math.max(0, (currentTime / duration) * 100));

  // Calculate live Zoom Transformation at currentTime
  const zoomTransform = calculateZoomTransformAtTime(project.zoomEvents || [], currentTime);

  // Sync video currentTime & playback speed
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = playbackSpeed;

    if (Math.abs(video.currentTime - currentTime) > 0.2) {
      video.currentTime = currentTime;
    }

    if (isPlaying && video.paused) {
      video.play().catch((err) => console.warn('Video play error:', err));
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [currentTime, isPlaying, playbackSpeed, videoRef]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const width = 1280;
    const height = 720;
    canvas.width = width;
    canvas.height = height;

    let animId: number;

    const drawOverlays = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Check if current time is inside a Transition Card
      const activeTransition = project.transitions.find(
        (tr) => currentTime >= tr.timestamp && currentTime < tr.timestamp + tr.duration
      );

      if (activeTransition) {
        renderTransitionCardFrame(ctx, width, height, activeTransition, currentTime - activeTransition.timestamp);
      } else {
        // 2. Draw active Click Animations
        project.clickAnimations.forEach((click) => {
          if (currentTime >= click.timestamp && currentTime <= click.timestamp + click.duration) {
            renderClickAnimation(ctx, width, height, click, currentTime - click.timestamp);
          }

          // Draw selection outline if selected
          if (click.id === selectedClickId) {
            const px = (click.x / 100) * width;
            const py = (click.y / 100) * height;
            ctx.save();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(px, py, (click.size || 40) + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        });

        // 3. Draw active Text Annotations
        project.annotations.forEach((ann) => {
          if (currentTime >= ann.startTime && currentTime <= ann.startTime + ann.duration) {
            renderAnnotation(ctx, width, height, ann, currentTime - ann.startTime);
          }

          // Draw bounding box if selected
          if (ann.id === selectedAnnotationId) {
            const px = (ann.x / 100) * width;
            const py = (ann.y / 100) * height;
            ctx.save();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.roundRect(px - 10, py - 10, 240, 80, 8);
            ctx.stroke();

            // Handle points
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px - 10, py - 10, 5, 0, Math.PI * 2);
            ctx.arc(px + 230, py + 70, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }
        });
      }

      animId = requestAnimationFrame(drawOverlays);
    };

    drawOverlays();
    return () => cancelAnimationFrame(animId);
  }, [currentTime, project, selectedAnnotationId, selectedClickId]);

  // Handle canvas click / drag positioning / Click-to-Play-Pause
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    if (addMode === 'click') {
      onAddClickAtPosition(xPercent, yPercent);
      setAddMode('none');
      return;
    }

    if (addMode === 'annotation') {
      onAddAnnotationAtPosition(xPercent, yPercent);
      setAddMode('none');
      return;
    }

    // Check if clicked near an existing annotation to select or drag
    const clickedAnn = project.annotations.find(
      (a) => Math.abs(a.x - xPercent) < 15 && Math.abs(a.y - yPercent) < 15
    );

    if (clickedAnn) {
      onSelectAnnotation(clickedAnn.id);
      setIsDraggingAnnotation(true);
      return;
    }

    // Check if clicked near an existing click animation
    const clickedClk = project.clickAnimations.find(
      (c) => Math.abs(c.x - xPercent) < 10 && Math.abs(c.y - yPercent) < 10
    );

    if (clickedClk) {
      onSelectClick(clickedClk.id);
      return;
    }

    // If clicking on empty canvas space, deselect and toggle Play/Pause
    onSelectAnnotation(null);
    onSelectClick(null);
    onPlayPause();
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingAnnotation || !selectedAnnotationId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    onUpdateAnnotationPosition(selectedAnnotationId, xPercent, yPercent);
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingAnnotation(false);
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  // Timeline Seeking & Dragging Logic
  const calculateTimelineTimeFromEvent = useCallback(
    (clientX: number) => {
      if (!timelineTrackRef.current) return 0;
      const rect = timelineTrackRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return pos * duration;
    },
    [duration]
  );

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsScrubbing(true);
    const newTime = calculateTimelineTimeFromEvent(e.clientX);
    onSeek(newTime);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const scrubTime = calculateTimelineTimeFromEvent(moveEvent.clientX);
      onSeek(scrubTime);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineTrackRef.current) return;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPositionPercent(pos * 100);
    setHoverTime(pos * duration);
  };

  const handleTimelineMouseLeave = () => {
    if (!isScrubbing) {
      setHoverTime(null);
      setHoverPositionPercent(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Top Quick Tools Bar */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Quick Add on Canvas:</span>

          <button
            type="button"
            onClick={() => setAddMode(addMode === 'click' ? 'none' : 'click')}
            className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              addMode === 'click'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <MousePointerClick className="w-3.5 h-3.5" />
            <span>{addMode === 'click' ? 'Click on Canvas to Add' : 'Click Effect'}</span>
          </button>

          <button
            type="button"
            onClick={() => setAddMode(addMode === 'annotation' ? 'none' : 'annotation')}
            className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              addMode === 'annotation'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>{addMode === 'annotation' ? 'Click on Canvas to Add' : 'Text Callout'}</span>
          </button>
        </div>

        {/* Top-Right: Speed Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <span>Speed:</span>
            {[1.0, 1.25, 1.5, 2.0].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChangePlaybackSpeed(s)}
                className={`px-2 py-0.5 rounded text-xs font-mono font-semibold transition-all ${
                  playbackSpeed === s ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Preview Screen */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden group select-none"
      >
        <div
          className="relative w-full h-full flex items-center justify-center overflow-hidden"
          style={{
            transform: `scale(${zoomTransform.scale})`,
            transformOrigin: `${zoomTransform.x}% ${zoomTransform.y}%`,
            transition: 'transform 0.08s ease-out',
          }}
        >
          {/* HTML5 Source Video Element */}
          {project.sourceVideoBlobUrl ? (
            <video
              ref={videoRef}
              src={project.sourceVideoBlobUrl}
              className="w-full h-full object-contain pointer-events-none"
              muted={isMuted}
              playsInline
            />
          ) : (
            <div className="text-slate-500 text-sm font-medium">No source video loaded</div>
          )}

          {/* Overlay Canvas for Real-time Animations & Interactive Dragging */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className={`absolute inset-0 w-full h-full object-contain ${
              addMode !== 'none' ? 'cursor-crosshair' : isDraggingAnnotation ? 'cursor-grabbing' : 'cursor-pointer'
            }`}
          />
        </div>

        {/* Center Play/Pause Button Overlay */}
        {!isPlaying && addMode === 'none' && !isDraggingAnnotation && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onPlayPause();
            }}
            className="absolute inset-0 flex items-center justify-center cursor-pointer bg-slate-950/25 backdrop-blur-[1px] transition-all group/playoverlay"
          >
            <button
              type="button"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-sky-500/90 hover:bg-sky-400 text-white flex items-center justify-center shadow-2xl shadow-sky-500/40 backdrop-blur-md transform transition-all duration-200 hover:scale-110 active:scale-95 group-hover/playoverlay:scale-110"
              title="Click to Play"
            >
              <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-white ml-1 text-white" />
            </button>
          </div>
        )}

        {/* Active Zoom Indicator Badge */}
        {zoomTransform.activeZoom && zoomTransform.scale > 1.01 && (
          <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md pointer-events-none animate-in fade-in duration-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{zoomTransform.scale.toFixed(2)}x Zoom Active ({zoomTransform.activeZoom.isAuto ? 'Auto' : 'Manual'})</span>
          </div>
        )}

        {/* Floating Add Mode Badge */}
        {addMode !== 'none' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-sky-500 text-white text-xs font-semibold shadow-xl animate-bounce flex items-center gap-2 pointer-events-none">
            <MousePointerClick className="w-4 h-4" />
            <span>Click anywhere on the preview video to place a {addMode}</span>
          </div>
        )}
      </div>

      {/* Interactive Video Progress Bar / Timeline */}
      <div className="px-4 pt-2.5 pb-1 bg-slate-900/95 border-t border-slate-800/80 select-none">
        <div
          ref={timelineTrackRef}
          onMouseDown={handleTimelineMouseDown}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
          className="relative h-2.5 bg-slate-800/90 hover:bg-slate-800 rounded-full cursor-pointer group/timeline transition-all"
        >
          {/* Hover Time Tooltip & Indicator */}
          {hoverPositionPercent !== null && hoverTime !== null && (
            <>
              <div
                style={{ left: `${hoverPositionPercent}%` }}
                className="absolute top-0 bottom-0 w-0.5 bg-white/40 pointer-events-none"
              />
              <div
                style={{ left: `${hoverPositionPercent}%` }}
                className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-200 font-bold pointer-events-none shadow-xl whitespace-nowrap z-30"
              >
                {formatSeconds(hoverTime)}
              </div>
            </>
          )}

          {/* Played Progress Fill */}
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-blue-500 relative transition-all duration-75 shadow-sm shadow-sky-500/30"
          >
            {/* Scrubber Knob */}
            <div
              className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg ring-2 ring-sky-500 transition-transform duration-150 ${
                isScrubbing ? 'scale-125' : 'scale-0 group-hover/timeline:scale-100'
              }`}
            />
          </div>
        </div>

        {/* Progress Bar Subtitle info */}
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-1 px-0.5">
          <span>{formatSeconds(currentTime)}</span>
          <span className="text-slate-500">
            {duration > 0 ? `${progressPercent.toFixed(0)}% played` : ''}
          </span>
          <span>{formatSeconds(duration)}</span>
        </div>
      </div>

      {/* Bottom Video Controls Bar */}
      <div className="px-5 py-2.5 bg-slate-900 flex items-center justify-between">
        {/* Left Play/Pause & Skip & Play from Beginning */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Play from Beginning Button */}
          <button
            type="button"
            onClick={() => {
              onSeek(0);
              if (!isPlaying) {
                onPlayPause();
              }
            }}
            className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-95 shadow-sm"
            title="Reset to 00:00 and start playback"
          >
            <SkipBack className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Play from beginning</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <button
            type="button"
            onClick={() => onSeek(Math.max(0, currentTime - 5))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
            title="Rewind 5s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onPlayPause}
            className="w-9 h-9 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 transition-all active:scale-95"
            title={isPlaying ? 'Pause (Click preview or space)' : 'Play (Click preview or space)'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSeek(Math.min(duration, currentTime + 5))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
            title="Forward 5s"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Time Counter */}
          <div className="font-mono text-xs text-slate-300 font-semibold px-2 py-1 rounded bg-slate-950 border border-slate-800 ml-1">
            {formatSeconds(currentTime)} / {formatSeconds(duration)}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {onChangeLayoutViewMode && (
            <button
              type="button"
              onClick={() => onChangeLayoutViewMode(layoutViewMode === 'widescreen' ? 'standard' : 'widescreen')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
                layoutViewMode === 'widescreen'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={layoutViewMode === 'widescreen' ? 'Switch to Standard View (Sidebar Chat)' : 'Switch to Widescreen View (Full-Width Video)'}
            >
              <Tv2 className="w-3.5 h-3.5" />
              <span>{layoutViewMode === 'widescreen' ? 'Standard View' : 'Widescreen View'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
            title="Fullscreen Preview"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
}
