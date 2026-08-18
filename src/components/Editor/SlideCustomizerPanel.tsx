import React, { useState } from 'react';
import { TransitionCard } from '../../types';
import { saveCustomSlideTemplate } from '../../lib/templates';
import { getAllPresets } from '../../lib/presets';
import {
  Type,
  Palette,
  Image as ImageIcon,
  Clock,
  Sparkles,
  Upload,
  Trash2,
  Bookmark,
  Check,
  AlignLeft,
  AlignCenter,
  Layers,
  Globe,
  Mail,
  Twitter,
  Youtube,
  Linkedin,
} from 'lucide-react';

interface SlideCustomizerPanelProps {
  slide: TransitionCard;
  onUpdateSlide: (updated: TransitionCard) => void;
  onDeleteSlide: (id: string) => void;
}

const COLOR_PRESETS = [
  '#0f172a', // Slate dark
  '#020617', // Very dark slate
  '#090d16', // Deep space blue
  '#0f2942', // Deep teal navy
  '#1e1b4b', // Deep indigo
  '#311b92', // Deep purple
  '#f8fafc', // Clean white light
  '#38bdf8', // Sky blue
  '#0284c7', // Primary blue
  '#f43f5e', // Rose red
  '#10b981', // Emerald green
  '#a855f7', // Purple
];

const GRADIENT_PRESETS = [
  { name: 'Midnight Slate', colors: ['#0f172a', '#1e293b'] },
  { name: 'Sky Electric', colors: ['#030712', '#0284c7', '#0f172a'] },
  { name: 'Cyber Indigo', colors: ['#0f172a', '#4f46e5', '#1e1b4b'] },
  { name: 'Neon Rose', colors: ['#020617', '#f43f5e', '#0f172a'] },
  { name: 'Deep Space', colors: ['#030712', '#090d16', '#1e1b4b'] },
];

