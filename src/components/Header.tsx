import React from 'react';
import { Video, Plus, Clock, Sparkles, FileVideo, Palette, Undo2, Redo2, Save, Check, ChevronDown } from 'lucide-react';

interface HeaderProps {
  onNewRecording: () => void;
  onGoHome: () => void;
  currentView: 'home' | 'editor';
  projectName?: string;
  onExportVideo?: () => void;
  onScrollToProjects?: () => void;
  onOpenGraphicsCreator?: () => void;
  onOpenSlideModal?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isSaved?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onNewRecording,
  onGoHome,
  currentView,
  projectName,
  onExportVideo,
  onScrollToProjects,
  onOpenGraphicsCreator,
  onOpenSlideModal,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isSaved = false,
}) => {
  const handleMyProjectsClick = () => {
    if (currentView === 'editor') {
      onGoHome();
      setTimeout(() => {
        document.getElementById('projects-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      if (onScrollToProjects) {
        onScrollToProjects();
      } else {
        document.getElementById('projects-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="h-11 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40 shrink-0">
      {/* Brand & Project Selector */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 cursor-pointer select-none group"
          onClick={onGoHome}
          title="Return to Home"
        >
          <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Video className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h1 className="font-bold text-slate-100 text-sm tracking-tight hidden sm:block">
            SAAS Demo Creator
          </h1>
        </div>

        {/* Editor Project Selector / Name Display */}
        {currentView === 'editor' && projectName && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-xs cursor-pointer max-w-[200px] sm:max-w-xs">
            <FileVideo className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-medium text-slate-200 truncate text-[11px]">{projectName}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5" />
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex items-center gap-2">
        {onOpenGraphicsCreator && (
          <button
            onClick={onOpenGraphicsCreator}
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Open Canva Graphics Creator"
          >
            <Palette className="w-3.5 h-3.5 text-purple-200" />
            <span>Canva</span>
            <span className="px-1 py-0.2 rounded text-[9px] bg-purple-400/30 font-semibold text-purple-200 uppercase tracking-wider ml-0.5">Beta</span>
          </button>
        )}

        <button
          onClick={handleMyProjectsClick}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
          title="View my saved demo projects"
        >
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden md:inline">My Projects</span>
        </button>

        {currentView === 'editor' ? (
          <>
            <button
              onClick={onNewRecording}
              className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Start a new screen or tab recording"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">New Recording</span>
            </button>

            {onOpenSlideModal && (
              <button
                onClick={onOpenSlideModal}
                className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5] text-sky-400" />
                <span className="hidden sm:inline">Intro / Outro Templates</span>
                <span className="sm:hidden">Templates</span>
              </button>
            )}

            {/* Undo / Redo */}
            {onUndo && onRedo && (
              <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={onUndo}
                  disabled={!canUndo}
                  title="Undo edit"
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onRedo}
                  disabled={!canRedo}
                  title="Redo edit"
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {onExportVideo && (
              <button
                onClick={onExportVideo}
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 fill-white/20" />
                <span>Export</span>
              </button>
            )}
          </>
        ) : (
          <button
            onClick={onNewRecording}
            className="px-3.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Recording</span>
          </button>
        )}
      </div>
    </header>
  );
};


