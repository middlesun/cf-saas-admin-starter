import React, { useRef, useState } from 'react';
import { Project } from '../../types';
import { Play, Pause, Scissors, Trash2, ZoomIn, ZoomOut, MousePointerClick, MessageSquare, Layers, Music, Video, Sparkles, Plus, Search } from 'lucide-react';

interface TimelineProps {
  project: Project;
  currentTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  selectedAnnotationId?: string | null;
  selectedClickId?: string | null;
  selectedTransitionId?: string | null;
  selectedZoomId?: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onSelectClick: (id: string | null) => void;
  onSelectTransition: (id: string | null) => void;
  onSelectZoom?: (id: string | null) => void;
  onSplitSegmentAtPlayhead: () => void;
  onDeleteSelectedItem: () => void;
  onOpenSlideModal?: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  project,
  currentTime,
  isPlaying,
  onPlayPause,
  onSeek,
  selectedAnnotationId,
  selectedClickId,
  selectedTransitionId,
  selectedZoomId,
  onSelectAnnotation,
  onSelectClick,
  onSelectTransition,
  onSelectZoom,
  onSplitSegmentAtPlayhead,
  onDeleteSelectedItem,
  onOpenSlideModal,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1x to 3x

  const totalDuration = Math.max(1, project.duration);

  // Convert timeline timestamp to X percentage offset
  const getPercent = (time: number) => Math.min(100, Math.max(0, (time / totalDuration) * 100));

