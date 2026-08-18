import React, { useState, useRef, useEffect } from 'react';
import { Project, TextAnnotation, ClickAnimation, TransitionCard, AudioTrack, VideoSegment } from '../../types';
import { VideoPreview } from './VideoPreview';
import { Timeline } from './Timeline';
import { TrimPanel } from './TrimPanel';
import { ZoomPanel } from './ZoomPanel';
import { ClickPanel } from './ClickPanel';
import { AnnotationPanel } from './AnnotationPanel';
import { TransitionPanel } from './TransitionPanel';
import { AudioPanel } from './AudioPanel';
import { AiEditorPanel } from './AiEditorPanel';
import { ExportModal } from './ExportModal';
import { SlideTemplateModal } from './SlideTemplateModal';
import { renderAndExportVideo, ExportProgress, ExportOptions } from '../../lib/videoExporter';
import { saveProject } from '../../lib/db';
import { generateAutoZooms, DEFAULT_AUTO_ZOOM_SETTINGS } from '../../lib/zoomSystem';
import { FrameSlideStrip } from './FrameSlideStrip';
import { Scissors, MousePointerClick, MessageSquare, Layers, Music, Save, Check, Undo2, Redo2, Sparkles, ZoomIn, Film, LayoutGrid, Zap, Video, Download, Sliders, ArrowRight, Play, Volume2, MousePointer } from 'lucide-react';

interface EditorViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onGoHome: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({ project, onUpdateProject, onGoHome }) => {
  const [editingMode, setEditingMode] = useState<'quick' | 'pro'>('quick');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [activeTab, setActiveTab] = useState<'trim' | 'zoom' | 'click' | 'text' | 'transition' | 'audio'>('zoom');

