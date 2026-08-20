import React, { useRef, useState } from 'react';
import { Project } from '../types';
import { Video, Plus, Upload, Play, Copy, Trash2, Clock, Sparkles, Wand2, Shield, ArrowRight, Download, CheckSquare, Square, FolderArchive } from 'lucide-react';
import { downloadProjectFile } from '../lib/projectPackage';

interface HomeScreenProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onNewRecording: () => void;
  onImportVideo: (file: File) => void;
  onImportProject?: (file: File) => void;
  onCreateSampleProject: (template: 'saas' | 'api' | 'ecom') => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onDeleteProjects?: (ids: string[]) => void;
  isGeneratingSample: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  projects,
  onSelectProject,
  onNewRecording,
  onImportVideo,
  onImportProject,
  onCreateSampleProject,
  onDuplicateProject,
  onDeleteProject,
  onDeleteProjects,
  isGeneratingSample,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.demoproj') || file.name.endsWith('.json')) {
        if (onImportProject) onImportProject(file);
        else onImportVideo(file);
      } else {
        onImportVideo(file);
      }
      e.target.value = '';
    }
  };

  const handleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onImportProject) {
        onImportProject(file);
      } else {
        onImportVideo(file);
      }
      e.target.value = '';
    }
  };

  const toggleSelectProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedProjectIds.length === projects.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(projects.map((p) => p.id));
    }
  };

  const handleDownloadVideo = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = proj.sourceVideoBlobUrl || (proj.sourceVideoBlob ? URL.createObjectURL(proj.sourceVideoBlob) : null);
    if (!url) {
      alert('No video file available for download in this project.');
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proj.name.replace(/[^a-z0-9_-]/gi, '_') || 'demo'}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportProjectFile = async (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await downloadProjectFile(proj);
    } catch (err) {
      console.error('Failed to export project file:', err);
      alert('Could not export project file. Please ensure project video is loaded.');
    }
  };

  const handleDownloadSelected = async () => {
    const selectedProjs = projects.filter((p) => selectedProjectIds.includes(p.id));
    for (let i = 0; i < selectedProjs.length; i++) {
      handleDownloadVideo(selectedProjs[i]);
      await new Promise((r) => setTimeout(r, 400));
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < projects.length; i++) {
      handleDownloadVideo(projects[i]);
      await new Promise((r) => setTimeout(r, 400));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedProjectIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedProjectIds.length} selected recording(s)?`)) {
      if (onDeleteProjects) {
        onDeleteProjects(selectedProjectIds);
      } else {
        selectedProjectIds.forEach(onDeleteProject);
      }
      setSelectedProjectIds([]);
    }
  };

  const handleDeleteAll = () => {
    if (projects.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ALL ${projects.length} recording(s)? This action cannot be undone.`)) {
      const allIds = projects.map((p) => p.id);
      if (onDeleteProjects) {
        onDeleteProjects(allIds);
      } else {
        allIds.forEach(onDeleteProject);
      }
      setSelectedProjectIds([]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      {/* Hero Banner Section */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 p-8 sm:p-12 overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
            <span>Create Product walkthroughs and SAAS Demos</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight">
            Create polished product demos <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-500">
              without recording your voice.
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
            Record your browser app, trim mistakes, add automatic click ripples, explanatory text callouts,
            title transitions, and background audio in minutes.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onNewRecording}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm flex items-center gap-2.5 shadow-xl shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Video className="w-4 h-4 fill-white/20" />
              <span>Record Screen / Tab</span>
            </button>

            <button
              onClick={() => projectInputRef.current?.click()}
              className="px-5 py-3.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-semibold text-sm flex items-center gap-2 transition-all shadow-md shadow-emerald-500/10"
              title="Import previously saved .demoproj project package"
            >
              <FolderArchive className="w-4 h-4 text-emerald-400" />
              <span>Import Project (.demoproj)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-semibold text-sm flex items-center gap-2 transition-all"
              title="Import MP4 / WebM / MOV raw video"
            >
              <Upload className="w-4 h-4 text-slate-400" />
              <span>Import Video</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="video/mp4,video/webm,video/quicktime,.demoproj,.json"
              className="hidden"
            />

            <input
              type="file"
              ref={projectInputRef}
              onChange={handleProjectFileChange}
              accept=".demoproj,.json,application/json"
              className="hidden"
            />
          </div>

          {/* Quick Privacy Notice */}
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Your recordings and projects stay 100% private on your machine. No cloud uploads required.</span>
          </div>
        </div>
      </div>

      {/* Quick Start Templates / Sample Generator */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-sky-400" />
              <span>Instant Sample Demo Templates</span>
            </h2>
            <p className="text-xs text-slate-400">Test editor features immediately with pre-recorded app canvas demos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => !isGeneratingSample && onCreateSampleProject('saas')}
            className={`p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-sky-500/50 hover:bg-slate-800 transition-all cursor-pointer group relative overflow-hidden ${
              isGeneratingSample ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                SaaS Dashboard
              </span>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-semibold text-slate-200 text-sm mb-1">Metrics & Overview Demo</h3>
            <p className="text-xs text-slate-400">Pre-loaded with click ripples, callouts, and background music</p>
          </div>

          <div
            onClick={() => !isGeneratingSample && onCreateSampleProject('api')}
            className={`p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-sky-500/50 hover:bg-slate-800 transition-all cursor-pointer group relative overflow-hidden ${
              isGeneratingSample ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                API Walkthrough
              </span>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-semibold text-slate-200 text-sm mb-1">API Setup & Key Copying</h3>
            <p className="text-xs text-slate-400">Includes transition card and typewriter speech bubble annotations</p>
          </div>

          <div
            onClick={() => !isGeneratingSample && onCreateSampleProject('ecom')}
            className={`p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-sky-500/50 hover:bg-slate-800 transition-all cursor-pointer group relative overflow-hidden ${
              isGeneratingSample ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Product Demo
              </span>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-semibold text-slate-200 text-sm mb-1">Feature Demonstration</h3>
            <p className="text-xs text-slate-400">Clean canvas layout ready for custom click animations</p>
          </div>
        </div>
      </div>

      {/* Recent Projects Section */}
      <div id="projects-section" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Recent Projects</span>
            <span className="text-xs font-normal text-slate-400">({projects.length})</span>
          </h2>

          {projects.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={handleSelectAll}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
              >
                {selectedProjectIds.length === projects.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{selectedProjectIds.length === projects.length ? 'Deselect All' : 'Select All'}</span>
              </button>

              {selectedProjectIds.length > 0 ? (
                <>
                  <button
                    onClick={handleDownloadSelected}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold flex items-center gap-1.5 shadow-md transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Selected ({selectedProjectIds.length})</span>
                  </button>

                  <button
                    onClick={handleDeleteSelected}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold flex items-center gap-1.5 border border-rose-500/30 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Delete Selected ({selectedProjectIds.length})</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleDownloadAll}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
                    title="Download all project videos"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>Download All</span>
                  </button>

                  <button
                    onClick={handleDeleteAll}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 font-semibold flex items-center gap-1.5 border border-slate-700 hover:border-rose-500/30 transition-all"
                    title="Delete all project videos"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <Video className="w-8 h-8" />
            </div>
            <div className="max-w-sm mx-auto space-y-1">
              <h3 className="font-semibold text-slate-200 text-base">No demo projects yet</h3>
              <p className="text-xs text-slate-400">
                Start by recording your screen, importing a video file, or loading a sample template above.
              </p>
            </div>
            <button
              onClick={() => onCreateSampleProject('saas')}
              disabled={isGeneratingSample}
              className="px-4 py-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 text-xs font-semibold transition-all inline-flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load SaaS Sample Demo</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => {
              const isSelected = selectedProjectIds.includes(proj.id);
              return (
                <div
                  key={proj.id}
                  className={`group bg-slate-800/80 rounded-xl border transition-all flex flex-col justify-between ${
                    isSelected ? 'border-sky-500 ring-2 ring-sky-500/30' : 'border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  {/* Video Preview Card Header */}
                  <div
                    className="relative aspect-video bg-slate-950 flex items-center justify-center cursor-pointer overflow-hidden"
                    onClick={() => onSelectProject(proj.id)}
                  >
                    {proj.sourceVideoBlobUrl ? (
                      <video
                        src={proj.sourceVideoBlobUrl}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300 opacity-80 group-hover:opacity-100"
                        muted
                        preload="metadata"
                      />
                    ) : (
                      <div className="text-slate-600">No Video Preview</div>
                    )}

                    {/* Selection Checkbox Badge */}
                    <button
                      onClick={(e) => toggleSelectProject(proj.id, e)}
                      className={`absolute top-2 left-2 z-10 p-1.5 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-sky-500 text-white shadow-lg'
                          : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-700'
                      }`}
                      title={isSelected ? 'Deselect recording' : 'Select recording'}
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>

                    {/* Play Overlay Button */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/50 scale-90 group-hover:scale-100 transition-all">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Duration Badge */}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[11px] font-mono text-slate-200">
                      {formatSeconds(proj.duration)}
                    </div>
                  </div>

                  {/* Info Footer */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3
                        className="font-semibold text-slate-100 text-sm hover:text-sky-400 cursor-pointer transition-colors truncate"
                        onClick={() => onSelectProject(proj.id)}
                      >
                        {proj.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Updated {new Date(proj.updatedAt).toLocaleDateString()} • {proj.annotations.length} annotations • {proj.clickAnimations.length} clicks
                      </p>
                    </div>

                    {/* Card Controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                      <button
                        onClick={() => onSelectProject(proj.id)}
                        className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-semibold transition-all"
                      >
                        Open Editor
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleExportProjectFile(proj, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                          title="Export Project File (.demoproj)"
                        >
                          <FolderArchive className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => handleDownloadVideo(proj, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-all"
                          title="Download Raw Video"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDuplicateProject(proj.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-all"
                          title="Duplicate Project"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteProject(proj.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