  // Handle click on timeline track to seek playhead
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(percent * totalDuration);
  };

  return (
    <div className="bg-[#0d1322] border border-slate-800/80 rounded-2xl p-3.5 space-y-3 flex flex-col shadow-2xl select-none">
      {/* Timeline Controls Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <button
            onClick={onPlayPause}
            className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/20 active:scale-95"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={onSplitSegmentAtPlayhead}
            className="px-3 py-1.5 rounded-xl bg-[#131b2e] hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Split video segment at playhead"
          >
            <Scissors className="w-3.5 h-3.5 text-sky-400" />
            <span>Split</span>
          </button>

          {onOpenSlideModal && (
            <button
              onClick={onOpenSlideModal}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-500/20"
              title="Add pre-designed Intro or Outro slide template"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Intro / Outro Slide</span>
            </button>
          )}

          <button
            onClick={onDeleteSelectedItem}
            className="px-3 py-1.5 rounded-xl bg-[#131b2e] hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700/80 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Delete selected element"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>

        {/* Time Code & Timeline Zoom Controls */}
        <div className="flex items-center gap-3">
          <div className="font-mono text-xs font-bold text-sky-400 px-3 py-1 rounded-lg bg-[#090d18] border border-slate-800/80">
            {formatSeconds(currentTime)} / {formatSeconds(totalDuration)}
          </div>

          <div className="flex items-center gap-1 bg-[#131b2e] border border-slate-700/80 rounded-xl p-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
              className="p-1.5 text-slate-400 hover:text-slate-100 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] font-mono text-slate-300 px-1 font-semibold">{Math.round(zoomLevel * 100)}%</span>

            <button
              onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
              className="p-1.5 text-slate-400 hover:text-slate-100 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 text-slate-400 hover:text-slate-100 transition-colors"
              title="Fit timeline"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Track Grid with Left Track Sidebar */}
      <div className="flex w-full gap-2">
        {/* Track Sidebar Labels Column */}
        <div className="w-28 shrink-0 space-y-2 pt-8 text-[11px] font-bold text-slate-400 select-none">
          <div className="h-10 px-2.5 rounded-lg bg-[#111728] border border-slate-800/80 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-200">
              <Video className="w-3.5 h-3.5 text-sky-400" />
              <span>Segments</span>
            </span>
          </div>

          <div className="h-8 px-2.5 rounded-lg bg-[#111728] border border-slate-800/80 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Zoom</span>
            </span>
          </div>

          <div className="h-8 px-2.5 rounded-lg bg-[#111728] border border-slate-800/80 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sky-300">
              <MousePointerClick className="w-3.5 h-3.5 text-sky-400" />
              <span>Clicks</span>
            </span>
          </div>

          <div className="h-8 px-2.5 rounded-lg bg-[#111728] border border-slate-800/80 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-blue-300">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>Callouts</span>
            </span>
          </div>

          <div className="h-8 px-2.5 rounded-lg bg-[#111728] border border-slate-800/80 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Transitions</span>
            </span>
          </div>

          <div className="h-9 px-2.5 rounded-lg bg-[#111728] border border-slate-800/80 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <Music className="w-3.5 h-3.5 text-emerald-400" />
              <span>Audio</span>
            </span>
          </div>
        </div>

        {/* Timeline Tracks Right Scroll Area */}
        <div className="flex-1 overflow-x-auto pb-1 custom-scrollbar">
          <div
            ref={timelineRef}
            onClick={handleTimelineClick}
            style={{ width: `${100 * zoomLevel}%` }}
            className="relative min-w-full space-y-2 cursor-pointer group"
          >
            {/* Time Ruler Bar */}
            <div className="h-6 relative bg-[#090d18] rounded-lg border border-slate-800/80 text-[10px] font-mono text-slate-500 flex items-center px-2 pointer-events-none">
              {Array.from({ length: 11 }).map((_, i) => {
                const sec = (i / 10) * totalDuration;
                return (
                  <div key={i} className="absolute -translate-x-1/2" style={{ left: `${i * 10}%` }}>
                    {formatSeconds(sec)}
                  </div>
                );
              })}
            </div>

            {/* Track 1: Video Segments Track */}
            <div className="h-10 relative bg-[#090d18]/80 rounded-xl border border-slate-800/80 p-1 flex items-center">
              {project.videoSegments.map((seg, idx) => {
                const segStartPct = getPercent(seg.startTime);
                const segEndPct = getPercent(seg.endTime);
                const widthPct = Math.max(2, segEndPct - segStartPct);

                return (
                  <React.Fragment key={seg.id}>
                    <div
                      style={{ left: `${segStartPct}%`, width: `${widthPct}%` }}
                      className="absolute h-8 rounded-lg bg-gradient-to-r from-sky-600/30 to-indigo-600/30 border border-sky-500/50 flex items-center justify-between px-2.5 text-xs font-semibold text-slate-100 truncate shadow-sm"
                    >
                      <span className="truncate text-[11px]">
                        {idx === 0 ? 'Intro Slide' : 'Screen Recording'}
                      </span>
                      <span className="text-[10px] text-sky-300/80 font-mono">
                        {(seg.endTime - seg.startTime).toFixed(1)}s
                      </span>
                    </div>

                    {/* Transition Join Handle between segments */}
                    {idx < project.videoSegments.length - 1 && (
                      <div
                        style={{ left: `${segEndPct}%` }}
                        className="absolute z-20 -translate-x-1/2 w-4 h-6 rounded bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold shadow-md cursor-pointer hover:scale-110 transition-transform"
                        title="Transition join"
                      >
                        ⋈
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Track 2: Dynamic Zoom Track */}
            <div className="h-8 relative bg-[#090d18]/80 rounded-xl border border-slate-800/80 p-1 flex items-center">
              {(project.zoomEvents || []).map((zoom) => {
                const startPct = getPercent(zoom.timestamp);
                const widthPct = Math.max(3, (zoom.duration / totalDuration) * 100);
                const isSelected = zoom.id === selectedZoomId;

                return (
                  <div
                    key={zoom.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectZoom) onSelectZoom(zoom.id);
                    }}
                    style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                    className={`absolute h-6 rounded-lg border px-2 flex items-center text-[10px] font-semibold cursor-pointer transition-all truncate ${
                      zoom.disabled
                        ? 'bg-slate-800/50 text-slate-500 border-slate-700/50 line-through'
                        : isSelected
                        ? 'bg-amber-500 text-slate-950 border-white shadow-lg ring-2 ring-amber-400/50 z-20'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    }`}
                    title={`${zoom.label || 'Zoom'} (${zoom.zoomLevel.toFixed(1)}x)`}
                  >
                    <span className="truncate font-mono">
                      [{zoom.zoomLevel.toFixed(1)}x] {zoom.isAuto ? 'Auto Zoom' : 'Zoom'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Track 3: Click Animations Track */}
            <div className="h-8 relative bg-[#090d18]/80 rounded-xl border border-slate-800/80 p-1 flex items-center">
              {project.clickAnimations.map((click) => {
                const pct = getPercent(click.timestamp);
                const isSelected = click.id === selectedClickId;

                return (
                  <div
                    key={click.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClick(click.id);
                    }}
                    style={{ left: `${pct}%` }}
                    className={`absolute -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-400 text-slate-950 ring-4 ring-sky-500/40 z-20 scale-125'
                        : 'bg-sky-500 text-white hover:bg-sky-400'
                    }`}
                    title={`Click effect at ${formatSeconds(click.timestamp)} (${click.style})`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                );
              })}
            </div>

            {/* Track 4: Text Callout Annotations Track */}
            <div className="h-8 relative bg-[#090d18]/80 rounded-xl border border-slate-800/80 p-1 flex items-center">
              {project.annotations.map((ann) => {
                const startPct = getPercent(ann.startTime);
                const widthPct = Math.max(3, (ann.duration / totalDuration) * 100);
                const isSelected = ann.id === selectedAnnotationId;

                return (
                  <div
                    key={ann.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAnnotation(ann.id);
                    }}
                    style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                    className={`absolute h-6 rounded-lg border px-2 flex items-center text-[10px] font-medium cursor-pointer transition-all truncate ${
                      isSelected
                        ? 'bg-blue-500 text-white border-white shadow-lg ring-2 ring-blue-400/50 z-20'
                        : 'bg-blue-600/30 text-blue-200 border-blue-500/40 hover:bg-blue-600/50'
                    }`}
                    title={ann.text}
                  >
                    <span className="truncate">{ann.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Track 5: Title Transitions Track */}
            <div className="h-8 relative bg-[#090d18]/80 rounded-xl border border-slate-800/80 p-1 flex items-center">
              {project.transitions.map((tr) => {
                const startPct = getPercent(tr.timestamp);
                const widthPct = Math.max(3, (tr.duration / totalDuration) * 100);
                const isSelected = tr.id === selectedTransitionId;

                return (
                  <div
                    key={tr.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTransition(tr.id);
                    }}
                    style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                    className={`absolute h-6 rounded-lg border px-2 flex items-center text-[10px] font-medium cursor-pointer transition-all truncate ${
                      isSelected
                        ? 'bg-indigo-500 text-white border-white shadow-lg ring-2 ring-indigo-400/50 z-20'
                        : 'bg-indigo-600/30 text-indigo-200 border-indigo-500/40 hover:bg-indigo-600/50'
                    }`}
                    title={tr.title}
                  >
                    <span className="truncate">{tr.title}</span>
                  </div>
                );
              })}
            </div>

            {/* Track 6: Background Audio Track */}
            <div className="h-9 relative bg-[#090d18]/80 rounded-xl border border-slate-800/80 p-1 flex items-center overflow-hidden">
              {project.audioTracks.length > 0 ? (
                project.audioTracks.map((aud) => (
                  <div
                    key={aud.id}
                    style={{ left: '0%', width: '100%' }}
                    className="absolute h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 flex items-center justify-between text-xs text-emerald-300 font-medium"
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <Music className="w-3 h-3 text-emerald-400" />
                      {aud.name}
                    </span>
                    <span className="text-[10px] text-emerald-400/80 font-mono">
                      {project.duration.toFixed(1)}s
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-[10px] text-slate-600 font-medium px-2 italic">
                  No background audio track added
                </div>
              )}
            </div>

            {/* Interactive Playhead Needle */}
            <div
              style={{ left: `${getPercent(currentTime)}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-sky-400 z-30 pointer-events-none transition-all duration-75"
            >
              <div className="px-1.5 py-0.5 bg-sky-500 text-slate-950 font-mono font-extrabold text-[9px] rounded -translate-x-1/2 -top-2.5 absolute shadow-md shadow-sky-500/50">
                {formatSeconds(currentTime)}
              </div>
            </div>
          </div>
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