export const SlideCustomizerPanel: React.FC<SlideCustomizerPanelProps> = ({
  slide,
  onUpdateSlide,
  onDeleteSlide,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'style' | 'bg' | 'media'>('content');
  const [saveTemplateName, setSaveTemplateName] = useState<string>('');
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);

  const presets = getAllPresets();

  const handleTextChange = (key: keyof TransitionCard, val: any) => {
    onUpdateSlide({ ...slide, [key]: val });
  };

  const handleSocialChange = (platform: 'twitter' | 'youtube' | 'linkedin' | 'instagram', val: string) => {
    onUpdateSlide({
      ...slide,
      socialHandles: {
        ...slide.socialHandles,
        [platform]: val,
      },
    });
  };

  const handleFileUpload = (field: 'logoUrl' | 'screenshotUrl' | 'authorPhotoUrl' | 'bgImageUrl', file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onUpdateSlide({ ...slide, [field]: result });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAsTemplate = () => {
    if (!saveTemplateName.trim()) return;
    saveCustomSlideTemplate({
      id: `custom_tpl_${Date.now()}`,
      name: saveTemplateName.trim(),
      slideType: slide.slideType || 'intro',
      templateId: slide.templateId || 'intro_01',
      cardConfig: slide,
      createdAt: Date.now(),
    });
    setSaveTemplateName('');
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);
  };

  const applyBrandPreset = (presetId: string) => {
    const found = presets.find((p) => p.id === presetId);
    if (!found) return;

    onUpdateSlide({
      ...slide,
      style: found.transitionStyle,
      bgColor: found.transitionBgColor,
      textColor: found.transitionTextColor,
      fontFamily: found.transitionFontFamily || 'Inter, sans-serif',
      accentColor: found.clickColor,
      buttonColor: found.calloutBgColor,
      buttonTextColor: found.calloutTextColor,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 text-slate-100 shadow-2xl select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {slide.slideType || 'Slide'}
            </span>
            <h3 className="font-bold text-sm text-slate-200">
              {slide.templateId ? `Template: ${slide.templateId}` : 'Slide Customizer'}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Customize copy, colors, typography, background & images</p>
        </div>

        <button
          onClick={() => onDeleteSlide(slide.id)}
          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all"
          title="Remove slide from video"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Remove</span>
        </button>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'content' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Content</span>
        </button>

        <button
          onClick={() => setActiveTab('style')}
          className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'style' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Style</span>
        </button>

        <button
          onClick={() => setActiveTab('bg')}
          className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'bg' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Background</span>
        </button>

        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'media' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Media</span>
        </button>
      </div>

      {/* TAB 1: CONTENT */}
      {activeTab === 'content' && (
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Product / Brand Title</label>
            <input
              type="text"
              value={slide.productName || slide.title || ''}
              onChange={(e) => {
                handleTextChange('productName', e.target.value);
                handleTextChange('title', e.target.value);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
              placeholder="e.g., ACME STUDIO"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Main Headline</label>
            <textarea
              rows={2}
              value={slide.headline || slide.title || ''}
              onChange={(e) => handleTextChange('headline', e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500 resize-none"
              placeholder="e.g., Build better video workflows faster"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Subtitle / Tagline</label>
            <input
              type="text"
              value={slide.subtitle || slide.tagline || ''}
              onChange={(e) => {
                handleTextChange('subtitle', e.target.value);
                handleTextChange('tagline', e.target.value);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
              placeholder="e.g., A complete video creator for modern SaaS teams"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">CTA Button Text</label>
              <input
                type="text"
                value={slide.ctaText || ''}
                onChange={(e) => handleTextChange('ctaText', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                placeholder="e.g., Start Free Trial"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Website URL</label>
              <div className="relative">
                <Globe className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={slide.websiteUrl || ''}
                  onChange={(e) => handleTextChange('websiteUrl', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                  placeholder="acme.ai"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Contact Email</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={slide.email || ''}
                  onChange={(e) => handleTextChange('email', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                  placeholder="hello@acme.ai"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Founder / Author Name</label>
              <input
                type="text"
                value={slide.authorName || ''}
                onChange={(e) => handleTextChange('authorName', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                placeholder="Alex River"
              />
            </div>
          </div>

          {/* Social Handles */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="block font-semibold text-slate-300">Social Handles</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Twitter className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={slide.socialHandles?.twitter || ''}
                  onChange={(e) => handleSocialChange('twitter', e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
                  placeholder="@acme_ai"
                />
              </div>

              <div className="relative">
                <Youtube className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={slide.socialHandles?.youtube || ''}
                  onChange={(e) => handleSocialChange('youtube', e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
                  placeholder="youtube.com/@acme"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TYPOGRAPHY & COLORS */}
      {activeTab === 'style' && (
        <div className="space-y-4 text-xs">
          {/* Quick Apply Preset */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Apply Brand Preset</label>
            <select
              onChange={(e) => applyBrandPreset(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="">Select a Brand Preset...</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Typography options */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Font Family</label>
              <select
                value={slide.fontFamily || 'Inter, sans-serif'}
                onChange={(e) => handleTextChange('fontFamily', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="Inter, sans-serif">Inter (Modern Clean)</option>
                <option value="system-ui, sans-serif">System UI</option>
                <option value="Georgia, serif">Georgia (Editorial)</option>
                <option value="ui-monospace, monospace">SF Mono (Developer / Code)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Text Alignment</label>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => handleTextChange('alignment', 'center')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 ${
                    slide.alignment === 'center' ? 'bg-sky-500 text-white' : 'text-slate-400'
                  }`}
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                  <span>Center</span>
                </button>
                <button
                  onClick={() => handleTextChange('alignment', 'left')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 ${
                    slide.alignment === 'left' ? 'bg-sky-500 text-white' : 'text-slate-400'
                  }`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                  <span>Left</span>
                </button>
              </div>
            </div>
          </div>

          {/* Font Size & Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Headline Size ({slide.fontSize || 38}px)</label>
              <input
                type="range"
                min="24"
                max="60"
                value={slide.fontSize || 38}
                onChange={(e) => handleTextChange('fontSize', Number(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Animation Style</label>
              <select
                value={slide.animationStyle || 'fade'}
                onChange={(e) => handleTextChange('animationStyle', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="fade">Fade In/Out</option>
                <option value="slide">Slide In</option>
                <option value="pop">Pop Scale</option>
                <option value="zoom">Zoom Out</option>
              </select>
            </div>
          </div>

          {/* Duration */}
          <div>
            <div className="flex justify-between text-slate-400 font-medium mb-1">
              <span>Slide Duration</span>
              <span className="font-mono text-sky-400 font-bold">{slide.duration.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min="2.0"
              max="12.0"
              step="0.5"
              value={slide.duration}
              onChange={(e) => handleTextChange('duration', Number(e.target.value))}
              className="w-full accent-sky-500"
            />
          </div>

          {/* Color pickers */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Text Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={slide.textColor || '#ffffff'}
                  onChange={(e) => handleTextChange('textColor', e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                />
                <span className="font-mono text-[11px] text-slate-300">{slide.textColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={slide.accentColor || '#38bdf8'}
                  onChange={(e) => handleTextChange('accentColor', e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                />
                <span className="font-mono text-[11px] text-slate-300">{slide.accentColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Button Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={slide.buttonColor || '#0284c7'}
                  onChange={(e) => handleTextChange('buttonColor', e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                />
                <span className="font-mono text-[11px] text-slate-300">{slide.buttonColor}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BACKGROUND */}
      {activeTab === 'bg' && (
        <div className="space-y-4 text-xs">
          {/* Background Type Selector */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Background Mode</label>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => handleTextChange('bgType', 'solid')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                  slide.bgType === 'solid' ? 'bg-sky-500 text-white' : 'text-slate-400'
                }`}
              >
                Solid Color
              </button>
              <button
                onClick={() => handleTextChange('bgType', 'gradient')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                  slide.bgType === 'gradient' ? 'bg-sky-500 text-white' : 'text-slate-400'
                }`}
              >
                Gradient
              </button>
              <button
                onClick={() => handleTextChange('bgType', 'image')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                  slide.bgType === 'image' ? 'bg-sky-500 text-white' : 'text-slate-400'
                }`}
              >
                Image BG
              </button>
            </div>
          </div>

          {/* Solid Color Options */}
          {slide.bgType === 'solid' && (
            <div className="space-y-3">
              <label className="block text-slate-400 font-medium">Curated Background Colors</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleTextChange('bgColor', color)}
                    style={{ backgroundColor: color }}
                    className={`w-7 h-7 rounded-lg border transition-all ${
                      slide.bgColor === color ? 'border-sky-400 scale-110 shadow-lg ring-2 ring-sky-500/40' : 'border-slate-700'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <span className="text-slate-400">Custom Solid Hex:</span>
                <input
                  type="color"
                  value={slide.bgColor || '#0f172a'}
                  onChange={(e) => handleTextChange('bgColor', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent"
                />
                <span className="font-mono text-slate-300">{slide.bgColor}</span>
              </div>
            </div>
          )}

          {/* Gradient Options */}
          {slide.bgType === 'gradient' && (
            <div className="space-y-3">
              <label className="block text-slate-400 font-medium">Gradient Presets</label>
              <div className="grid grid-cols-2 gap-2">
                {GRADIENT_PRESETS.map((gp) => (
                  <button
                    key={gp.name}
                    onClick={() => handleTextChange('gradientColors', gp.colors)}
                    style={{
                      background: `linear-gradient(to right, ${gp.colors.join(', ')})`,
                    }}
                    className="p-3 rounded-xl border border-slate-700 text-left font-bold text-[11px] text-white shadow-md hover:scale-[1.02] transition-transform"
                  >
                    {gp.name}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Gradient Direction</label>
                <select
                  value={slide.gradientDirection || 'to-br'}
                  onChange={(e) => handleTextChange('gradientDirection', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="to-br">Top Left to Bottom Right</option>
                  <option value="to-r">Left to Right</option>
                  <option value="to-b">Top to Bottom</option>
                  <option value="radial">Radial Glow</option>
                </select>
              </div>
            </div>
          )}

          {/* Image Background Options */}
          {slide.bgType === 'image' && (
            <div className="space-y-3">
              <label className="block text-slate-400 font-medium">Upload Background Image</label>
              <div className="flex items-center gap-3">
                {slide.bgImageUrl ? (
                  <img
                    src={slide.bgImageUrl}
                    alt="Bg"
                    className="w-16 h-12 object-cover rounded-lg border border-slate-800"
                  />
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
                    No image
                  </div>
                )}

                <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer flex items-center gap-1.5 border border-slate-700">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Background</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload('bgImageUrl', e.target.files?.[0])}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 font-medium mb-1">
                  <span>Overlay Dark Mask</span>
                  <span className="font-mono text-sky-400">{Math.round((slide.bgOverlayOpacity ?? 0.6) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={slide.bgOverlayOpacity ?? 0.6}
                  onChange={(e) => handleTextChange('bgOverlayOpacity', Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MEDIA / IMAGES */}
      {activeTab === 'media' && (
        <div className="space-y-4 text-xs">
          {/* App Screenshot */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
            <span className="font-semibold text-slate-300 block">Application Screenshot / Product Mockup</span>
            <div className="flex items-center justify-between">
              {slide.screenshotUrl ? (
                <img
                  src={slide.screenshotUrl}
                  alt="Screenshot"
                  className="w-20 h-12 object-cover rounded border border-slate-800"
                />
              ) : (
                <span className="text-slate-500 italic">No screenshot uploaded</span>
              )}

              <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer flex items-center gap-1.5 border border-slate-700">
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>Upload Screenshot</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload('screenshotUrl', e.target.files?.[0])}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Logo Image */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
            <span className="font-semibold text-slate-300 block">Brand Logo Image</span>
            <div className="flex items-center justify-between">
              {slide.logoUrl ? (
                <img
                  src={slide.logoUrl}
                  alt="Logo"
                  className="w-10 h-10 object-contain rounded bg-slate-900 p-1 border border-slate-800"
                />
              ) : (
                <span className="text-slate-500 italic">No logo uploaded</span>
              )}

              <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer flex items-center gap-1.5 border border-slate-700">
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>Upload Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload('logoUrl', e.target.files?.[0])}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Founder Photo */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
            <span className="font-semibold text-slate-300 block">Founder / Author Photo</span>
            <div className="flex items-center justify-between">
              {slide.authorPhotoUrl ? (
                <img
                  src={slide.authorPhotoUrl}
                  alt="Author"
                  className="w-10 h-10 object-cover rounded-full border border-slate-800"
                />
              ) : (
                <span className="text-slate-500 italic">No founder photo</span>
              )}

              <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer flex items-center gap-1.5 border border-slate-700">
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>Upload Founder Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload('authorPhotoUrl', e.target.files?.[0])}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Footer: Save Custom Template */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={saveTemplateName}
            onChange={(e) => setSaveTemplateName(e.target.value)}
            placeholder="Name your custom template..."
            className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={handleSaveAsTemplate}
            disabled={!saveTemplateName.trim()}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-sky-500 disabled:opacity-50 text-slate-200 hover:text-white font-semibold flex items-center gap-1.5 transition-all"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Save Custom</span>
          </button>
        </div>

        {showSavedToast && (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white font-bold flex items-center gap-1 animate-pulse">
            <Check className="w-3 h-3" />
            Saved!
          </span>
        )}
      </div>
    </div>
  );
};
