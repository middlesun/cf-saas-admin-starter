import React, { useState } from 'react';
import { Project, ZoomEvent, AutoZoomSettings, ZoomStyle, ZoomBackOutBehavior } from '../../types';
import { DEFAULT_AUTO_ZOOM_SETTINGS, generateAutoZooms, clampFocusPoint } from '../../lib/zoomSystem';
import { Sparkles, ZoomIn, Play, Trash2, Sliders, ToggleLeft, ToggleRight, Plus, Target, Check, RotateCcw, Crosshair } from 'lucide-react';

interface ZoomPanelProps {
  project: Project;
  currentTime: number;
  selectedZoomId: string | null;
  onSelectZoom: (id: string | null) => void;
  onUpdateProject: (updatedProject: Project) => void;
  onSeek: (time: number) => void;
}

export const ZoomPanel: React.FC<ZoomPanelProps> = ({
  project,
  currentTime,
  selectedZoomId,
  onSelectZoom,
  onUpdateProject,
  onSeek,
}) => {
  const autoSettings: AutoZoomSettings = project.autoZoomSettings || DEFAULT_AUTO_ZOOM_SETTINGS;
  const zooms: ZoomEvent[] = project.zoomEvents || [];

  const [editingZoomId, setEditingZoomId] = useState<string | null>(selectedZoomId);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Sync selection
  const activeEditingZoom = zooms.find((z) => z.id === (editingZoomId || selectedZoomId));

  // Update Global Auto Zoom Settings
  const handleUpdateAutoSettings = (newSettings: Partial<AutoZoomSettings>) => {
    const updatedSettings: AutoZoomSettings = {
      ...autoSettings,
      ...newSettings,
    };

    let updatedZooms = [...zooms];
    // If turning ON auto zoom and no zooms exist, auto-generate them
    if (newSettings.enabled === true && zooms.length === 0) {
      updatedZooms = generateAutoZooms(project.clickAnimations, updatedSettings, project.duration);
    }

    onUpdateProject({
      ...project,
      autoZoomSettings: updatedSettings,
      zoomEvents: updatedZooms,
      updatedAt: Date.now(),
    });
  };

  // Re-generate Auto Zooms from interaction clicks
  const handleRegenerateAutoZooms = () => {
    const manualZooms = zooms.filter((z) => !z.isAuto);
    const newAutoZooms = generateAutoZooms(project.clickAnimations, autoSettings, project.duration);

    const merged = [...manualZooms, ...newAutoZooms].sort((a, b) => a.timestamp - b.timestamp);

    onUpdateProject({
      ...project,
      zoomEvents: merged,
      updatedAt: Date.now(),
    });
  };

  // Add Manual Zoom at Playhead
  const handleAddManualZoom = () => {
    const newZoom: ZoomEvent = {
      id: `zoom_manual_${Date.now()}`,
      timestamp: Math.round(currentTime * 10) / 10,
      duration: 2.5,
      zoomInSpeed: 0.5,
      zoomOutSpeed: 0.5,
      zoomLevel: autoSettings.defaultZoomLevel || 1.5,
      x: 50,
      y: 50,
      style: autoSettings.zoomStyle || 'smooth',
      isAuto: false,
      disabled: false,
      label: `Manual Zoom at ${currentTime.toFixed(1)}s`,
    };

    const updatedZooms = [...zooms, newZoom].sort((a, b) => a.timestamp - b.timestamp);

    onUpdateProject({
      ...project,
      zoomEvents: updatedZooms,
      updatedAt: Date.now(),
    });

    setEditingZoomId(newZoom.id);
    onSelectZoom(newZoom.id);
  };

  // Single Zoom Event Updates
  const handleUpdateZoom = (id: string, updates: Partial<ZoomEvent>) => {
    const updatedZooms = zooms.map((z) => {
      if (z.id !== id) return z;
      const updated = { ...z, ...updates };
      // Clamp focus point if level or coords change
      if (updates.x !== undefined || updates.y !== undefined || updates.zoomLevel !== undefined) {
        const clamped = clampFocusPoint(updated.x, updated.y, updated.zoomLevel);
        updated.x = clamped.x;
        updated.y = clamped.y;
      }
      return updated;
    });

    onUpdateProject({
      ...project,
      zoomEvents: updatedZooms,
      updatedAt: Date.now(),
    });
  };

  // Delete single zoom
  const handleDeleteZoom = (id: string) => {
    const updatedZooms = zooms.filter((z) => z.id !== id);
    onUpdateProject({
      ...project,
      zoomEvents: updatedZooms,
      updatedAt: Date.now(),
    });

    if (editingZoomId === id) setEditingZoomId(null);
    if (selectedZoomId === id) onSelectZoom(null);
  };

  // Toggle single zoom disabled
  const handleToggleZoomDisabled = (id: string) => {
    const updatedZooms = zooms.map((z) => (z.id === id ? { ...z, disabled: !z.disabled } : z));
    onUpdateProject({
      ...project,
      zoomEvents: updatedZooms,
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-100 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <ZoomIn className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100">Dynamic Zoom System</h3>
            <p className="text-[11px] text-slate-400">Intelligent focus & automatic camera zooms</p>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            showSettings
              ? 'bg-sky-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
          title="Global Automatic Zoom Settings"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Global Auto Zoom Switch & Controls */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-xs text-slate-200">Automatic Zoom</span>
            </div>

            <button
              onClick={() => handleUpdateAutoSettings({ enabled: !autoSettings.enabled })}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              {autoSettings.enabled ? (
                <ToggleRight className="w-6 h-6 text-sky-400" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-slate-600" />
              )}
              <span>{autoSettings.enabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Automatically detects meaningful interaction clicks during recording and creates smooth, intentional zoom keyframes.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleRegenerateAutoZooms}
              className="flex-1 py-2 px-3 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Detect Zooms ({project.clickAnimations.length} Clicks)</span>
            </button>

            <button
              onClick={handleAddManualZoom}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
              title="Add a manual zoom keyframe at playhead"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Zoom</span>
            </button>
          </div>
        </div>

        {/* Expanded Global Automatic Zoom Settings Modal / Drawer */}
        {showSettings && (
          <div className="p-4 rounded-xl bg-slate-950 border border-sky-500/30 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-xs text-sky-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" /> Global Automatic Zoom Settings
              </span>
              <button
                onClick={() => handleUpdateAutoSettings(DEFAULT_AUTO_ZOOM_SETTINGS)}
                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset Defaults
              </button>
            </div>

            {/* Default Zoom Level */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Default Zoom Level</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[1.1, 1.25, 1.5, 1.75, 2.0].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => handleUpdateAutoSettings({ defaultZoomLevel: lvl })}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      autoSettings.defaultZoomLevel === lvl
                        ? 'bg-sky-500 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {lvl}x
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom Duration */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Zoom Duration</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['fast', 'normal', 'slow'] as const).map((dur) => (
                  <button
                    key={dur}
                    onClick={() => handleUpdateAutoSettings({ zoomDuration: dur })}
                    className={`py-1.5 rounded-lg text-xs capitalize font-medium transition-all ${
                      autoSettings.zoomDuration === dur
                        ? 'bg-sky-500 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom Style */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Zoom Style / Easing</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['smooth', 'ease', 'cinematic', 'subtle'] as ZoomStyle[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateAutoSettings({ zoomStyle: st })}
                    className={`py-1.5 rounded-lg text-xs capitalize font-medium transition-all ${
                      autoSettings.zoomStyle === st
                        ? 'bg-sky-500 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom Back Out Behavior */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Zoom Back Out Behavior</label>
              <div className="space-y-1">
                {[
                  { id: 'immediate', label: 'Immediately after interaction' },
                  { id: 'delay', label: 'After a short delay (1.5s)' },
                  { id: 'keep', label: 'Keep zoomed until next action' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleUpdateAutoSettings({ zoomBackOut: opt.id as ZoomBackOutBehavior })}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                      autoSettings.zoomBackOut === opt.id
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {autoSettings.zoomBackOut === opt.id && <Check className="w-3.5 h-3.5 text-sky-400" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Selected / Active Zoom Keyframe Inspector */}
        {activeEditingZoom && (
          <div className="p-4 rounded-xl bg-slate-950 border border-sky-500/40 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-xs text-sky-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Edit Zoom Event
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSeek(activeEditingZoom.timestamp)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-mono"
                >
                  Jump to {activeEditingZoom.timestamp.toFixed(1)}s
                </button>
                <button
                  onClick={() => handleDeleteZoom(activeEditingZoom.id)}
                  className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
                  title="Delete Zoom"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Label Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Label / Description</label>
              <input
                type="text"
                value={activeEditingZoom.label || ''}
                onChange={(e) => handleUpdateZoom(activeEditingZoom.id, { label: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Zoom Level & Duration Slider */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Zoom Level</span>
                  <span className="font-mono text-sky-400 font-bold">{activeEditingZoom.zoomLevel.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="2.5"
                  step="0.05"
                  value={activeEditingZoom.zoomLevel}
                  onChange={(e) => handleUpdateZoom(activeEditingZoom.id, { zoomLevel: parseFloat(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Duration</span>
                  <span className="font-mono text-sky-400 font-bold">{activeEditingZoom.duration.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="8.0"
                  step="0.2"
                  value={activeEditingZoom.duration}
                  onChange={(e) => handleUpdateZoom(activeEditingZoom.id, { duration: parseFloat(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Focus Point Coordinates Pad */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-slate-400">Focus Point Target Position</label>
                <span className="font-mono text-[10px] text-slate-400">
                  X: {activeEditingZoom.x}% | Y: {activeEditingZoom.y}%
                </span>
              </div>

              {/* Interactive 2D Focus Target Pad */}
              <div
                className="relative aspect-video rounded-lg bg-slate-900 border border-slate-800 overflow-hidden cursor-crosshair group flex items-center justify-center"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  handleUpdateZoom(activeEditingZoom.id, { x: Math.round(x), y: Math.round(y) });
                }}
              >
                {/* Grid guidelines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20 pointer-events-none">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="border border-slate-600" />
                  ))}
                </div>

                {/* Target Crosshair Marker */}
                <div
                  className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-sky-400 bg-sky-500/30 flex items-center justify-center transition-all pointer-events-none shadow-lg shadow-sky-500/50"
                  style={{ left: `${activeEditingZoom.x}%`, top: `${activeEditingZoom.y}%` }}
                >
                  <Crosshair className="w-3 h-3 text-sky-300" />
                </div>

                <div className="absolute bottom-1 right-2 text-[9px] text-slate-500 pointer-events-none">
                  Click inside box to set focus area
                </div>
              </div>
            </div>

            {/* Speeds & Style */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Zoom-In Speed</label>
                <select
                  value={activeEditingZoom.zoomInSpeed || 0.5}
                  onChange={(e) => handleUpdateZoom(activeEditingZoom.id, { zoomInSpeed: parseFloat(e.target.value) })}
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200"
                >
                  <option value={0.3}>Fast (0.3s)</option>
                  <option value={0.5}>Normal (0.5s)</option>
                  <option value={0.8}>Slow (0.8s)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Style</label>
                <select
                  value={activeEditingZoom.style}
                  onChange={(e) => handleUpdateZoom(activeEditingZoom.id, { style: e.target.value as ZoomStyle })}
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 capitalize"
                >
                  <option value="smooth">Smooth</option>
                  <option value="ease">Ease In/Out</option>
                  <option value="cinematic">Cinematic</option>
                  <option value="subtle">Subtle</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Zooms List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-slate-300">Timeline Zoom Keyframes ({zooms.length})</h4>
            <span className="text-[10px] text-slate-500">Click to edit on preview</span>
          </div>

          {zooms.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-2">
              <ZoomIn className="w-6 h-6 mx-auto text-slate-600" />
              <p className="text-xs text-slate-400">No zoom events generated yet.</p>
              <button
                onClick={handleRegenerateAutoZooms}
                className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all"
              >
                Auto-Generate Zooms Now
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {zooms.map((zoom) => {
                const isSelected = (editingZoomId || selectedZoomId) === zoom.id;

                return (
                  <div
                    key={zoom.id}
                    onClick={() => {
                      setEditingZoomId(zoom.id);
                      onSelectZoom(zoom.id);
                      onSeek(zoom.timestamp);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-500/50 shadow-md shadow-sky-500/10'
                        : zoom.disabled
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-50'
                        : 'bg-slate-950/80 border-slate-800 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-sky-400 font-mono text-xs font-bold shrink-0">
                        {zoom.zoomLevel.toFixed(1)}x
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              zoom.isAuto
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            }`}
                          >
                            {zoom.isAuto ? 'Auto' : 'Manual'}
                          </span>
                          <span className="font-semibold text-xs text-slate-200 truncate">
                            {zoom.label || `Zoom @ ${zoom.timestamp.toFixed(1)}s`}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>
                            {zoom.timestamp.toFixed(1)}s - {(zoom.timestamp + zoom.duration).toFixed(1)}s
                          </span>
                          <span>•</span>
                          <span>Focus: ({zoom.x}%, {zoom.y}%)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleZoomDisabled(zoom.id)}
                        className={`p-1.5 rounded-lg text-xs transition-colors ${
                          zoom.disabled ? 'text-slate-600 hover:text-slate-400' : 'text-sky-400 hover:bg-slate-800'
                        }`}
                        title={zoom.disabled ? 'Enable Zoom' : 'Disable Zoom'}
                      >
                        {zoom.disabled ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => onSeek(zoom.timestamp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        title="Seek playhead to zoom"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteZoom(zoom.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Zoom"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
