import React from 'react';
import { TextAnnotation, AnnotationStyle, AnnotationAnimation } from '../../types';
import { MessageSquare, Plus, Trash2, Type, Sparkles } from 'lucide-react';

interface AnnotationPanelProps {
  annotations: TextAnnotation[];
  selectedAnnotationId?: string | null;
  currentTime: number;
  onAddAnnotation: (annotation: TextAnnotation) => void;
  onUpdateAnnotation: (annotation: TextAnnotation) => void;
  onDeleteAnnotation: (id: string) => void;
  onSelectAnnotation: (id: string | null) => void;
}

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  annotations,
  selectedAnnotationId,
  currentTime,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onSelectAnnotation,
}) => {
  const selectedAnnotation = annotations.find((a) => a.id === selectedAnnotationId);

  const handleAddNew = () => {
    const newAnn: TextAnnotation = {
      id: 'ann_' + Date.now(),
      text: 'This is an explanatory callout. Double click or edit text here.',
      style: 'rounded',
      animation: 'typewriter',
      startTime: currentTime,
      duration: 3.5,
      x: 30,
      y: 40,
      fontSize: 15,
      textColor: '#ffffff',
      bgColor: '#0284c7',
      opacity: 0.95,
      arrowDirection: 'top',
    };
    onAddAnnotation(newAnn);
    onSelectAnnotation(newAnn.id);
  };

  const styles: { id: AnnotationStyle; name: string; desc: string }[] = [
    { id: 'rounded', name: 'Rounded Callout', desc: 'Modern card with subtle shadow & arrow' },
    { id: 'speech', name: 'Speech Bubble', desc: 'Chat bubble pointing to UI element' },
    { id: 'floating', name: 'Floating Card', desc: 'Sleek dark floating card' },
    { id: 'highlight', name: 'Highlight + Label', desc: 'Bounding ring box + label tag' },
    { id: 'minimal', name: 'Minimal Caption', desc: 'Bottom banner overlay bar' },
  ];

  const animations: { id: AnnotationAnimation; name: string }[] = [
    { id: 'typewriter', name: 'Typewriter Typing' },
    { id: 'fade', name: 'Fade In' },
    { id: 'slide', name: 'Slide In' },
    { id: 'pop', name: 'Scale Pop' },
    { id: 'expand', name: 'Smooth Expand' },
  ];

  const bgColors = ['#0284c7', '#0f172a', '#1e293b', '#f43f5e', '#10b981', '#7c3aed'];

  return (
    <div className="space-y-5 p-1">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-sky-400" />
          <span>Walkthrough Text Annotations</span>
        </h3>

        <button
          onClick={handleAddNew}
          className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/20"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Callout at {currentTime.toFixed(1)}s</span>
        </button>
      </div>

      {annotations.length === 0 ? (
        <div className="p-6 text-center bg-slate-900/50 rounded-xl border border-slate-800 space-y-2">
          <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400">No explanatory callout annotations added yet.</p>
          <button
            onClick={handleAddNew}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold"
          >
            + Add Callout Annotation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* List Selector */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {annotations.map((ann) => (
              <button
                key={ann.id}
                onClick={() => onSelectAnnotation(ann.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 max-w-[180px] truncate transition-all ${
                  ann.id === selectedAnnotationId
                    ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {ann.text.substring(0, 18)}...
              </button>
            ))}
          </div>

          {selectedAnnotation && (
            <div className="space-y-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              {/* Text Area Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-sky-400" />
                  <span>Callout Text Content</span>
                </label>
                <textarea
                  value={selectedAnnotation.text}
                  onChange={(e) => onUpdateAnnotation({ ...selectedAnnotation, text: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                  placeholder="Enter explanatory walkthrough text..."
                />
              </div>

              {/* Style Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Visual Card Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {styles.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => onUpdateAnnotation({ ...selectedAnnotation, style: st.id })}
                      className={`p-2.5 rounded-lg text-left border transition-all ${
                        selectedAnnotation.style === st.id
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

              {/* Entrance Animation Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>Entrance Animation Effect</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {animations.map((anim) => (
                    <button
                      key={anim.id}
                      onClick={() => onUpdateAnnotation({ ...selectedAnnotation, animation: anim.id })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedAnnotation.animation === anim.id
                          ? 'bg-sky-500 text-white font-semibold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {anim.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography Options: Font Family, Weight, Align, Colors */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Font Family</label>
                  <select
                    value={selectedAnnotation.fontFamily || 'system-ui, -apple-system, sans-serif'}
                    onChange={(e) => onUpdateAnnotation({ ...selectedAnnotation, fontFamily: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:border-sky-500"
                  >
                    <option value="system-ui, -apple-system, sans-serif">System Modern Sans</option>
                    <option value="Plus Jakarta Sans, sans-serif">Plus Jakarta Sans</option>
                    <option value="Playfair Display, serif">Playfair Display (Serif)</option>
                    <option value="JetBrains Mono, monospace">JetBrains Mono (Code)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Text Align</label>
                  <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => onUpdateAnnotation({ ...selectedAnnotation, textAlign: align })}
                        className={`flex-1 py-1 rounded text-[11px] font-semibold capitalize transition-all ${
                          (selectedAnnotation.textAlign || 'left') === align
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
                  <label className="text-xs font-semibold text-slate-300">Text Style</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        onUpdateAnnotation({
                          ...selectedAnnotation,
                          fontWeight: selectedAnnotation.fontWeight === 'bold' ? '600' : 'bold',
                        })
                      }
                      className={`flex-1 py-1 rounded text-xs font-bold border transition-all ${
                        selectedAnnotation.fontWeight === 'bold'
                          ? 'bg-sky-500 border-sky-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      B
                    </button>
                    <button
                      onClick={() =>
                        onUpdateAnnotation({
                          ...selectedAnnotation,
                          fontStyle: selectedAnnotation.fontStyle === 'italic' ? 'normal' : 'italic',
                        })
                      }
                      className={`flex-1 py-1 rounded text-xs italic border transition-all ${
                        selectedAnnotation.fontStyle === 'italic'
                          ? 'bg-sky-500 border-sky-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      I
                    </button>
                  </div>
                </div>
              </div>

              {/* Sliders: Duration & Font Size */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Display Duration</span>
                    <span className="text-sky-400">{selectedAnnotation.duration}s</span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={8.0}
                    step={0.5}
                    value={selectedAnnotation.duration}
                    onChange={(e) =>
                      onUpdateAnnotation({ ...selectedAnnotation, duration: parseFloat(e.target.value) })
                    }
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Font Size</span>
                    <span className="text-sky-400">{selectedAnnotation.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={32}
                    value={selectedAnnotation.fontSize || 16}
                    onChange={(e) =>
                      onUpdateAnnotation({ ...selectedAnnotation, fontSize: parseInt(e.target.value) })
                    }
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Text Color & Background Color Customization */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-2 gap-4">
                  {/* Text Color */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Text Color</span>
                      <span className="font-mono text-[10px] text-slate-400">{selectedAnnotation.textColor || '#ffffff'}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedAnnotation.textColor || '#ffffff'}
                        onChange={(e) => onUpdateAnnotation({ ...selectedAnnotation, textColor: e.target.value })}
                        className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer shrink-0"
                      />
                      <div className="flex gap-1 overflow-x-auto">
                        {['#ffffff', '#000000', '#38bdf8', '#f43f5e', '#fbbf24', '#34d399'].map((c) => (
                          <button
                            key={c}
                            onClick={() => onUpdateAnnotation({ ...selectedAnnotation, textColor: c })}
                            style={{ backgroundColor: c }}
                            className="w-5 h-5 rounded-full border border-slate-700 hover:scale-110 transition-transform shrink-0"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Background Color */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Background Color</span>
                      <span className="font-mono text-[10px] text-slate-400">{selectedAnnotation.bgColor || '#0284c7'}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedAnnotation.bgColor || '#0284c7'}
                        onChange={(e) => onUpdateAnnotation({ ...selectedAnnotation, bgColor: e.target.value })}
                        className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer shrink-0"
                      />
                      <div className="flex gap-1 overflow-x-auto">
                        {['#0284c7', '#0f172a', '#1e293b', '#f43f5e', '#10b981', '#7c3aed'].map((c) => (
                          <button
                            key={c}
                            onClick={() => onUpdateAnnotation({ ...selectedAnnotation, bgColor: c })}
                            style={{ backgroundColor: c }}
                            className="w-5 h-5 rounded-full border border-slate-700 hover:scale-110 transition-transform shrink-0"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => onDeleteAnnotation(selectedAnnotation.id)}
                    className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Callout</span>
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
