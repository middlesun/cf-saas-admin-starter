import React, { useState } from 'react';
import { ExportProgress, ExportOptions } from '../../lib/videoExporter';
import { Sparkles, Download, CheckCircle2, AlertTriangle, X, Film, FileImage, Settings2, Play } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: ExportProgress;
  exportedVideoUrl: string | null;
  onDownload: () => void;
  onStartExport?: (options: ExportOptions) => void;
  isExporting: boolean;
  currentFormat?: 'mp4' | 'gif' | 'webm';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  progress,
  exportedVideoUrl,
  onDownload,
  onStartExport,
  isExporting,
  currentFormat = 'mp4',
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'mp4' | 'gif' | 'webm'>(currentFormat);
  const [selectedResolution, setSelectedResolution] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [selectedFps, setSelectedFps] = useState<number>(30);
  const [selectedQuality, setSelectedQuality] = useState<'medium' | 'high' | 'ultra'>('high');

  if (!isOpen) return null;

  const isDone = progress.percentage >= 100 && exportedVideoUrl;
  const isRendering = isExporting && !isDone;

  const handleStart = () => {
    if (onStartExport) {
      onStartExport({
        format: selectedFormat,
        resolution: selectedResolution,
        fps: selectedFps,
        quality: selectedQuality,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              {selectedFormat === 'gif' ? (
                <FileImage className="w-5 h-5 text-amber-400" />
              ) : (
                <Sparkles className="w-5 h-5 fill-sky-400/20" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">
                {isDone
                  ? 'Export Complete!'
                  : isRendering
                  ? selectedFormat === 'gif'
                    ? 'Exporting Animated GIF...'
                    : 'Exporting Demo Video...'
                  : 'Export & Download Video'}
              </h3>
              <p className="text-xs text-slate-400">
                {isDone
                  ? 'Ready to save to your local drive'
                  : isRendering
                  ? 'Rendering canvas frames, animations & audio'
                  : 'Choose format, resolution and quality settings'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration State (Before Rendering Starts) */}
        {!isRendering && !isDone && (
          <div className="space-y-4 py-1">
            {/* Format Selection Cards */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Output Format</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('mp4')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedFormat === 'mp4' || selectedFormat === 'webm'
                      ? 'bg-sky-500/10 border-sky-500 text-sky-300 shadow-md shadow-sky-500/10 ring-1 ring-sky-500'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Film className="w-4 h-4 text-sky-400" />
                    <span className="font-semibold text-xs text-slate-100">Video (MP4 / WebM)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Full HD with crystal-clear audio soundtrack</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFormat('gif');
                    if (selectedFps > 24) setSelectedFps(20);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedFormat === 'gif'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10 ring-1 ring-amber-500'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileImage className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-xs text-slate-100">Animated GIF</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Looping GIF for GitHub READMEs & docs</p>
                </button>
              </div>
            </div>

            {/* Resolution Settings */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Resolution</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '720p', label: '720p HD', desc: '1280 × 720' },
                  { id: '1080p', label: '1080p FHD', desc: '1920 × 1080' },
                  { id: '4k', label: '4K UHD', desc: '3840 × 2160' },
                ].map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => setSelectedResolution(res.id as '720p' | '1080p' | '4k')}
                    className={`px-3 py-2 rounded-lg border text-center transition-all ${
                      selectedResolution === res.id
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-200">{res.label}</div>
                    <div className="text-[10px] text-slate-500">{res.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Rate & Quality */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Frame Rate</label>
                <div className="flex rounded-lg bg-slate-800/80 p-1 border border-slate-700/60">
                  {(selectedFormat === 'gif' ? [15, 20, 24] : [24, 30, 60]).map((fps) => (
                    <button
                      key={fps}
                      type="button"
                      onClick={() => setSelectedFps(fps)}
                      className={`flex-1 py-1 text-xs rounded font-medium transition-all ${
                        selectedFps === fps
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Quality / Bitrate</label>
                <div className="flex rounded-lg bg-slate-800/80 p-1 border border-slate-700/60">
                  {[
                    { id: 'medium', label: 'Medium' },
                    { id: 'high', label: 'High' },
                    { id: 'ultra', label: 'Ultra' },
                  ].map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setSelectedQuality(q.id as 'medium' | 'high' | 'ultra')}
                      className={`flex-1 py-1 text-xs rounded font-medium transition-all ${
                        selectedQuality === q.id
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleStart}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-500/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Export ({selectedFormat.toUpperCase()})</span>
              </button>
            </div>
          </div>
        )}

        {/* Progress Body */}
        {isRendering && (
          <div className="space-y-5 py-4">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-300">{progress.status}</span>
              <span className="text-sky-400 font-mono text-sm">{progress.percentage}%</span>
            </div>

            {/* Custom Progress Bar */}
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
              <div
                style={{ width: `${progress.percentage}%` }}
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-300 shadow-md shadow-sky-500/50"
              />
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Please leave this window open while your video frames, animations, and audio are compiled.
            </p>
          </div>
        )}

        {/* Finished / Ready for Download */}
        {isDone && (
          <div className="space-y-6 py-2">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>
                Your {selectedFormat === 'gif' ? 'animated GIF' : 'demo video'} has been successfully generated and is ready for download!
              </span>
            </div>

            {/* Preview */}
            <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg flex items-center justify-center">
              {selectedFormat === 'gif' ? (
                <img src={exportedVideoUrl} alt="Exported GIF" className="w-full h-full object-contain" />
              ) : (
                <video src={exportedVideoUrl} controls autoPlay className="w-full h-full object-contain" />
              )}
            </div>

            <button
              onClick={onDownload}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-500/25 transition-all hover:scale-[1.01]"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>
                Download {selectedFormat === 'gif' ? 'Animated GIF (.gif)' : 'Demo Video (.mp4)'}
              </span>
            </button>
          </div>
        )}

        {/* Safety Note */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 justify-center">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Your video project is saved locally in IndexedDB even if you close this window.</span>
        </div>
      </div>
    </div>
  );
};
