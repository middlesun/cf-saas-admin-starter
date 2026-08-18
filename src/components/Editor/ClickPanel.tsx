import React from 'react';
import { ClickAnimation, ClickStyle } from '../../types';
import { MousePointerClick, Plus, Trash2, Volume2 } from 'lucide-react';
import { playClickSoundEffect } from '../../lib/audioSynth';

interface ClickPanelProps {
  clickAnimations: ClickAnimation[];
  selectedClickId?: string | null;
  currentTime: number;
  onAddClick: (click: ClickAnimation) => void;
  onUpdateClick: (click: ClickAnimation) => void;
  onDeleteClick: (id: string) => void;
  onSelectClick: (id: string | null) => void;
}

export const ClickPanel: React.FC<ClickPanelProps> = ({
  clickAnimations,
  selectedClickId,
  currentTime,
  onAddClick,
  onUpdateClick,
  onDeleteClick,
  onSelectClick,
}) => {
  const selectedClick = clickAnimations.find((c) => c.id === selectedClickId);

  const handleAddNew = () => {
    const newClick: ClickAnimation = {
      id: 'click_' + Date.now(),
      timestamp: currentTime,
      x: 50,
      y: 50,
      style: 'ripple',
      size: 45,
      duration: 0.6,
      color: '#38bdf8',
      playSound: true,
    };
    onAddClick(newClick);
    onSelectClick(newClick.id);
    playClickSoundEffect();
  };

  const styles: { id: ClickStyle; name: string; desc: string }[] = [
    { id: 'ripple', name: 'Ripple', desc: 'Expanding ring with smooth fade' },
    { id: 'highlight', name: 'Highlight Ring', desc: 'Glowing circular ring around target' },
    { id: 'pulse', name: 'Pulse', desc: 'Pulsing dot target aura' },
    { id: 'spotlight', name: 'Spotlight', desc: 'Highlights target, dims background' },
    { id: 'cursor', name: 'Cursor + Click', desc: 'Animated mouse pointer clicking' },
  ];

  const colors = ['#38bdf8', '#0284c7', '#f43f5e', '#10b981', '#f59e0b', '#ffffff'];

  return (
    <div className="space-y-5 p-1">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
          <MousePointerClick className="w-4 h-4 text-sky-400" />
          <span>Click Animations</span>
        </h3>

        <button
          onClick={handleAddNew}
          className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/20"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Click at {currentTime.toFixed(1)}s</span>
        </button>
      </div>

      {clickAnimations.length === 0 ? (
        <div className="p-6 text-center bg-slate-900/50 rounded-xl border border-slate-800 space-y-2">
          <MousePointerClick className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400">No click animations added at this timestamp.</p>
          <button
            onClick={handleAddNew}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold"
          >
            + Add First Click Effect
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* List Selector */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {clickAnimations.map((clk) => (
              <button
                key={clk.id}
                onClick={() => onSelectClick(clk.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all ${
                  clk.id === selectedClickId
                    ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {clk.style.toUpperCase()} @ {clk.timestamp.toFixed(1)}s
              </button>
            ))}
          </div>

          {selectedClick && (
            <div className="space-y-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              {/* Style Grid */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Animation Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {styles.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        onUpdateClick({ ...selectedClick, style: st.id });
                        playClickSoundEffect();
                      }}
                      className={`p-2.5 rounded-lg text-left border transition-all ${
                        selectedClick.style === st.id
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

              {/* Size & Duration Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Effect Size</span>
                    <span className="text-sky-400">{selectedClick.size}px</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    value={selectedClick.size}
                    onChange={(e) => onUpdateClick({ ...selectedClick, size: parseInt(e.target.value) })}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Duration</span>
                    <span className="text-sky-400">{selectedClick.duration}s</span>
                  </div>
                  <input
                    type="range"
                    min={0.3}
                    max={1.5}
                    step={0.1}
                    value={selectedClick.duration}
                    onChange={(e) => onUpdateClick({ ...selectedClick, duration: parseFloat(e.target.value) })}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Color & Sound */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-300 block">Accent Color</span>
                  <div className="flex gap-2">
                    {colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => onUpdateClick({ ...selectedClick, color: c })}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          selectedClick.color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onUpdateClick({ ...selectedClick, playSound: !selectedClick.playSound })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                      selectedClick.playSound
                        ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Sound Effect</span>
                  </button>

                  <button
                    onClick={() => onDeleteClick(selectedClick.id)}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="Delete click animation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