  // History Stack for Undo/Redo
  const [history, setHistory] = useState<Project[]>([project]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Selected item IDs
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [selectedClickId, setSelectedClickId] = useState<string | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  const [selectedZoomId, setSelectedZoomId] = useState<string | null>(null);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportedFormat, setExportedFormat] = useState<'mp4' | 'gif' | 'webm'>('mp4');
  const [exportProgress, setExportProgress] = useState<ExportProgress>({ percentage: 0, status: '' });
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSlideModalOpen, setIsSlideModalOpen] = useState<boolean>(false);
  const [layoutViewMode, setLayoutViewMode] = useState<'standard' | 'widescreen'>('standard');
  const [timelineViewMode, setTimelineViewMode] = useState<'both' | 'tracks' | 'frames'>('both');

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleAddSlideFromModal = (slide: TransitionCard) => {
    const updated: Project = {
      ...project,
      transitions: [...project.transitions, slide],
      updatedAt: Date.now(),
    };
    persistChanges(updated);
    setSelectedTransitionId(slide.id);
    setActiveTab('transition');
  };

  // Auto-update project in IndexedDB on edit and update history stack
  const persistChanges = async (newProject: Project) => {
    onUpdateProject(newProject);
    await saveProject(newProject);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);

    // Append to history stack if distinct
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newProject];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevProject = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onUpdateProject(prevProject);
      saveProject(prevProject);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextProject = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onUpdateProject(nextProject);
      saveProject(nextProject);
    }
  };

  // Auto-generate zooms on project load if empty and clicks exist
  useEffect(() => {
    if (project.clickAnimations.length > 0 && (!project.zoomEvents || project.zoomEvents.length === 0)) {
      const autoZooms = generateAutoZooms(
        project.clickAnimations,
        project.autoZoomSettings || DEFAULT_AUTO_ZOOM_SETTINGS,
        project.duration
      );
      if (autoZooms.length > 0) {
        onUpdateProject({
          ...project,
          zoomEvents: autoZooms,
        });
      }
    }
  }, []);

  // Video Time Update Listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Annotation handlers
  const handleAddAnnotation = (ann: TextAnnotation) => {
    const updated: Project = { ...project, annotations: [...project.annotations, ann], updatedAt: Date.now() };
    persistChanges(updated);
  };

  const handleUpdateAnnotation = (ann: TextAnnotation) => {
    const updated: Project = {
      ...project,
      annotations: project.annotations.map((a) => (a.id === ann.id ? ann : a)),
      updatedAt: Date.now(),
    };
    persistChanges(updated);
  };

  const handleDeleteAnnotation = (id: string) => {
    const updated: Project = {
      ...project,
      annotations: project.annotations.filter((a) => a.id !== id),
      updatedAt: Date.now(),
    };
    persistChanges(updated);
    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
  };

  // Click handlers
  const handleAddClick = (click: ClickAnimation) => {
    const updated: Project = { ...project, clickAnimations: [...project.clickAnimations, click], updatedAt: Date.now() };
    persistChanges(updated);
  };

  const handleUpdateClick = (click: ClickAnimation) => {
    const updated: Project = {
      ...project,
      clickAnimations: project.clickAnimations.map((c) => (c.id === click.id ? click : c)),
      updatedAt: Date.now(),
    };
    persistChanges(updated);
  };

  const handleDeleteClick = (id: string) => {
    const updated: Project = {
      ...project,
      clickAnimations: project.clickAnimations.filter((c) => c.id !== id),
      updatedAt: Date.now(),
    };
    persistChanges(updated);
    if (selectedClickId === id) setSelectedClickId(null);
  };

  // Transition handlers
  const handleAddTransition = (tr: TransitionCard) => {
    const updated: Project = { ...project, transitions: [...project.transitions, tr], updatedAt: Date.now() };
    persistChanges(updated);
  };

  const handleUpdateTransition = (tr: TransitionCard) => {
    const updated: Project = {
      ...project,
      transitions: project.transitions.map((t) => (t.id === tr.id ? tr : t)),
      updatedAt: Date.now(),
    };
    persistChanges(updated);
  };

  const handleDeleteTransition = (id: string) => {
    const updated: Project = {
      ...project,
      transitions: project.transitions.filter((t) => t.id !== id),
      updatedAt: Date.now(),
    };
    persistChanges(updated);
    if (selectedTransitionId === id) setSelectedTransitionId(null);
  };

  // Audio Handler
  const handleUpdateAudioTrack = (track: AudioTrack | null) => {
    const updated: Project = {
      ...project,
      audioTracks: track ? [track] : [],
      updatedAt: Date.now(),
    };
    persistChanges(updated);
  };

  // Segment handlers
  const handleUpdateSegments = (segments: VideoSegment[]) => {
    const updated: Project = { ...project, videoSegments: segments, updatedAt: Date.now() };
    persistChanges(updated);
  };

  const handleSplitSegmentAtPlayhead = () => {
    if (project.videoSegments.length === 0) return;
    const seg = project.videoSegments[0];
    if (currentTime <= seg.startTime + 0.5 || currentTime >= seg.endTime - 0.5) return;

    const seg1: VideoSegment = { ...seg, id: seg.id + '_a', endTime: currentTime };
    const seg2: VideoSegment = { ...seg, id: seg.id + '_b', startTime: currentTime };

    handleUpdateSegments([seg1, seg2]);
  };

  const handleDeleteSelectedItem = () => {
    if (selectedAnnotationId) handleDeleteAnnotation(selectedAnnotationId);
    else if (selectedClickId) handleDeleteClick(selectedClickId);
    else if (selectedTransitionId) handleDeleteTransition(selectedTransitionId);
  };

  // Export Video Handler
  const handleExport = async (options?: ExportOptions) => {
    if (!videoRef.current) return;
    const format = options?.format || 'mp4';
    setExportedFormat(format);
    setIsExporting(true);
    setIsExportModalOpen(true);
    setExportedVideoUrl(null);
    setExportProgress({ percentage: 0, status: `Starting ${format.toUpperCase()} export process...` });

    try {
      const blob = await renderAndExportVideo(
        project,
        videoRef.current,
        (prog) => {
          setExportProgress(prog);
        },
        options
      );
      const url = URL.createObjectURL(blob);
      setExportedVideoUrl(url);
    } catch (err) {
      console.error('Export failed:', err);
      setExportProgress({ percentage: 0, status: 'Export error occurred. Project preserved.' });
    }
  };

  const handleDownload = () => {
    if (!exportedVideoUrl) return;
    const a = document.createElement('a');
    a.href = exportedVideoUrl;
    const ext = exportedFormat === 'gif' ? 'gif' : exportedFormat === 'mp4' ? 'mp4' : 'webm';
    a.download = `${project.name.replace(/\s+/g, '_')}_Demo.${ext}`;
    a.click();
  };

  return (
    <div className="w-full px-4 sm:px-6 py-3 space-y-4">
      {/* Top Mode Navigation & Studio Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1424] px-4 py-2.5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          {/* Quick vs Pro Mode Toggle */}
          <div className="flex items-center bg-[#070b14] p-1 rounded-xl border border-slate-800/80 shadow-inner">
            <button
              onClick={() => setEditingMode('quick')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                editingMode === 'quick'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Quick Mode</span>
            </button>

            <button
              onClick={() => setEditingMode('pro')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                editingMode === 'pro'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-200" />
              <span>Pro Studio</span>
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden md:inline">
            {editingMode === 'quick'
              ? 'Clean frame-based editing, audio track & high-quality export'
              : 'Full studio with AI chatbot, multi-track timeline & annotations'}
          </span>
        </div>

        {/* Undo/Redo & Export Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#070b14] rounded-xl p-0.5 border border-slate-800/80">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                historyIndex > 0 ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                historyIndex < history.length - 1 ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {isSaved && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold animate-pulse">
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </div>
          )}

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {editingMode === 'quick' ? (
        /* QUICK MODE: Super clean frame based editing, audio track & highest quality export */
        <div className="flex flex-col gap-4 w-full">
          {/* Video Preview Box */}
          <div className="h-[460px] sm:h-[540px] w-full">
            <VideoPreview
              project={project}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              selectedAnnotationId={selectedAnnotationId}
              selectedClickId={selectedClickId}
              onSelectAnnotation={setSelectedAnnotationId}
              onSelectClick={setSelectedClickId}
              onUpdateAnnotationPosition={(id, x, y) => {
                const ann = project.annotations.find((a) => a.id === id);
                if (ann) handleUpdateAnnotation({ ...ann, x, y });
              }}
              onAddClickAtPosition={(x, y) => {
                const newClick: ClickAnimation = {
                  id: 'click_' + Date.now(),
                  timestamp: currentTime,
                  x,
                  y,
                  style: 'ripple',
                  size: 45,
                  duration: 0.6,
                  color: '#38bdf8',
                  playSound: true,
                };
                handleAddClick(newClick);
                setSelectedClickId(newClick.id);
              }}
              onAddAnnotationAtPosition={() => {}}
              playbackSpeed={playbackSpeed}
              onChangePlaybackSpeed={setPlaybackSpeed}
              videoRef={videoRef}
              layoutViewMode={layoutViewMode}
              onChangeLayoutViewMode={setLayoutViewMode}
              onTriggerExport={handleExport}
              onOpenExportModal={(opts) => {
                if (opts?.format) setExportedFormat(opts.format);
                setIsExportModalOpen(true);
              }}
            />
          </div>

          {/* 1. Super Clean Frame Based Editor — Placed Right Under The Video */}
          <FrameSlideStrip
            project={project}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onUpdateSegments={handleUpdateSegments}
            videoRef={videoRef}
          />

          {/* Quick Editing Tools: Audio Track, Smart Zoom & Clicks, High-Quality Exports */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 2. Audio Track Selector */}
            <div className="bg-[#0b101d] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
              <AudioPanel
                audioTracks={project.audioTracks}
                videoDuration={project.duration}
                onUpdateAudioTrack={handleUpdateAudioTrack}
              />
            </div>

            {/* Smart Zoom (when typing/clicking) & Clicks */}
            <div className="bg-[#0b101d] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Zoom & Click Effects</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {(project.zoomEvents || []).length} Zooms • {project.clickAnimations.length} Clicks
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* Auto Zoom when typing/clicking */}
                <div className="p-3 rounded-xl bg-[#121929] border border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
                      <span>Dynamic Auto-Zoom</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Zooms in smoothly when typing or clicking buttons</p>
                  </div>
                  <button
                    onClick={() => {
                      const autoZooms = generateAutoZooms(project);
                      persistChanges({ ...project, zoomEvents: autoZooms, updatedAt: Date.now() });
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
                  >
                    Auto-Generate
                  </button>
                </div>

                {/* Click Animations */}
                <div className="p-3 rounded-xl bg-[#121929] border border-slate-800/80 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <MousePointerClick className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Click Highlights</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Animated ripples & sound on mouse clicks</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {project.clickAnimations.length} Active
                  </span>
                </div>
              </div>
            </div>

            {/* 3. 1-Click Highest Quality Exports */}
            <div className="bg-[#0b101d] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <Download className="w-4 h-4 text-sky-400" />
                  <span>High-Quality Export</span>
                </h3>
                <span className="text-xs text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">1-Click</span>
              </div>

              <div className="space-y-2.5">
                {/* YouTube Video Export */}
                <button
                  onClick={() => handleExport({ format: 'mp4', resolution: '1080p', fps: 60, quality: 'ultra' })}
                  className="w-full p-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-red-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2 text-left">
                    <Video className="w-4 h-4 shrink-0 text-red-100" />
                    <div>
                      <div className="leading-tight">Export for YouTube</div>
                      <div className="text-[10px] text-red-200 font-normal">Ultra 1080p/4K 60fps MP4 with Music</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-red-200" />
                </button>

                {/* High-Quality GIF Export */}
                <button
                  onClick={() => handleExport({ format: 'gif', quality: 'ultra', fps: 20 })}
                  className="w-full p-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2 text-left">
                    <Film className="w-4 h-4 shrink-0 text-sky-100" />
                    <div>
                      <div className="leading-tight">Export High Quality GIF</div>
                      <div className="text-[10px] text-sky-200 font-normal">Preserved Dimensions & Crisp Colors</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-sky-200" />
                </button>

                {/* Custom Settings button */}
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-[#121929] hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span>Custom Export Settings...</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* PRO STUDIO MODE: Full tools, AI chatbot, multi-track timeline, annotations, etc. */
        layoutViewMode === 'widescreen' ? (
          /* Widescreen Full-Width Layout: Video Full Width on Top, AI Chatbot Down Below */
          <div className="flex flex-col gap-6 w-full">
            {/* Top Section — 100% width: Video preview + timeline + manual editing tools */}
            <div className="w-full space-y-4 min-w-0">
              {/* Widescreen Full-Width Video Preview Box */}
              <div className="h-[500px] sm:h-[600px] w-full">
                <VideoPreview
                  project={project}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onSeek={handleSeek}
                  selectedAnnotationId={selectedAnnotationId}
                  selectedClickId={selectedClickId}
                  onSelectAnnotation={(id) => {
                    setSelectedAnnotationId(id);
                    if (id) setActiveTab('text');
                  }}
                  onSelectClick={(id) => {
                    setSelectedClickId(id);
                    if (id) setActiveTab('click');
                  }}
                  onUpdateAnnotationPosition={(id, x, y) => {
                    const ann = project.annotations.find((a) => a.id === id);
                    if (ann) handleUpdateAnnotation({ ...ann, x, y });
                  }}
                  onAddClickAtPosition={(x, y) => {
                    const newClick: ClickAnimation = {
                      id: 'click_' + Date.now(),
                      timestamp: currentTime,
                      x,
                      y,
                      style: 'ripple',
                      size: 45,
                      duration: 0.6,
                      color: '#38bdf8',
                      playSound: true,
                    };
                    handleAddClick(newClick);
                    setSelectedClickId(newClick.id);
                    setActiveTab('click');
                  }}
                  onAddAnnotationAtPosition={(x, y) => {
                    const newAnn: TextAnnotation = {
                      id: 'ann_' + Date.now(),
                      text: 'Add explanatory walkthrough note here',
                      style: 'rounded',
                      animation: 'typewriter',
                      startTime: currentTime,
                      duration: 3.5,
                      x,
                      y,
                      fontSize: 15,
                      textColor: '#ffffff',
                      bgColor: '#0284c7',
                      opacity: 0.95,
                    };
                    handleAddAnnotation(newAnn);
                    setSelectedAnnotationId(newAnn.id);
                    setActiveTab('text');
                  }}
                  playbackSpeed={playbackSpeed}
                  onChangePlaybackSpeed={setPlaybackSpeed}
                  videoRef={videoRef}
                  layoutViewMode={layoutViewMode}
                  onChangeLayoutViewMode={setLayoutViewMode}
                  onTriggerExport={handleExport}
                  onOpenExportModal={(opts) => {
                    if (opts?.format) setExportedFormat(opts.format);
                    setIsExportModalOpen(true);
                  }}
                />
              </div>

              {/* 1. ScreenToGif Millisecond Frame Slides Strip — Placed Right Under Video */}
              {(timelineViewMode === 'both' || timelineViewMode === 'frames') && (
                <FrameSlideStrip
                  project={project}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onSeek={handleSeek}
                  onUpdateSegments={handleUpdateSegments}
                  videoRef={videoRef}
                />
              )}

              {/* Timeline View Mode Switcher Header */}
              <div className="flex items-center justify-between px-2 text-xs font-semibold">
                <div className="flex items-center gap-1.5 bg-[#090e1a] p-1 rounded-xl border border-slate-800 shadow-inner">
                  <button
                    onClick={() => setTimelineViewMode('both')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                      timelineViewMode === 'both'
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Show both multi-track timeline and ScreenToGif frame slide strip"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Dual Timeline & Slides</span>
                  </button>

                  <button
                    onClick={() => setTimelineViewMode('frames')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                      timelineViewMode === 'frames'
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="ScreenToGif frame-by-frame millisecond slide editor"
                  >
                    <Film className="w-3.5 h-3.5 text-amber-400" />
                    <span>ScreenToGif Frame Slides</span>
                  </button>

                  <button
                    onClick={() => setTimelineViewMode('tracks')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                      timelineViewMode === 'tracks'
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Multi-track timeline"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Tracks Only</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">
                  Click / Shift+Click / Ctrl+Click to select frames & delete with <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-sans">Del</kbd>
                </span>
              </div>

              {/* Multi-Track Timeline */}
              {(timelineViewMode === 'both' || timelineViewMode === 'tracks') && (
                <Timeline
                  project={project}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onSeek={handleSeek}
                  selectedAnnotationId={selectedAnnotationId}
                  selectedClickId={selectedClickId}
                  selectedTransitionId={selectedTransitionId}
                  selectedZoomId={selectedZoomId}
                  onSelectAnnotation={(id) => {
                    setSelectedAnnotationId(id);
                    if (id) setActiveTab('text');
                  }}
                  onSelectClick={(id) => {
                    setSelectedClickId(id);
                    if (id) setActiveTab('click');
                  }}
                  onSelectTransition={(id) => {
                    setSelectedTransitionId(id);
                    if (id) setActiveTab('transition');
                  }}
                  onSelectZoom={(id) => {
                    setSelectedZoomId(id);
                    if (id) setActiveTab('zoom');
                  }}
                  onSplitSegmentAtPlayhead={handleSplitSegmentAtPlayhead}
                  onDeleteSelectedItem={handleDeleteSelectedItem}
                  onOpenSlideModal={() => setIsSlideModalOpen(true)}
                  onUpdateSegments={handleUpdateSegments}
                  activeTab={activeTab}
                  onSelectTab={setActiveTab}
                />
              )}

            {/* Manual Tool Tabs & Property Panels */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              {/* Tool Tab Bar */}
              <div className="flex border-b border-slate-800 bg-slate-950/60 overflow-x-auto text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('zoom')}
                  className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                    activeTab === 'zoom'
                      ? 'border-sky-500 text-sky-400 bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Dynamic Zoom ({(project.zoomEvents || []).length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('trim')}
                  className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                    activeTab === 'trim'
                      ? 'border-sky-500 text-sky-400 bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Scissors className="w-4 h-4" />
                  <span>Trim & Speed</span>
                </button>

                <button
                  onClick={() => setActiveTab('click')}
                  className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                    activeTab === 'click'
                      ? 'border-sky-500 text-sky-400 bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MousePointerClick className="w-4 h-4" />
                  <span>Click Animations ({project.clickAnimations.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('text')}
                  className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                    activeTab === 'text'
                      ? 'border-sky-500 text-sky-400 bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Text Callouts ({project.annotations.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('transition')}
                  className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                    activeTab === 'transition'
                      ? 'border-sky-500 text-sky-400 bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Title Transitions ({project.transitions.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('audio')}
                  className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                    activeTab === 'audio'
                      ? 'border-sky-500 text-sky-400 bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Music className="w-4 h-4" />
                  <span>Background Audio ({project.audioTracks.length})</span>
                </button>
              </div>

              {/* Tab Content Panel */}
              <div className="p-5">
                {activeTab === 'zoom' && (
                  <ZoomPanel
                    project={project}
                    currentTime={currentTime}
                    selectedZoomId={selectedZoomId}
                    onSelectZoom={setSelectedZoomId}
                    onUpdateProject={persistChanges}
                    onSeek={handleSeek}
                  />
                )}

                {activeTab === 'trim' && (
                  <TrimPanel
                    project={project}
                    currentTime={currentTime}
                    onUpdateSegment={handleUpdateSegments}
                    onSplitSegment={handleSplitSegmentAtPlayhead}
                    onDeleteSegment={(id) => {
                      const updated = project.videoSegments.filter((s) => s.id !== id);
                      handleUpdateSegments(updated);
                    }}
                    onSeek={handleSeek}
                    onPlayPause={handlePlayPause}
                    isPlaying={isPlaying}
                  />
                )}

                {activeTab === 'click' && (
                  <ClickPanel
                    clickAnimations={project.clickAnimations}
                    selectedClickId={selectedClickId}
                    currentTime={currentTime}
                    onAddClick={handleAddClick}
                    onUpdateClick={handleUpdateClick}
                    onDeleteClick={handleDeleteClick}
                    onSelectClick={setSelectedClickId}
                  />
                )}

                {activeTab === 'text' && (
                  <AnnotationPanel
                    annotations={project.annotations}
                    selectedAnnotationId={selectedAnnotationId}
                    currentTime={currentTime}
                    onAddAnnotation={handleAddAnnotation}
                    onUpdateAnnotation={handleUpdateAnnotation}
                    onDeleteAnnotation={handleDeleteAnnotation}
                    onSelectAnnotation={setSelectedAnnotationId}
                  />
                )}

                {activeTab === 'transition' && (
                  <TransitionPanel
                    transitions={project.transitions}
                    selectedTransitionId={selectedTransitionId}
                    currentTime={currentTime}
                    onAddTransition={handleAddTransition}
                    onUpdateTransition={handleUpdateTransition}
                    onDeleteTransition={handleDeleteTransition}
                    onSelectTransition={setSelectedTransitionId}
                    onOpenSlideModal={() => setIsSlideModalOpen(true)}
                  />
                )}

                {activeTab === 'audio' && (
                  <AudioPanel
                    audioTracks={project.audioTracks}
                    videoDuration={project.duration}
                    onUpdateAudioTrack={handleUpdateAudioTrack}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section — AI Chatbot placed down below */}
          <div className="w-full h-[580px] pt-2">
            <AiEditorPanel
              project={project}
              currentTime={currentTime}
              onUpdateProject={persistChanges}
              onUndo={handleUndo}
              canUndo={historyIndex > 0}
              onSeek={handleSeek}
            />
          </div>
        </div>
      ) : (
        /* Standard 2-Column Layout: Left Column (30%) Fixed AI Chatbot | Right Column (70%) Scrollable Editor */
        <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
          {/* Column A — 30% width: Fixed AI Editor Chat */}
          <div className="w-full lg:w-[30%] lg:shrink-0 lg:sticky lg:top-14 h-[580px] lg:h-[calc(100vh-4.25rem)]">
            <AiEditorPanel
              project={project}
              currentTime={currentTime}
              onUpdateProject={persistChanges}
              onUndo={handleUndo}
              canUndo={historyIndex > 0}
              onSeek={handleSeek}
            />
          </div>

          {/* Column B — 70% width: Video preview + timeline + manual editing tools */}
          <div className="w-full lg:w-[70%] lg:flex-1 space-y-4 min-w-0">
            {/* Video Preview Box */}
            <div className="h-[420px] sm:h-[480px]">
              <VideoPreview
                project={project}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onSeek={handleSeek}
                selectedAnnotationId={selectedAnnotationId}
                selectedClickId={selectedClickId}
                onSelectAnnotation={(id) => {
                  setSelectedAnnotationId(id);
                  if (id) setActiveTab('text');
                }}
                onSelectClick={(id) => {
                  setSelectedClickId(id);
                  if (id) setActiveTab('click');
                }}
                onUpdateAnnotationPosition={(id, x, y) => {
                  const ann = project.annotations.find((a) => a.id === id);
                  if (ann) handleUpdateAnnotation({ ...ann, x, y });
                }}
                onAddClickAtPosition={(x, y) => {
                  const newClick: ClickAnimation = {
                    id: 'click_' + Date.now(),
                    timestamp: currentTime,
                    x,
                    y,
                    style: 'ripple',
                    size: 45,
                    duration: 0.6,
                    color: '#38bdf8',
                    playSound: true,
                  };
                  handleAddClick(newClick);
                  setSelectedClickId(newClick.id);
                  setActiveTab('click');
                }}
                onAddAnnotationAtPosition={(x, y) => {
                  const newAnn: TextAnnotation = {
                    id: 'ann_' + Date.now(),
                    text: 'Add explanatory walkthrough note here',
                    style: 'rounded',
                    animation: 'typewriter',
                    startTime: currentTime,
                    duration: 3.5,
                    x,
                    y,
                    fontSize: 15,
                    textColor: '#ffffff',
                    bgColor: '#0284c7',
                    opacity: 0.95,
                  };
                  handleAddAnnotation(newAnn);
                  setSelectedAnnotationId(newAnn.id);
                  setActiveTab('text');
                }}
                playbackSpeed={playbackSpeed}
                onChangePlaybackSpeed={setPlaybackSpeed}
                videoRef={videoRef}
                layoutViewMode={layoutViewMode}
                onChangeLayoutViewMode={setLayoutViewMode}
                onTriggerExport={handleExport}
                onOpenExportModal={(opts) => {
                  if (opts?.format) setExportedFormat(opts.format);
                  setIsExportModalOpen(true);
                }}
              />
            </div>

              {/* 1. ScreenToGif Millisecond Frame Slides Strip — Placed Right Under Video */}
              {(timelineViewMode === 'both' || timelineViewMode === 'frames') && (
                <FrameSlideStrip
                  project={project}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onSeek={handleSeek}
                  onUpdateSegments={handleUpdateSegments}
                  videoRef={videoRef}
                />
              )}

              {/* Timeline View Mode Switcher Header */}
              <div className="flex items-center justify-between px-2 text-xs font-semibold">
                <div className="flex items-center gap-1.5 bg-[#090e1a] p-1 rounded-xl border border-slate-800 shadow-inner">
                  <button
                    onClick={() => setTimelineViewMode('both')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                      timelineViewMode === 'both'
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Show both multi-track timeline and ScreenToGif frame slide strip"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Dual Timeline & Slides</span>
                  </button>

                  <button
                    onClick={() => setTimelineViewMode('frames')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                      timelineViewMode === 'frames'
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="ScreenToGif frame-by-frame millisecond slide editor"
                  >
                    <Film className="w-3.5 h-3.5 text-amber-400" />
                    <span>ScreenToGif Frame Slides</span>
                  </button>

                  <button
                    onClick={() => setTimelineViewMode('tracks')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                      timelineViewMode === 'tracks'
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Multi-track timeline"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Tracks Only</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">
                  Click / Shift+Click / Ctrl+Click to select frames & delete with <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-sans">Del</kbd>
                </span>
              </div>

              {/* Multi-Track Timeline */}
              {(timelineViewMode === 'both' || timelineViewMode === 'tracks') && (
                <Timeline
                  project={project}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onSeek={handleSeek}
                  selectedAnnotationId={selectedAnnotationId}
                  selectedClickId={selectedClickId}
                  selectedTransitionId={selectedTransitionId}
                  selectedZoomId={selectedZoomId}
                  onSelectAnnotation={(id) => {
                    setSelectedAnnotationId(id);
                    if (id) setActiveTab('text');
                  }}
                  onSelectClick={(id) => {
                    setSelectedClickId(id);
                    if (id) setActiveTab('click');
                  }}
                  onSelectTransition={(id) => {
                    setSelectedTransitionId(id);
                    if (id) setActiveTab('transition');
                  }}
                  onSelectZoom={(id) => {
                    setSelectedZoomId(id);
                    if (id) setActiveTab('zoom');
                  }}
                  onSplitSegmentAtPlayhead={handleSplitSegmentAtPlayhead}
                  onDeleteSelectedItem={handleDeleteSelectedItem}
                  onOpenSlideModal={() => setIsSlideModalOpen(true)}
                  onUpdateSegments={handleUpdateSegments}
                  activeTab={activeTab}
                  onSelectTab={setActiveTab}
                />
              )}

            {/* Manual Tool Tabs & Property Panels */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              {/* Tool Tab Bar */}
              <div className="flex border-b border-slate-800 bg-slate-950/60 overflow-x-auto text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('zoom')}
                  className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                    activeTab === 'zoom'
                      ? 'border-sky-500 text-sky-400 bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Dynamic Zoom ({(project.zoomEvents || []).length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('trim')}
                  className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                    activeTab === 'trim'
                      ? 'border-sky-500 text-sky-400 bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Scissors className="w-4 h-4" />
                  <span>Trim & Speed</span>
                </button>

                <button
                  onClick={() => setActiveTab('click')}
                  className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                    activeTab === 'click'
                      ? 'border-sky-500 text-sky-400 bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MousePointerClick className="w-4 h-4" />
                  <span>Click Animations ({project.clickAnimations.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('text')}
                  className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                    activeTab === 'text'
                      ? 'border-sky-500 text-sky-400 bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Text Callouts ({project.annotations.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('transition')}
                  className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                    activeTab === 'transition'
                      ? 'border-sky-500 text-sky-400 bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Title Transitions ({project.transitions.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('audio')}
                  className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                    activeTab === 'audio'
                      ? 'border-sky-500 text-sky-400 bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Music className="w-4 h-4" />
                  <span>Background Audio ({project.audioTracks.length})</span>
                </button>
              </div>

              {/* Tab Content Panel */}
              <div className="p-5">
                {activeTab === 'zoom' && (
                  <ZoomPanel
                    project={project}
                    currentTime={currentTime}
                    selectedZoomId={selectedZoomId}
                    onSelectZoom={setSelectedZoomId}
                    onUpdateProject={persistChanges}
                    onSeek={handleSeek}
                  />
                )}

                {activeTab === 'trim' && (
                  <TrimPanel
                    project={project}
                    currentTime={currentTime}
                    onUpdateSegment={handleUpdateSegments}
                    onSplitSegment={handleSplitSegmentAtPlayhead}
                    onDeleteSegment={(id) => {
                      const updated = project.videoSegments.filter((s) => s.id !== id);
                      handleUpdateSegments(updated);
                    }}
                    onSeek={handleSeek}
                    onPlayPause={handlePlayPause}
                    isPlaying={isPlaying}
                  />
                )}

                {activeTab === 'click' && (
                  <ClickPanel
                    clickAnimations={project.clickAnimations}
                    selectedClickId={selectedClickId}
                    currentTime={currentTime}
                    onAddClick={handleAddClick}
                    onUpdateClick={handleUpdateClick}
                    onDeleteClick={handleDeleteClick}
                    onSelectClick={setSelectedClickId}
                  />
                )}

                {activeTab === 'text' && (
                  <AnnotationPanel
                    annotations={project.annotations}
                    selectedAnnotationId={selectedAnnotationId}
                    currentTime={currentTime}
                    onAddAnnotation={handleAddAnnotation}
                    onUpdateAnnotation={handleUpdateAnnotation}
                    onDeleteAnnotation={handleDeleteAnnotation}
                    onSelectAnnotation={setSelectedAnnotationId}
                  />
                )}

                {activeTab === 'transition' && (
                  <TransitionPanel
                    transitions={project.transitions}
                    selectedTransitionId={selectedTransitionId}
                    currentTime={currentTime}
                    onAddTransition={handleAddTransition}
                    onUpdateTransition={handleUpdateTransition}
                    onDeleteTransition={handleDeleteTransition}
                    onSelectTransition={setSelectedTransitionId}
                    onOpenSlideModal={() => setIsSlideModalOpen(true)}
                  />
                )}

                {activeTab === 'audio' && (
                  <AudioPanel
                    audioTracks={project.audioTracks}
                    videoDuration={project.duration}
                    onUpdateAudioTrack={handleUpdateAudioTrack}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Slide Templates Modal */}
      <SlideTemplateModal
        isOpen={isSlideModalOpen}
        onClose={() => setIsSlideModalOpen(false)}
        onAddSlide={handleAddSlideFromModal}
        projectDuration={project.duration}
      />

      {/* Export Modal Component */}
      <ExportModal
        isOpen={isExportModalOpen || isExporting}
        onClose={() => {
          setIsExportModalOpen(false);
          setIsExporting(false);
        }}
        progress={exportProgress}
        exportedVideoUrl={exportedVideoUrl}
        onDownload={handleDownload}
        onStartExport={handleExport}
        isExporting={isExporting}
        currentFormat={exportedFormat}
      />
    </div>
  );
};
