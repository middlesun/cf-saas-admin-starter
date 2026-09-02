import React, { useState, useEffect } from 'react';
import { ExportProgress, ExportOptions } from '../../lib/videoExporter';
import { Sparkles, Download, CheckCircle2, AlertTriangle, X, Film, FileImage, Settings2, Play, RefreshCw, Eye, FolderArchive, Layers, Clock, Cpu, Volume2, Gauge } from 'lucide-react';
import { Project } from '../../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: ExportProgress;
  exportedVideoUrl: string | null;
  onDownload: () => void;
  onStartExport?: (options: ExportOptions) => void;
  onExportProject?: () => void;
  isExporting: boolean;
  currentFormat?: 'mp4' | 'gif' | 'webm' | 'project';
  initialView?: 'settings' | 'preview';
  project?: Project;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  progress,
  exportedVideoUrl,
  onDownload,
  onStartExport,
  onExportProject,
  isExporting,
  currentFormat = 'mp4',
  initialView,
  project,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'mp4' | 'gif' | 'webm' | 'project'>(currentFormat);
  const [selectedResolution, setSelectedResolution] = useState<'source' | '720p' | '1080p' | '4k'>('source');
  const [selectedFps, setSelectedFps] = useState<number>(30);
  const [selectedQuality, setSelectedQuality] = useState<'medium' | 'high' | 'ultra'>('high');
  const [modalView, setModalView] = useState<'settings' | 'preview'>('settings');

  const isDone = progress.percentage >= 100 && (exportedVideoUrl !== null || selectedFormat === 'project');
  const isRendering = isExporting && !isDone;

  // Sync format changes from parent
  useEffect(() => {
    if (currentFormat) {
      setSelectedFormat(currentFormat);
    }
  }, [currentFormat]);

  // Determine initial view when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialView) {
        setModalView(initialView);
      } else if (isExporting) {
        setModalView('preview');
      } else if (exportedVideoUrl) {
        setModalView('settings');
      } else {
        setModalView('settings');
      }
    }
  }, [isOpen, initialView, isExporting]);

  if (!isOpen) return null;

  const handleStart = () => {
    if (selectedFormat === 'project') {
      if (onExportProject) {
        onExportProject();
      }
      return;
    }

    if (onStartExport) {
      setModalView('preview');
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              {selectedFormat === 'gif' ? (
                <FileImage className="w-5 h-5 text-amber-400" />
              ) : selectedFormat === 'project' ? (
                <FolderArchive className="w-5 h-5 text-emerald-400" />
              ) : (
                <Sparkles className="w-5 h-5 fill-sky-400/20" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">
                {isRendering
                  ? selectedFormat === 'gif'
                    ? 'Exporting Animated GIF...'
                    : selectedFormat === 'project'
                    ? 'Packaging Editable Project...'
                    : 'Exporting Demo Video...'
                  : modalView === 'preview' && isDone
                  ? 'Export Complete!'
                  : exportedVideoUrl
                  ? 'Export Custom Settings'
                  : 'Export & Download'}
              </h3>
              <p className="text-xs text-slate-400">
                {isRendering
                  ? 'Rendering canvas frames, animations & audio'
                  : modalView === 'preview' && isDone
                  ? 'Ready to save to your local drive'
                  : selectedFormat === 'project'
                  ? 'Save full project file to edit or resume on any computer'
                  : exportedVideoUrl
                  ? 'Adjust settings and re-export without losing any edits'
                  : 'Choose format, resolution and quality settings'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
            title="Close export window"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs (Visible when previous export exists and not rendering) */}
        {!isRendering && exportedVideoUrl && selectedFormat !== 'project' && (
          <div className="flex rounded-xl bg-slate-950/80 p-1 border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setModalView('settings')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                modalView === 'settings'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Export Custom Settings</span>
            </button>

            <button
              type="button"
              onClick={() => setModalView('preview')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                modalView === 'preview'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Exported Output</span>
            </button>
          </div>
        )}

        {/* Configuration View: Export Custom Settings */}
        {!isRendering && modalView === 'settings' && (
          <div className="space-y-4 py-1">
            {/* Format Selection Cards */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Output Format</label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('mp4')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedFormat === 'mp4' || selectedFormat === 'webm'
                      ? 'bg-sky-500/10 border-sky-500 text-sky-300 shadow-md shadow-sky-500/10 ring-1 ring-sky-500'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Film className="w-4 h-4 text-sky-400" />
                    <span className="font-semibold text-xs text-slate-100">Video</span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2">MP4 / WebM with audio & zoom effects</p>
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
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileImage className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-xs text-slate-100">GIF</span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2">Looping GIF for READMEs & docs</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat('project')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedFormat === 'project'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <FolderArchive className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-xs text-slate-100">Project File</span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2">Editable .demoproj with full timeline</p>
                </button>
              </div>
            </div>

            {selectedFormat === 'project' ? (
              /* Project Package Summary View */
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <Layers className="w-4 h-4" />
                  <span>Editable Project Package (.demoproj)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Exports your current editing session into a standalone file. You can import this file anytime on any computer to continue trimming, adjusting zooms, or editing annotations.
                </p>

                {project && (
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-400">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span>Timeline Duration:</span>
                      <span className="text-slate-200 font-mono font-medium">{project.duration?.toFixed(1)}s</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span>Video Segments:</span>
                      <span className="text-slate-200 font-mono font-medium">{project.videoSegments?.length || 1}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span>Annotations:</span>
                      <span className="text-slate-200 font-mono font-medium">{project.annotations?.length || 0}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span>Zoom Events:</span>
                      <span className="text-slate-200 font-mono font-medium">{project.zoomEvents?.length || 0}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStart}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Export Project File (.demoproj)</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Resolution Settings */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Resolution</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      {
                        id: 'source',
                        label: 'Original',
                        desc: project?.settings?.width && project?.settings?.height
                          ? `${project.settings.width} × ${project.settings.height}`
                          : 'Native Record',
                      },
                      { id: '1080p', label: '1080p FHD', desc: '1920 × 1080' },
                      { id: '720p', label: '720p HD', desc: '1280 × 720' },
                      { id: '4k', label: '4K UHD', desc: '3840 × 2160' },
                    ].map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => setSelectedResolution(res.id as 'source' | '720p' | '1080p' | '4k')}
                        className={`px-2.5 py-2 rounded-lg border text-center transition-all ${
                          selectedResolution === res.id
                            ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                            : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <div className="text-xs font-semibold text-slate-200">{res.label}</div>
                        <div className="text-[10px] text-slate-500 truncate">{res.desc}</div>
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
                    {exportedVideoUrl ? (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Re-export with New Settings ({selectedFormat.toUpperCase()})</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        <span>Start Export ({selectedFormat.toUpperCase()})</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Progress Body (While Rendering) */}
        {isRendering && (
          <div className="space-y-4 py-3" id="export-rendering-status">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-300 line-clamp-1">{progress.status}</span>
              <span className="text-sky-400 font-mono text-sm shrink-0 ml-2">{progress.percentage}%</span>
            </div>

            {/* Custom Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
              <div
                style={{ width: `${progress.percentage}%` }}
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-300 shadow-md shadow-sky-500/50"
              />
            </div>

            {/* Real-time Hardware Telemetry Bar */}
            {progress.totalFrames ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <Film className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Frames</p>
                    <p className="text-xs font-mono font-medium text-slate-200 truncate">
                      {progress.currentFrame || 0} / {progress.totalFrames}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <Gauge className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Framerate</p>
                    <p className="text-xs font-mono font-medium text-slate-200 truncate">
                      {progress.fps || selectedFps} FPS
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Bitrate</p>
                    <p className="text-xs font-mono font-medium text-slate-200 truncate">
                      {progress.bitrateMbps ? `${progress.bitrateMbps} Mbps` : 'Adaptive'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Audio</p>
                    <p className="text-xs font-mono font-medium text-slate-200 truncate">
                      {progress.hasAudio ? '48kHz Stereo' : 'Video Only'}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Please leave this window open while your export is being prepared.</span>
              {progress.estimatedRemainingSecs !== undefined && progress.estimatedRemainingSecs > 0 ? (
                <span className="flex items-center gap-1 text-slate-400 font-mono">
                  <Clock className="w-3 h-3 text-slate-500" />
                  ~{progress.estimatedRemainingSecs}s remaining
                </span>
              ) : null}
            </div>
          </div>
        )}

        {/* Finished / Ready for Download View */}
        {!isRendering && modalView === 'preview' && isDone && (
          <div className="space-y-5 py-1">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>
                Your {selectedFormat === 'gif' ? 'animated GIF' : 'demo video'} has been successfully generated and is ready for download!
              </span>
            </div>

            {/* Preview Output */}
            {exportedVideoUrl && (
              <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg flex items-center justify-center">
                {selectedFormat === 'gif' ? (
                  <img src={exportedVideoUrl} alt="Exported GIF" className="w-full h-full object-contain" />
                ) : (
                  <video src={exportedVideoUrl} controls autoPlay className="w-full h-full object-contain" />
                )}
              </div>
            )}

            <div className="space-y-2.5">
              <button
                onClick={onDownload}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-500/25 transition-all hover:scale-[1.01]"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>
                  Download {selectedFormat === 'gif' ? 'Animated GIF (.gif)' : 'Demo Video (.mp4)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModalView('settings')}
                className="w-full py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Settings2 className="w-4 h-4 text-sky-400" />
                <span>Export Custom Settings (Change & Re-export)</span>
              </button>
            </div>
          </div>
        )}

        {/* Safety Note */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 justify-center pt-1 border-t border-slate-800/80">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Your video project and edits are preserved safely across all exports.</span>
        </div>
      </div>
    </div>
  );
};

