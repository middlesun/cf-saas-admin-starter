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
import { Scissors, MousePointerClick, MessageSquare, Layers, Music, Save, Check, Undo2, Redo2, Sparkles, ZoomIn } from 'lucide-react';

interface EditorViewProps {
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onGoHome: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({ project, onUpdateProject, onGoHome }) => {
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
      {layoutViewMode === 'widescreen' ? (
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

            {/* Timeline */}
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

            {/* Timeline */}
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
      )}

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
