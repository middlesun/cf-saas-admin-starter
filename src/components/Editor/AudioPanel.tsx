import React, { useRef } from 'react';
import { AudioTrack } from '../../types';
import { PRESET_AUDIO_TRACKS } from '../../lib/audioSynth';
import { Music, Upload, Volume2, Trash2, Repeat, Sparkles } from 'lucide-react';

interface AudioPanelProps {
  audioTracks: AudioTrack[];
  videoDuration: number;
  onUpdateAudioTrack: (track: AudioTrack | null) => void;
}

export const AudioPanel: React.FC<AudioPanelProps> = ({
  audioTracks,
  videoDuration,
  onUpdateAudioTrack,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTrack = audioTracks[0]; // Primary background track

  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_AUDIO_TRACKS.find((p) => p.id === presetId);
    if (!preset) return;

    const newTrack: AudioTrack = {
      id: 'audio_' + Date.now(),
      name: preset.name,
      presetId: preset.id,
      volume: 0.35,
      fadeIn: true,
      fadeOut: true,
      loop: true,
      startTime: 0,
      duration: videoDuration,
    };
    onUpdateAudioTrack(newTrack);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newTrack: AudioTrack = {
        id: 'audio_' + Date.now(),
        name: file.name,
        audioBlobUrl: url,
        volume: 0.4,
        fadeIn: true,
        fadeOut: true,
        loop: true,
        startTime: 0,
        duration: videoDuration,
      };
      onUpdateAudioTrack(newTrack);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-5 p-1">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
          <Music className="w-4 h-4 text-emerald-400" />
          <span>Background Audio Track</span>
        </h3>

        {activeTrack && (
          <button
            onClick={() => onUpdateAudioTrack(null)}
            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Audio</span>
          </button>
        )}
      </div>

      {/* Preset Music Selector */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Royalty-Free Synthesized Tracks</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESET_AUDIO_TRACKS.map((preset) => (
            <div
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                activeTrack?.presetId === preset.id
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="font-semibold text-xs flex items-center justify-between">
                <span>{preset.name}</span>
                <span className="text-[10px] font-mono text-slate-400">{preset.bpm} BPM</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-tight">{preset.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Custom Audio File */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-300">Or Upload Custom Audio File</div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <Upload className="w-4 h-4 text-slate-400" />
          <span>Upload Music Track (MP3, WAV, AAC)</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="audio/*"
          className="hidden"
        />
      </div>

      {/* Controls if Track Active */}
      {activeTrack && (
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">{activeTrack.name}</span>
            <span className="text-emerald-400 font-mono font-semibold">
              {Math.round(activeTrack.volume * 100)}% Volume
            </span>
          </div>

          {/* Volume Slider */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-slate-400" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={activeTrack.volume}
                onChange={(e) =>
                  onUpdateAudioTrack({ ...activeTrack, volume: parseFloat(e.target.value) })
                }
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Fade & Loop Toggles */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
            <button
              onClick={() => onUpdateAudioTrack({ ...activeTrack, fadeIn: !activeTrack.fadeIn })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeTrack.fadeIn
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              Fade In
            </button>

            <button
              onClick={() => onUpdateAudioTrack({ ...activeTrack, fadeOut: !activeTrack.fadeOut })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeTrack.fadeOut
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              Fade Out
            </button>

            <button
              onClick={() => onUpdateAudioTrack({ ...activeTrack, loop: !activeTrack.loop })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                activeTrack.loop
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Loop Track</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
