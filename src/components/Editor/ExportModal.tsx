import React from 'react';
import { ExportProgress } from '../../lib/videoExporter';
import { Sparkles, Download, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: ExportProgress;
  exportedVideoUrl: string | null;
  onDownload: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  progress,
  exportedVideoUrl,
  onDownload,
}) => {
  if (!isOpen) return null;

  const isDone = progress.percentage >= 100 && exportedVideoUrl;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 fill-sky-400/20" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">
                {isDone ? 'Export Complete!' : 'Exporting Demo Video...'}
              </h3>
              <p className="text-xs text-slate-400">Rendering high quality 1080p canvas & audio mix</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Body */}
        {!isDone ? (
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
        ) : (
          <div className="space-y-6 py-2">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>Your demo video has been successfully generated and is ready for download!</span>
            </div>

            {/* Video Download Preview */}
            <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg">
              <video src={exportedVideoUrl} controls className="w-full h-full object-contain" />
            </div>

            <button
              onClick={onDownload}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-500/25 transition-all hover:scale-[1.01]"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Download Demo Video (WebM/MP4)</span>
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
