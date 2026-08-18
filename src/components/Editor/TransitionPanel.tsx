import React, { useState } from 'react';
import { TransitionCard, TransitionStyle } from '../../types';
import { Layers, Plus, Trash2, Palette, Bookmark, Sparkles, LayoutTemplate } from 'lucide-react';
import { getAllPresets, saveCustomPreset, DEFAULT_PRESETS } from '../../lib/presets';
import { SlideCustomizerPanel } from './SlideCustomizerPanel';

interface TransitionPanelProps {
  transitions: TransitionCard[];
  selectedTransitionId?: string | null;
  currentTime: number;
  onAddTransition: (transition: TransitionCard) => void;
  onUpdateTransition: (transition: TransitionCard) => void;
  onDeleteTransition: (id: string) => void;
  onSelectTransition: (id: string | null) => void;
  onOpenSlideModal?: () => void;
}

export const TransitionPanel: React.FC<TransitionPanelProps> = ({
  transitions,
  selectedTransitionId,
  currentTime,
  onAddTransition,
  onUpdateTransition,
  onDeleteTransition,
  onSelectTransition,
  onOpenSlideModal,
}) => {
  const selectedTransition = transitions.find((t) => t.id === selectedTransitionId);
  const [presets, setPresets] = useState(getAllPresets());
  const [presetNameInput, setPresetNameInput] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  const handleAddNew = () => {
    const newTr: TransitionCard = {
      id: 'trans_' + Date.now(),
      title: 'Now let\'s explore API configuration',
      subtitle: 'Step 2: Authenticating request header',
      style: 'saas',
      timestamp: currentTime,
      duration: 2.5,
      bgColor: '#0f172a',
      textColor: '#38bdf8',
      fontSize: 32,
      alignment: 'center',
    };
    onAddTransition(newTr);
    onSelectTransition(newTr.id);
  };

  const styles: { id: TransitionStyle; name: string; desc: string }[] = [
    { id: 'saas', name: 'SaaS Modern Card', desc: 'Floating glass card with accent glow' },
    { id: 'gradient', name: 'Gradient Background', desc: 'Full-screen vibrant linear gradient' },
    { id: 'minimal', name: 'Minimal Title', desc: 'Clean title with subtle background' },
    { id: 'centered', name: 'Large Centered', desc: 'Bold punchy hero typography' },
    { id: 'slide', name: 'Slide Transition', desc: 'Sliding title card' },
    { id: 'zoom', name: 'Zoom Card', desc: 'Dynamic zoom-in card' },
  ];

  const applyPreset = (presetId: string) => {
    if (!selectedTransition) return;
    const found = presets.find((p) => p.id === presetId);
    if (!found) return;

    onUpdateTransition({
      ...selectedTransition,
      bgColor: found.transitionBgColor || '#0f172a',
      textColor: found.transitionTextColor || '#38bdf8',
      fontFamily: found.transitionFontFamily || 'system-ui, sans-serif',
      fontSize: found.transitionFontSize || 32,
    });
  };

  const handleSaveCurrentAsPreset = () => {
    if (!selectedTransition || !presetNameInput.trim()) return;
    const newPreset = {
      id: 'custom_' + Date.now(),
      name: presetNameInput.trim(),
      description: 'Custom user preset',
      isCustom: true,
      transitionBgColor: selectedTransition.bgColor || '#0f172a',
      transitionTextColor: selectedTransition.textColor || '#38bdf8',
      transitionStyle: selectedTransition.style || 'saas',
      transitionFontSize: selectedTransition.fontSize || 32,
      transitionFontFamily: selectedTransition.fontFamily || 'system-ui, sans-serif',
      calloutBgColor: selectedTransition.bgColor || '#0284c7',
      calloutTextColor: '#ffffff',
      calloutStyle: 'rounded' as const,
      calloutFontFamily: selectedTransition.fontFamily || 'system-ui, sans-serif',
      calloutFontSize: 16,
      clickColor: '#38bdf8',
      clickStyle: 'ripple' as const,
    };
    saveCustomPreset(newPreset);
    setPresets(getAllPresets());
    setPresetNameInput('');
    setShowSavePreset(false);
  };

  return (
    <div className="space-y-5 p-1">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>Full-Screen Title Cards & Slides</span>
        </h3>

        <div className="flex items-center gap-2">
          {onOpenSlideModal && (
            <button
              onClick={onOpenSlideModal}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/20"
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>Intro & Outro Templates</span>
            </button>
          )}

          <button
            onClick={handleAddNew}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Title Card at {currentTime.toFixed(1)}s</span>
          </button>
        </div>
      </div>

      {/* Style Presets Quick Switch Bar */}
      <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Style Presets (Gradients & Colors)</span>
          </span>
          {selectedTransition && (
            <button
              onClick={() => setShowSavePreset(!showSavePreset)}
              className="text-[11px] text-sky-400 hover:underline font-medium flex items-center gap-1"
            >
              <Bookmark className="w-3 h-3" />
              <span>Save Current as Preset</span>
            </button>
          )}
        </div>

        {showSavePreset && (
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Preset Name (e.g., Midnight Neon)"
              value={presetNameInput}
              onChange={(e) => setPresetNameInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={handleSaveCurrentAsPreset}
              className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold"
            >
              Save
            </button>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 flex items-center gap-2 text-xs font-medium shrink-0 transition-all hover:scale-105"
            >
              <div
                className="w-4 h-4 rounded-full border border-white/20"
                style={{ backgroundColor: preset.transitionBgColor || '#0f172a' }}
              />
              <span className="text-slate-200">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {transitions.length === 0 ? (
        <div className="p-6 text-center bg-slate-900/50 rounded-xl border border-slate-800 space-y-2">
          <Layers className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400">No transition title cards inserted yet.</p>
          <button
            onClick={handleAddNew}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold"
          >
            + Insert Transition Title Card
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* List Selector */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {transitions.map((tr) => (
              <button
                key={tr.id}
                onClick={() => onSelectTransition(tr.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 max-w-[180px] truncate transition-all ${
                  tr.id === selectedTransitionId
                    ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tr.title.substring(0, 18)}...
              </button>
            ))}
          </div>

          {selectedTransition && (
            selectedTransition.slideType || selectedTransition.templateId ? (
              <SlideCustomizerPanel
                slide={selectedTransition}
                onUpdateSlide={onUpdateTransition}
                onDeleteSlide={onDeleteTransition}
              />
            ) : (
              <div className="space-y-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              {/* Title & Subtitle */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Transition Title</label>
                  <input
                    type="text"
                    value={selectedTransition.title}
                    onChange={(e) => onUpdateTransition({ ...selectedTransition, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Subtitle (Optional)</label>
                  <input
                    type="text"
                    value={selectedTransition.subtitle || ''}
                    onChange={(e) => onUpdateTransition({ ...selectedTransition, subtitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Transition Style Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Transition Layout & Animation</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {styles.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => onUpdateTransition({ ...selectedTransition, style: st.id })}
                      className={`p-2.5 rounded-lg text-left border transition-all ${
                        selectedTransition.style === st.id
                          ? 'bg-sky-500/15 border-sky-500 text-sky-400'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-semibold text-xs">{st.name}</div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{st.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography Options: Font, Align, Colors */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Font Family</label>
                  <select
                    value={selectedTransition.fontFamily || 'system-ui, -apple-system, sans-serif'}
                    onChange={(e) => onUpdateTransition({ ...selectedTransition, fontFamily: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:border-sky-500"
                  >
                    <option value="system-ui, -apple-system, sans-serif">System Sans</option>
                    <option value="Plus Jakarta Sans, sans-serif">Plus Jakarta Sans</option>
                    <option value="Playfair Display, serif">Playfair Display (Serif)</option>
                    <option value="JetBrains Mono, monospace">JetBrains Mono (Code)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Alignment</label>
                  <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                    {(['left', 'center'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => onUpdateTransition({ ...selectedTransition, alignment: align })}
                        className={`flex-1 py-1 rounded text-[11px] font-semibold capitalize transition-all ${
                          (selectedTransition.alignment || 'center') === align
                            ? 'bg-sky-500 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Title Color</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedTransition.textColor || '#38bdf8'}
                      onChange={(e) => onUpdateTransition({ ...selectedTransition, textColor: e.target.value })}
                      className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer shrink-0"
                    />
                    <div className="flex gap-1 overflow-x-auto">
                      {['#38bdf8', '#ffffff', '#fbbf24', '#f43f5e', '#34d399'].map((c) => (
                        <button
                          key={c}
                          onClick={() => onUpdateTransition({ ...selectedTransition, textColor: c })}
                          style={{ backgroundColor: c }}
                          className="w-4 h-4 rounded-full border border-slate-700 shrink-0"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Background Color Picker */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-sky-400" />
                  <span>Card / Background Color</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={selectedTransition.bgColor || '#0f172a'}
                    onChange={(e) => onUpdateTransition({ ...selectedTransition, bgColor: e.target.value })}
                    className="w-9 h-9 rounded border-0 bg-transparent cursor-pointer shrink-0"
                  />
                  <div className="flex gap-1.5 overflow-x-auto">
                    {['#0f172a', '#0284c7', '#7c3aed', '#10b981', '#020617', '#881337'].map((c) => (
                      <button
                        key={c}
                        onClick={() => onUpdateTransition({ ...selectedTransition, bgColor: c })}
                        style={{ backgroundColor: c }}
                        className="w-6 h-6 rounded-full border border-slate-700 hover:scale-110 transition-transform shrink-0"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Duration & Font Size Sliders */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Card Duration</span>
                    <span className="text-sky-400">{selectedTransition.duration}s</span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={6.0}
                    step={0.5}
                    value={selectedTransition.duration}
                    onChange={(e) =>
                      onUpdateTransition({ ...selectedTransition, duration: parseFloat(e.target.value) })
                    }
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Title Font Size</span>
                    <span className="text-sky-400">{selectedTransition.fontSize || 32}px</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={56}
                    value={selectedTransition.fontSize || 32}
                    onChange={(e) =>
                      onUpdateTransition({ ...selectedTransition, fontSize: parseInt(e.target.value) })
                    }
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Delete Button */}
              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  onClick={() => onDeleteTransition(selectedTransition.id)}
                  className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Transition Card</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
