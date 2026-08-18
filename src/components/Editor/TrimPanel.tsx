import React from 'react';
import { Project, VideoSegment } from '../../types';
import { Scissors, Trash2, Gauge } from 'lucide-react';

interface TrimPanelProps {
  project: Project;
  currentTime: number;
  onUpdateSegment: (updated: VideoSegment[]) => void;
  onSplitSegment: () => void;
  onDeleteSegment: (id: string) => void;
  onSeek?: (time: number) => void;
}

export const TrimPanel: React.FC<TrimPanelProps> = ({
  project,
  currentTime,
  onUpdateSegment,
  onSplitSegment,
  onDeleteSegment,
  onSeek,
}) => {
  const currentSegment = project.videoSegments[0]; // Active segment

  if (!currentSegment) {
    return <div className="text-xs text-slate-400 p-4">No active video segment selected</div>;
  }

  const handleStartTrimChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = parseFloat(e.target.value);
    if (newStart < currentSegment.endTime - 0.5) {
      const updated = project.videoSegments.map((s, i) => (i === 0 ? { ...s, startTime: newStart } : s));
      onUpdateSegment(updated);
      if (onSeek) onSeek(newStart);
    }
  };

  const handleEndTrimChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = parseFloat(e.target.value);
    if (newEnd > currentSegment.startTime + 0.5) {
      const updated = project.videoSegments.map((s, i) => (i === 0 ? { ...s, endTime: newEnd } : s));
      onUpdateSegment(updated);
      if (onSeek) onSeek(newEnd);
    }
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

  return (
    <div className="space-y-5 p-1">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
          <Scissors className="w-4 h-4 text-sky-400" />
          <span>Trim & Speed Controls</span>
        </h3>
        <span className="text-xs text-slate-400">Remove unwanted mistakes easily</span>
      </div>

      {/* Quick Trim Start & End Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300">Trim Beginning</span>
            <span className="text-sky-400 font-mono">{currentSegment.startTime.toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min={0}
            max={project.duration}
            step={0.1}
            value={currentSegment.startTime}
            onChange={handleStartTrimChange}
            className="w-full accent-sky-500 cursor-pointer"
          />
          <p className="text-[11px] text-slate-500">Cut off waiting time at video start</p>
        </div>

        <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300">Trim End</span>
            <span className="text-sky-400 font-mono">{currentSegment.endTime.toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min={0}
            max={project.duration}
            step={0.1}
            value={currentSegment.endTime}
            onChange={handleEndTrimChange}
            className="w-full accent-sky-500 cursor-pointer"
          />
          <p className="text-[11px] text-slate-500">Cut off excess recording at video end</p>
        </div>
      </div>

      {/* Split & Delete Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          onClick={onSplitSegment}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition-all"
        >
          <Scissors className="w-4 h-4 text-sky-400" />
          <span>Split Segment at Playhead ({currentTime.toFixed(1)}s)</span>
        </button>

        <button
          onClick={handleResetTrim}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs transition-all"
        >
          Reset Trim Range
        </button>

        {project.videoSegments.length > 1 && (
          <button
            onClick={() => onDeleteSegment(currentSegment.id)}
            className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs flex items-center gap-2 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Selected Segment</span>
          </button>
        )}
      </div>

      {/* Playback Speed presets */}
      <div className="space-y-2 pt-2">
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
