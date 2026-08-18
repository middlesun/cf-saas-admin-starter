import React from 'react';
import { Project, VideoSegment } from '../../types';
import { Scissors, Trash2, Gauge, Play, RotateCcw, Clock, ArrowLeft, ArrowRight, Eye, Check } from 'lucide-react';

interface TrimPanelProps {
  project: Project;
  currentTime: number;
  onUpdateSegment: (updated: VideoSegment[]) => void;
  onSplitSegment: () => void;
  onDeleteSegment: (id: string) => void;
  onSeek?: (time: number) => void;
  onPlayPause?: () => void;
  isPlaying?: boolean;
}

export const TrimPanel: React.FC<TrimPanelProps> = ({
  project,
  currentTime,
  onUpdateSegment,
  onSplitSegment,
  onDeleteSegment,
  onSeek,
  onPlayPause,
  isPlaying,
}) => {
  const currentSegment = project.videoSegments[0]; // Active segment
  const totalDuration = Math.max(0.1, project.duration);

  if (!currentSegment) {
    return <div className="text-xs text-slate-400 p-4">No active video segment selected</div>;
  }

  const keptDuration = Math.max(0, currentSegment.endTime - currentSegment.startTime);
  const cutDuration = Math.max(0, totalDuration - keptDuration);
  const startPct = Math.min(100, Math.max(0, (currentSegment.startTime / totalDuration) * 100));
  const endPct = Math.min(100, Math.max(0, (currentSegment.endTime / totalDuration) * 100));
  const playheadPct = Math.min(100, Math.max(0, (currentTime / totalDuration) * 100));

  const updateStartTime = (newStart: number) => {
    const clamped = Math.max(0, Math.min(currentSegment.endTime - 0.5, parseFloat(newStart.toFixed(1))));
    const updated = project.videoSegments.map((s, i) => (i === 0 ? { ...s, startTime: clamped } : s));
    onUpdateSegment(updated);
    if (onSeek) onSeek(clamped);
  };

  const updateEndTime = (newEnd: number) => {
    const clamped = Math.min(totalDuration, Math.max(currentSegment.startTime + 0.5, parseFloat(newEnd.toFixed(1))));
    const updated = project.videoSegments.map((s, i) => (i === 0 ? { ...s, endTime: clamped } : s));
    onUpdateSegment(updated);
    if (onSeek) onSeek(clamped);
  };

  const handleResetTrim = () => {
    const updated = project.videoSegments.map((s, i) =>
      i === 0 ? { ...s, startTime: 0, endTime: project.duration || s.endTime } : s
    );
    onUpdateSegment(updated);
    if (onSeek) onSeek(0);
  };

  const handleSpeedChange = (speed: number) => {
    const updated = project.videoSegments.map((s) => ({ ...s, speed }));
    onUpdateSegment(updated);
  };

  const previewTrimmed = () => {
    if (onSeek) onSeek(currentSegment.startTime);
    if (onPlayPause && !isPlaying) onPlayPause();
  };

  return (
    <div className="space-y-4 p-1">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
          <Scissors className="w-4 h-4 text-sky-400" />
          <span>Trim & Clip Controls</span>
        </h3>
        <span className="text-xs text-slate-400">Point & trim unwanted portions easily</span>
      </div>

      {/* Visual Mini Timeline Trim Bar */}
      <div className="space-y-1.5 bg-[#090d18] p-3 rounded-xl border border-slate-800 shadow-inner">
        <div className="flex justify-between text-[11px] font-semibold">
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Interactive Trimming Timeline</span>
          </span>
          <span className="text-sky-300 font-mono">
            {currentSegment.startTime.toFixed(1)}s - {currentSegment.endTime.toFixed(1)}s ({keptDuration.toFixed(1)}s kept)
          </span>
        </div>

        {/* Visual Strip */}
        <div className="h-7 w-full bg-slate-900 rounded-lg overflow-hidden relative border border-slate-800 flex">
          {/* Left Trimmed (Removed) Zone */}
          {startPct > 0 && (
            <div
              style={{ width: `${startPct}%` }}
              className="h-full bg-rose-950/40 border-r border-rose-500/40 flex items-center justify-center text-[9px] text-rose-400 font-mono select-none"
              title={`Removed start (0.0s - ${currentSegment.startTime.toFixed(1)}s)`}
            >
              {startPct > 12 && <span>✂ Trimmed</span>}
            </div>
          )}

          {/* Active Kept Zone */}
          <div
            style={{ width: `${Math.max(2, endPct - startPct)}%` }}
            className="h-full bg-gradient-to-r from-sky-600/50 via-sky-500/40 to-blue-600/50 border-x border-sky-400/80 flex items-center justify-between px-2 text-[10px] text-white font-bold shadow-md select-none"
            title={`Kept segment (${currentSegment.startTime.toFixed(1)}s - ${currentSegment.endTime.toFixed(1)}s)`}
          >
            <span className="truncate text-[10px]">Kept Clip</span>
            <span className="font-mono text-[9px] text-sky-200">{keptDuration.toFixed(1)}s</span>
          </div>

          {/* Right Trimmed (Removed) Zone */}
          {endPct < 100 && (
            <div
              style={{ width: `${100 - endPct}%` }}
              className="h-full bg-rose-950/40 border-l border-rose-500/40 flex items-center justify-center text-[9px] text-rose-400 font-mono select-none"
              title={`Removed end (${currentSegment.endTime.toFixed(1)}s - ${totalDuration.toFixed(1)}s)`}
            >
              {(100 - endPct) > 12 && <span>✂ Trimmed</span>}
            </div>
          )}

          {/* Current Playhead indicator */}
          <div
            style={{ left: `${playheadPct}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 pointer-events-none"
          />
        </div>

        {/* Duration Meta Badges */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="bg-slate-900/80 px-2 py-1 rounded-md border border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 block">Original Duration</span>
            <span className="text-xs font-mono font-semibold text-slate-300">{totalDuration.toFixed(1)}s</span>
          </div>

          <div className="bg-sky-500/10 px-2 py-1 rounded-md border border-sky-500/30 text-center">
            <span className="text-[10px] text-sky-400 block">Kept Length</span>
            <span className="text-xs font-mono font-bold text-sky-300">{keptDuration.toFixed(1)}s</span>
          </div>

          <div className="bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/30 text-center">
            <span className="text-[10px] text-rose-400 block">Cut Removed</span>
            <span className="text-xs font-mono font-semibold text-rose-300">-{cutDuration.toFixed(1)}s</span>
          </div>
        </div>
      </div>

      {/* Start and End Trimming Precision Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Trim Beginning */}
        <div className="space-y-2 bg-[#090d18]/80 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
              <span>Trim Beginning</span>
            </span>
            <span className="text-sky-400 font-mono bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-500/30">
              {currentSegment.startTime.toFixed(1)}s
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(0.1, currentSegment.endTime - 0.5)}
            step={0.1}
            value={currentSegment.startTime}
            onChange={(e) => updateStartTime(parseFloat(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer"
          />

          {/* Precision Nudge & Set to Playhead */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              onClick={() => updateStartTime(currentSegment.startTime - 1)}
              className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono font-medium transition-colors"
              title="Step backward 1.0s"
            >
              -1.0s
            </button>
            <button
              onClick={() => updateStartTime(currentSegment.startTime - 0.1)}
              className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono font-medium transition-colors"
              title="Step backward 0.1s"
            >
              -0.1s
            </button>
            <button
              onClick={() => updateStartTime(currentSegment.startTime + 0.1)}
              className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono font-medium transition-colors"
              title="Step forward 0.1s"
            >
              +0.1s
            </button>
            <button
              onClick={() => updateStartTime(currentSegment.startTime + 1)}
              className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono font-medium transition-colors"
              title="Step forward 1.0s"
            >
              +1.0s
            </button>
          </div>

          <button
            onClick={() => updateStartTime(currentTime)}
            className="w-full py-1.5 rounded-lg bg-slate-800/80 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-slate-700/80 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Set Start to Playhead ({currentTime.toFixed(1)}s)</span>
          </button>
        </div>

        {/* Trim End */}
        <div className="space-y-2 bg-[#090d18]/80 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
              <span>Trim End</span>
            </span>
            <span className="text-sky-400 font-mono bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-500/30">
              {currentSegment.endTime.toFixed(1)}s
            </span>
          </div>

          <input
            type="range"
            min={currentSegment.startTime + 0.5}
            max={totalDuration}
            step={0.1}
            value={currentSegment.endTime}
            onChange={(e) => updateEndTime(parseFloat(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer"
          />

          {/* Precision Nudge & Set to Playhead */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              onClick={() => updateEndTime(currentSegment.endTime - 1)}
              className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono font-medium transition-colors"
              title="Step backward 1.0s"
            >
              -1.0s
            </button>
            <button
              onClick={() => updateEndTime(currentSegment.endTime - 0.1)}
              className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono font-medium transition-colors"
              title="Step backward 0.1s"
            >
              -0.1s
            </button>
            <button
              onClick={() => updateEndTime(currentSegment.endTime + 0.1)}
              className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono font-medium transition-colors"
              title="Step forward 0.1s"
            >
              +0.1s
            </button>
            <button
              onClick={() => updateEndTime(currentSegment.endTime + 1)}
              className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono font-medium transition-colors"
              title="Step forward 1.0s"
            >
              +1.0s
            </button>
          </div>

          <button
            onClick={() => updateEndTime(currentTime)}
            className="w-full py-1.5 rounded-lg bg-slate-800/80 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-slate-700/80 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Set End to Playhead ({currentTime.toFixed(1)}s)</span>
          </button>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <button
          onClick={previewTrimmed}
          className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-sky-500/20 active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>Preview Trimmed Clip</span>
        </button>

        <button
          onClick={onSplitSegment}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition-all"
        >
          <Scissors className="w-3.5 h-3.5 text-sky-400" />
          <span>Split Segment at ({currentTime.toFixed(1)}s)</span>
        </button>

        <button
          onClick={handleResetTrim}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset Trim Range</span>
        </button>

        {project.videoSegments.length > 1 && (
          <button
            onClick={() => onDeleteSegment(currentSegment.id)}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs flex items-center gap-2 transition-all ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Segment</span>
          </button>
        )}
      </div>

      {/* Playback Speed presets */}
      <div className="space-y-2 pt-1 border-t border-slate-800/80">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-sky-400" />
          <span>Segment Playback Speed</span>
        </div>

        <div className="flex gap-2">
          {[1.0, 1.25, 1.5, 2.0].map((speed) => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                currentSegment.speed === speed
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

