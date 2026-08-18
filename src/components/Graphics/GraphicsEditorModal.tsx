import React, { useState, useEffect, useRef } from 'react';
import {
  GraphicTemplate,
  GraphicElement,
  GraphicTemplateType,
  CanvasAspectRatio,
  SocialPlatformId,
  Project,
  SlideType,
} from '../../types';
import {
  BUILTIN_GRAPHIC_TEMPLATES,
  getCustomGraphicTemplates,
  saveCustomGraphicTemplate,
  deleteCustomGraphicTemplate,
  applyBrandPresetToTemplate,
} from '../../lib/graphics/templates';
import {
  UNSPLASH_BACKGROUNDS,
  GRADIENT_BACKGROUNDS,
  SOLID_BACKGROUNDS,
  SAAS_FONTS,
  BackgroundItem,
} from '../../lib/graphics/backgrounds';
import {
  renderGraphicTemplateToCanvas,
  exportGraphicTemplateToPng,
  exportReformattedSocialVideo,
} from '../../lib/graphics/renderer';
import { getAllPresets } from '../../lib/presets';
import {
  X,
  Sparkles,
  Layout,
  PlaySquare,
  Image as ImageIcon,
  Smartphone,
  Layers,
  Type,
  Palette,
  Upload,
  Download,
  Plus,
  Trash2,
  Check,
  Globe,
  Sliders,
  Maximize2,
  Video,
  Share2,
  Tv,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Copy,
  Search,
  SlidersHorizontal,
  Move,
  Eye,
  Sun,
  ZoomIn,
  Home,
} from 'lucide-react';

interface GraphicsEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoHome?: () => void;
  activeProject?: Project | null;
  onAddIntroOutroToTimeline?: (template: GraphicTemplate, slideType: SlideType) => void;
}

export const GraphicsEditorModal: React.FC<GraphicsEditorModalProps> = ({
  isOpen,
  onClose,
  onGoHome,
  activeProject,
  onAddIntroOutroToTimeline,
}) => {
  // Active category/module
  const [activeModule, setActiveModule] = useState<GraphicTemplateType | 'social_reformatter'>('intro');

  // Active Graphic Template being edited
  const [template, setTemplate] = useState<GraphicTemplate>(BUILTIN_GRAPHIC_TEMPLATES[0]);

  // Selected element ID on canvas
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Active Left Panel Tab
  const [leftTab, setLeftTab] = useState<'templates' | 'platforms' | 'backgrounds' | 'elements' | 'header_footer'>('templates');

  // Background Search & Filter State
  const [bgSearchQuery, setBgSearchQuery] = useState<string>('');
  const [bgCategoryFilter, setBgCategoryFilter] = useState<string>('all');

  // Custom Saved Templates List
  const [customTemplates, setCustomTemplates] = useState<GraphicTemplate[]>(getCustomGraphicTemplates());

  // Selected Platform in Reformatter Mode
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatformId>('instagram');

  // Selected Brand Preset
  const [selectedBrandPresetId, setSelectedBrandPresetId] = useState<string>('');

  // Dragging state on Canvas
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number; elX: number; elY: number } | null>(null);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ pct: number; status: string }>({ pct: 0, status: '' });
  const [exportedResultUrl, setExportedResultUrl] = useState<string | null>(null);

  // Hidden source video ref for live preview rendering
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Update template when active module changes
  useEffect(() => {
    if (activeModule === 'social_reformatter') {
      const defaultSocial = BUILTIN_GRAPHIC_TEMPLATES.find((t) => t.type === 'social_vertical') || BUILTIN_GRAPHIC_TEMPLATES[3];
      setTemplate(defaultSocial);
    } else {
      const match = BUILTIN_GRAPHIC_TEMPLATES.find((t) => t.type === activeModule);
      if (match) setTemplate(match);
    }
    setSelectedElementId(null);
  }, [activeModule]);

  // Trigger canvas redraw callback for asynchronous image loads
  const handleImageLoaded = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderGraphicTemplateToCanvas(
      ctx,
      template,
      canvas.width,
      canvas.height,
      videoRef.current,
      selectedElementId,
      handleImageLoaded
    );
  };

  // Re-draw Canvas whenever template or selected element changes
  useEffect(() => {
    handleImageLoaded();
  }, [template, selectedElementId]);

  if (!isOpen) return null;

  const activeElement = template.elements.find((el) => el.id === selectedElementId) || null;
  const brandPresets = getAllPresets();

  // Filtered Unsplash Backgrounds List
  const filteredUnsplashBg = UNSPLASH_BACKGROUNDS.filter((bg) => {
    const matchesCategory = bgCategoryFilter === 'all' || bg.category === bgCategoryFilter;
    const matchesQuery =
      !bgSearchQuery ||
      bg.title.toLowerCase().includes(bgSearchQuery.toLowerCase()) ||
      bg.category.toLowerCase().includes(bgSearchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  // Switch Social Platform -> Auto Pick Aspect Ratio & Template
  const handleSelectPlatform = (platformId: SocialPlatformId) => {
    setSelectedPlatform(platformId);

    let targetType: GraphicTemplateType = 'social_vertical';
    if (platformId === 'youtube') targetType = 'thumbnail';
    if (platformId === 'instagram' || platformId === 'linkedin' || platformId === 'twitter') targetType = 'social_square';
    if (platformId === 'tiktok' || platformId === 'shorts' || platformId === 'facebook') targetType = 'social_vertical';

    const match = BUILTIN_GRAPHIC_TEMPLATES.find((t) => t.type === targetType) || BUILTIN_GRAPHIC_TEMPLATES[0];
    setTemplate(match);
  };

  // Update Template Properties
  const handleUpdateTemplate = (updates: Partial<GraphicTemplate>) => {
    setTemplate((prev) => ({ ...prev, ...updates }));
  };

  // Update Background Properties
  const handleUpdateBackground = (bgUpdates: Partial<GraphicTemplate['background']>) => {
    setTemplate((prev) => ({
      ...prev,
      background: {
        ...prev.background,
        ...bgUpdates,
      },
    }));
  };

  // Update Single Element
  const handleUpdateElement = (id: string, updates: Partial<GraphicElement>) => {
    setTemplate((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    }));
  };

  // Add New Element to Canvas
  const handleAddElement = (type: GraphicElement['type']) => {
    const newId = `el_${type}_${Date.now()}`;
    let newEl: GraphicElement = {
      id: newId,
      type,
      x: 20,
      y: 40,
      width: 60,
      height: 15,
      zIndex: template.elements.length + 1,
    };

    if (type === 'text') {
      newEl = {
        ...newEl,
        content: 'Your Headline Text Here',
        label: 'Text Element',
        fontSize: 36,
        fontWeight: '800',
        color: '#ffffff',
        textAlign: 'center',
        textShadow: '0 4px 12px rgba(0,0,0,0.8)',
      };
    } else if (type === 'logo' || type === 'image') {
      newEl = {
        ...newEl,
        content: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop',
        label: type === 'logo' ? 'Brand Logo' : 'Image Graphic',
        width: 30,
        height: 20,
        borderRadius: 12,
      };
    } else if (type === 'video_placeholder') {
      newEl = {
        ...newEl,
        type: 'video_placeholder',
        label: 'Source Video Region',
        x: 5,
        y: 25,
        width: 90,
        height: 55,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#38bdf8',
      };
    } else if (type === 'shape') {
      newEl = {
        ...newEl,
        type: 'shape',
        label: 'Background Card Shape',
        x: 10,
        y: 20,
        width: 80,
        height: 60,
        backgroundColor: 'rgba(30, 41, 59, 0.85)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.3)',
      };
    }

    setTemplate((prev) => ({
      ...prev,
      elements: [...prev.elements, newEl],
    }));
    setSelectedElementId(newId);
  };

  // Duplicate Element
  const handleDuplicateElement = (id: string) => {
    const elToDup = template.elements.find((el) => el.id === id);
    if (!elToDup) return;

    const newId = `el_${elToDup.type}_${Date.now()}`;
    const clonedEl: GraphicElement = {
      ...elToDup,
      id: newId,
      x: Math.min(90, elToDup.x + 4),
      y: Math.min(90, elToDup.y + 4),
      zIndex: template.elements.length + 1,
    };

    setTemplate((prev) => ({
      ...prev,
      elements: [...prev.elements, clonedEl],
    }));
    setSelectedElementId(newId);
  };

  // Delete Element
  const handleDeleteElement = (id: string) => {
    setTemplate((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== id),
    }));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  // Canvas Mouse Down: Select Element or Start Dragging
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickXPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const clickYPercent = ((e.clientY - rect.top) / rect.height) * 100;

    // Search top-most element matching coordinates
    const sorted = [...template.elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    const matched = sorted.find((el) => {
      const inX = clickXPercent >= el.x && clickXPercent <= el.x + el.width;
      const inY = clickYPercent >= el.y && clickYPercent <= el.y + el.height;
      return inX && inY;
    });

    if (matched) {
      setSelectedElementId(matched.id);
      setIsDragging(true);
      setDragStartPos({
        x: e.clientX,
        y: e.clientY,
        elX: matched.x,
        elY: matched.y,
      });
    } else {
      setSelectedElementId(null);
    }
  };

  // Canvas Mouse Move: Drag Element
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedElementId || !dragStartPos || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const deltaXPixels = e.clientX - dragStartPos.x;
    const deltaYPixels = e.clientY - dragStartPos.y;

    const deltaXPercent = (deltaXPixels / rect.width) * 100;
    const deltaYPercent = (deltaYPixels / rect.height) * 100;

    const newX = Math.max(0, Math.min(95, Math.round(dragStartPos.elX + deltaXPercent)));
    const newY = Math.max(0, Math.min(95, Math.round(dragStartPos.elY + deltaYPercent)));

    handleUpdateElement(selectedElementId, { x: newX, y: newY });
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setDragStartPos(null);
  };

  // Apply Brand Preset
  const handleApplyBrandPreset = (presetId: string) => {
    setSelectedBrandPresetId(presetId);
    const preset = brandPresets.find((p) => p.id === presetId);
    if (preset) {
      const updated = applyBrandPresetToTemplate(template, preset);
      setTemplate(updated);
    }
  };

  // Save as Custom Reusable Template
  const handleSaveAsCustomTemplate = () => {
    const customTpl: GraphicTemplate = {
      ...template,
      id: `gtpl_custom_${Date.now()}`,
      name: `${template.name} (Custom)`,
      isBuiltIn: false,
      createdAt: Date.now(),
    };
    saveCustomGraphicTemplate(customTpl);
    setCustomTemplates(getCustomGraphicTemplates());
    alert('Template saved successfully! You can find it in "Templates" under "Saved Custom Templates".');
  };

  // Export PNG Graphic
  const handleExportPng = async () => {
    try {
      const url = await exportGraphicTemplateToPng(template, videoRef.current);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.toLowerCase().replace(/\s+/g, '_')}_graphic.png`;
      a.click();
    } catch (e) {
      console.error('PNG export failed:', e);
    }
  };

  // Export Reformatted Social Video
  const handleExportSocialVideo = async () => {
    if (!activeProject || !activeProject.sourceVideoBlobUrl) {
      alert('Please load a demo video project first to export reformatted social videos.');
      return;
    }

    setIsExporting(true);
    setExportProgress({ pct: 5, status: 'Initializing social video recorder...' });

    try {
      const videoUrl = await exportReformattedSocialVideo(
        activeProject,
        template,
        (pct, status) => setExportProgress({ pct, status })
      );
      setExportedResultUrl(videoUrl);
    } catch (e) {
      console.error('Social video export error:', e);
      alert('Social video export encountered an error. Please try again.');
      setIsExporting(false);
    }
  };

  // Quick Header/Footer Quick Edit
  const headerElement = template.elements.find((el) => el.id.includes('header') || el.label?.includes('Header') || el.label?.includes('Title')) || template.elements[0];
  const footerElement = template.elements.find((el) => el.id.includes('footer') || el.label?.includes('Footer') || el.label?.includes('CTA')) || template.elements[template.elements.length - 1];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col text-slate-100 overflow-hidden select-none">
      {/* Hidden source video element for live canvas frame extraction */}
      {activeProject?.sourceVideoBlobUrl && (
        <video
          ref={videoRef}
          src={activeProject.sourceVideoBlobUrl}
          className="hidden"
          muted
          playsInline
          loop
          autoPlay
        />
      )}

      {/* Top Header Bar */}
      <div className="h-16 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 text-base">Graphics Creator & Social Reformatter</h2>
            <p className="text-xs text-slate-400">Design SaaS graphics with real backgrounds & export high-converting assets</p>
          </div>
        </div>

        {/* Core Module Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveModule('intro')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeModule === 'intro' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlaySquare className="w-3.5 h-3.5" />
            <span>Intro / Outro</span>
          </button>

          <button
            onClick={() => setActiveModule('thumbnail')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeModule === 'thumbnail' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Thumbnail</span>
          </button>

          <button
            onClick={() => setActiveModule('social_square')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeModule === 'social_square' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>1:1 Square</span>
          </button>

          <button
            onClick={() => setActiveModule('social_vertical')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeModule === 'social_vertical' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>9:16 Shorts</span>
          </button>

          <button
            onClick={() => setActiveModule('social_reformatter')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeModule === 'social_reformatter'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Social Reformatter</span>
          </button>
        </div>

        {/* Actions & Close */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveAsCustomTemplate}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
            title="Save your current layout as a reusable template"
          >
            <Copy className="w-3.5 h-3.5 text-sky-400" />
            <span>Save Template</span>
          </button>

          {onAddIntroOutroToTimeline && (activeModule === 'intro' || activeModule === 'outro') && (
            <button
              onClick={() => onAddIntroOutroToTimeline(template, activeModule === 'intro' ? 'intro' : 'outro')}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Timeline</span>
            </button>
          )}

          <button
            onClick={handleExportPng}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export PNG</span>
          </button>

          {activeProject && (
            <button
              onClick={handleExportSocialVideo}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 transition-all"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Export Social Video</span>
            </button>
          )}

          <button
            onClick={() => {
              onClose();
              if (onGoHome) onGoHome();
            }}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
            title="Go back to Home"
          >
            <Home className="w-3.5 h-3.5 text-sky-400" />
            <span>Home</span>
          </button>

          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 ml-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Studio Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Tools */}
        <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
          {/* Tool Switch Tabs */}
          <div className="grid grid-cols-5 border-b border-slate-800 bg-slate-950/60 p-1 text-[11px] font-bold text-center">
            <button
              onClick={() => setLeftTab('templates')}
              className={`py-2 rounded-lg transition-all ${
                leftTab === 'templates' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Templates
            </button>

            {activeModule === 'social_reformatter' && (
              <button
                onClick={() => setLeftTab('platforms')}
                className={`py-2 rounded-lg transition-all ${
                  leftTab === 'platforms' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Platform
              </button>
            )}

            <button
              onClick={() => setLeftTab('backgrounds')}
              className={`py-2 rounded-lg transition-all ${
                leftTab === 'backgrounds' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bg
            </button>

            <button
              onClick={() => setLeftTab('elements')}
              className={`py-2 rounded-lg transition-all ${
                leftTab === 'elements' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Elements
            </button>

            <button
              onClick={() => setLeftTab('header_footer')}
              className={`py-2 rounded-lg transition-all ${
                leftTab === 'header_footer' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Text/CTA
            </button>
          </div>

          {/* Left Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
            {/* 1. TEMPLATES TAB */}
            {leftTab === 'templates' && (
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Built-In Templates</h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {BUILTIN_GRAPHIC_TEMPLATES.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => setTemplate(tpl)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        template.id === tpl.id
                          ? 'bg-sky-500/10 border-sky-500/60 ring-1 ring-sky-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-200">{tpl.name}</div>
                        <div className="text-[10px] text-slate-400 capitalize">
                          {tpl.aspectRatio} • {tpl.elements.length} Editable Layers
                        </div>
                      </div>
                      {template.id === tpl.id && <Check className="w-4 h-4 text-sky-400" />}
                    </div>
                  ))}
                </div>

                {customTemplates.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Saved Custom Templates</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {customTemplates.map((ct) => (
                        <div
                          key={ct.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                        >
                          <div onClick={() => setTemplate(ct)} className="cursor-pointer min-w-0 flex-1">
                            <div className="font-bold text-xs text-slate-200 truncate">{ct.name}</div>
                            <div className="text-[10px] text-slate-400">{ct.aspectRatio}</div>
                          </div>
                          <button
                            onClick={() => {
                              deleteCustomGraphicTemplate(ct.id);
                              setCustomTemplates(getCustomGraphicTemplates());
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. PLATFORMS TAB */}
            {leftTab === 'platforms' && (
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Social Platform Destination</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Select where you are publishing. The aspect ratio and template layout will automatically adjust!
                </p>

                <div className="space-y-2">
                  {[
                    { id: 'instagram', name: 'Instagram Reels / Post', aspect: '9:16 or 1:1', icon: Instagram },
                    { id: 'tiktok', name: 'TikTok Video', aspect: '9:16 Vertical', icon: Smartphone },
                    { id: 'shorts', name: 'YouTube Shorts', aspect: '9:16 Vertical', icon: Youtube },
                    { id: 'facebook', name: 'Facebook Reels', aspect: '9:16 Vertical', icon: Share2 },
                    { id: 'linkedin', name: 'LinkedIn Video Post', aspect: '1:1 Square', icon: Linkedin },
                    { id: 'twitter', name: 'X / Twitter Post', aspect: '1:1 Square', icon: Twitter },
                    { id: 'youtube', name: 'YouTube Video / Thumbnail', aspect: '16:9 Widescreen', icon: Tv },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = selectedPlatform === p.id;

                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPlatform(p.id as SocialPlatformId)}
                        className={`w-full p-3 rounded-xl border transition-all text-left flex items-center gap-3 ${
                          isSelected
                            ? 'bg-sky-500/15 border-sky-500/60 ring-1 ring-sky-500/30'
                            : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-200">{p.name}</div>
                          <div className="text-[10px] text-slate-400">{p.aspect}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. BACKGROUNDS TAB */}
            {leftTab === 'backgrounds' && (
              <div className="space-y-4">
                {/* Search & Category Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search Unsplash backgrounds..."
                      value={bgSearchQuery}
                      onChange={(e) => setBgSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="flex gap-1 overflow-x-auto pb-1 text-[10px] font-semibold custom-scrollbar">
                    {['all', 'saas', 'ai', 'tech', 'abstract', 'minimal'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setBgCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg capitalize shrink-0 transition-all ${
                          bgCategoryFilter === cat ? 'bg-sky-500 text-white' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Custom Background */}
                <label className="w-full p-2.5 rounded-xl bg-slate-950 border border-dashed border-slate-800 hover:border-sky-500 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5 text-sky-400" />
                  <span>Upload Background Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          handleUpdateBackground({
                            type: 'image',
                            value: ev.target?.result as string,
                            overlayColor: template.background.overlayColor || '#000000',
                            overlayOpacity: template.background.overlayOpacity !== undefined ? template.background.overlayOpacity : 0.4,
                            zoom: 100,
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>

                {/* Unsplash Background Gallery */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Unsplash Image Gallery</h4>
                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                    {filteredUnsplashBg.map((ub) => (
                      <div
                        key={ub.id}
                        onClick={() =>
                          handleUpdateBackground({
                            type: 'image',
                            value: ub.value,
                            overlayColor: template.background.overlayColor || '#000000',
                            overlayOpacity: template.background.overlayOpacity !== undefined ? template.background.overlayOpacity : 0.4,
                            zoom: 100,
                          })
                        }
                        className={`h-20 rounded-xl border cursor-pointer overflow-hidden relative group transition-all ${
                          template.background.type === 'image' && template.background.value === ub.value
                            ? 'border-sky-500 ring-2 ring-sky-500/40'
                            : 'border-slate-800 hover:border-sky-500/50'
                        }`}
                      >
                        <img src={ub.thumbnailUrl} alt={ub.title} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                        <div className="absolute inset-0 bg-slate-950/40 p-1.5 flex items-end">
                          <span className="text-[9px] font-bold text-white leading-tight drop-shadow">{ub.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Background Image Overlay & Controls Panel */}
                {template.background.type === 'image' && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                    <h4 className="font-bold text-[11px] text-sky-400 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Background Image Controls
                    </h4>

                    {/* Dark Overlay Tint for Crisp Text */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] text-slate-300">
                        <span>Dark Overlay Tint</span>
                        <span className="font-mono">{Math.round((template.background.overlayOpacity || 0.4) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={template.background.overlayOpacity !== undefined ? template.background.overlayOpacity : 0.4}
                        onChange={(e) => handleUpdateBackground({ overlayOpacity: parseFloat(e.target.value) })}
                        className="w-full accent-sky-500"
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] text-slate-400">Tint Color:</span>
                        <input
                          type="color"
                          value={template.background.overlayColor || '#000000'}
                          onChange={(e) => handleUpdateBackground({ overlayColor: e.target.value })}
                          className="w-6 h-6 rounded bg-slate-900 border border-slate-800 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Zoom / Scale */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-300">
                        <span>Scale / Zoom</span>
                        <span className="font-mono">{template.background.zoom || 100}%</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="200"
                        value={template.background.zoom || 100}
                        onChange={(e) => handleUpdateBackground({ zoom: parseInt(e.target.value) })}
                        className="w-full accent-sky-500"
                      />
                    </div>
                  </div>
                )}

                {/* Solid Colors */}
                <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider pt-2 border-t border-slate-800">
                  Solid Neutrals
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {SOLID_BACKGROUNDS.map((sb) => (
                    <div
                      key={sb.id}
                      onClick={() =>
                        handleUpdateBackground({
                          type: 'color',
                          value: sb.value,
                        })
                      }
                      className="h-10 rounded-lg border border-slate-700 cursor-pointer hover:scale-105 transition-all"
                      style={{ backgroundColor: sb.value }}
                      title={sb.title}
                    />
                  ))}
                </div>

                {/* Gradients */}
                <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider pt-2 border-t border-slate-800">
                  Gradients
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {GRADIENT_BACKGROUNDS.map((gb) => (
                    <div
                      key={gb.id}
                      onClick={() =>
                        handleUpdateBackground({
                          type: 'gradient',
                          value: gb.value,
                        })
                      }
                      className="h-14 rounded-xl border border-slate-700 cursor-pointer p-2 flex items-end hover:scale-[1.02] transition-all relative overflow-hidden"
                      style={{ background: gb.value }}
                    >
                      <span className="text-[10px] font-bold text-white drop-shadow">{gb.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. ELEMENTS TAB */}
            {leftTab === 'elements' && (
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Add Canvas Elements</h4>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleAddElement('text')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-slate-200 text-xs font-semibold flex items-center gap-3 transition-all"
                  >
                    <Type className="w-4 h-4 text-sky-400" />
                    <span>+ Add Text Element</span>
                  </button>

                  <button
                    onClick={() => handleAddElement('logo')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-slate-200 text-xs font-semibold flex items-center gap-3 transition-all"
                  >
                    <Upload className="w-4 h-4 text-purple-400" />
                    <span>+ Add Logo / Product Screenshot</span>
                  </button>

                  <button
                    onClick={() => handleAddElement('video_placeholder')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-slate-200 text-xs font-semibold flex items-center gap-3 transition-all"
                  >
                    <Video className="w-4 h-4 text-amber-400" />
                    <span>+ Add Video Placeholder Region</span>
                  </button>

                  <button
                    onClick={() => handleAddElement('shape')}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-slate-200 text-xs font-semibold flex items-center gap-3 transition-all"
                  >
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>+ Add Background Card Shape</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Apply Brand Preset</h4>
                  <select
                    value={selectedBrandPresetId}
                    onChange={(e) => handleApplyBrandPreset(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-medium"
                  >
                    <option value="">Choose Brand Preset...</option>
                    {brandPresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 5. HEADER / FOOTER TAB */}
            {leftTab === 'header_footer' && (
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Header Headline Text</h4>
                {headerElement ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={headerElement.content || ''}
                      onChange={(e) => handleUpdateElement(headerElement.id, { content: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No header text element found on canvas.</p>
                )}

                <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider pt-2 border-t border-slate-800">
                  Footer Call-To-Action
                </h4>
                {footerElement ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={footerElement.content || ''}
                      onChange={(e) => handleUpdateElement(footerElement.id, { content: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No CTA element found on canvas.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center WYSIWYG Canvas Preview Workspace */}
        <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Canvas Viewport Frame */}
          <div
            className={`relative rounded-2xl shadow-2xl border border-slate-800/80 bg-slate-900 flex items-center justify-center overflow-hidden max-h-[75vh] ${
              template.aspectRatio === '9:16'
                ? 'aspect-[9/16] h-[72vh]'
                : template.aspectRatio === '1:1'
                ? 'aspect-square h-[65vh]'
                : 'aspect-video w-[65vw]'
            }`}
          >
            <canvas
              ref={canvasRef}
              width={template.width || 1080}
              height={template.height || 1080}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className="w-full h-full object-contain cursor-crosshair select-none"
            />
          </div>

          <div className="mt-3 text-[11px] text-slate-500 font-mono flex items-center gap-3">
            <span>Canvas Specs: {template.width} × {template.height} px ({template.aspectRatio})</span>
            <span>•</span>
            <span>{template.elements.length} Editable Layers</span>
            <span>•</span>
            <span className="text-sky-400">💡 Click & Drag element on canvas to move</span>
          </div>
        </div>

        {/* Right Inspector Sidebar for Selected Element */}
        <div className="w-80 bg-slate-900 border-l border-slate-800 p-4 space-y-4 overflow-y-auto shrink-0 custom-scrollbar">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="font-bold text-xs text-sky-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Element Inspector
            </h4>
            {selectedElementId && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDuplicateElement(selectedElementId)}
                  className="p-1 text-slate-400 hover:text-sky-400"
                  title="Duplicate Element"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteElement(selectedElementId)}
                  className="p-1 text-slate-400 hover:text-rose-400"
                  title="Delete Element"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {activeElement ? (
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-200 capitalize flex items-center justify-between">
                <span>{activeElement.label || `${activeElement.type} Element`}</span>
                <span className="text-[10px] text-slate-500 font-mono">ID: {activeElement.id.slice(-6)}</span>
              </div>

              {/* Text Content */}
              {activeElement.type === 'text' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400">Text Content</label>
                    <textarea
                      rows={2}
                      value={activeElement.content || ''}
                      onChange={(e) => handleUpdateElement(activeElement.id, { content: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-400">Font Family</label>
                    <select
                      value={activeElement.fontFamily || 'Inter, sans-serif'}
                      onChange={(e) => handleUpdateElement(activeElement.id, { fontFamily: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                    >
                      {SAAS_FONTS.map((f) => (
                        <option key={f.id} value={f.family}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400">Font Size ({activeElement.fontSize}px)</label>
                      <input
                        type="range"
                        min="16"
                        max="120"
                        value={activeElement.fontSize || 32}
                        onChange={(e) => handleUpdateElement(activeElement.id, { fontSize: parseInt(e.target.value) })}
                        className="w-full accent-sky-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-400">Text Color</label>
                      <input
                        type="color"
                        value={activeElement.color || '#ffffff'}
                        onChange={(e) => handleUpdateElement(activeElement.id, { color: e.target.value })}
                        className="w-full h-8 rounded bg-slate-950 border border-slate-800 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Alignment & Weight */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400">Font Weight</label>
                      <select
                        value={activeElement.fontWeight || '700'}
                        onChange={(e) => handleUpdateElement(activeElement.id, { fontWeight: e.target.value })}
                        className="w-full p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                      >
                        <option value="400">Normal (400)</option>
                        <option value="600">Semi Bold (600)</option>
                        <option value="700">Bold (700)</option>
                        <option value="800">Extra Bold (800)</option>
                        <option value="900">Black (900)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-400">Text Align</label>
                      <select
                        value={activeElement.textAlign || 'center'}
                        onChange={(e) => handleUpdateElement(activeElement.id, { textAlign: e.target.value as any })}
                        className="w-full p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>

                  {/* Text Highlight / Pill Fill */}
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400">Background Fill (Pill/Card)</label>
                    <input
                      type="text"
                      placeholder="e.g. #0284c7 or rgba(15,23,42,0.8)"
                      value={activeElement.backgroundColor || ''}
                      onChange={(e) => handleUpdateElement(activeElement.id, { backgroundColor: e.target.value })}
                      className="w-full p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    />
                  </div>
                </div>
              )}

              {/* Image / Logo Upload */}
              {(activeElement.type === 'image' || activeElement.type === 'logo') && (
                <div className="space-y-3">
                  <label className="text-[10px] font-semibold text-slate-400">Image Source URL</label>
                  <input
                    type="text"
                    value={activeElement.content || ''}
                    onChange={(e) => handleUpdateElement(activeElement.id, { content: e.target.value })}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                  />

                  <label className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer border border-slate-700">
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span>Upload Local File</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            handleUpdateElement(activeElement.id, { content: ev.target?.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              )}

              {/* Position & Size */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-[10px] font-semibold text-slate-400">Position & Dimensions (%)</label>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500">X Position ({activeElement.x}%)</span>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      value={activeElement.x}
                      onChange={(e) => handleUpdateElement(activeElement.id, { x: parseInt(e.target.value) })}
                      className="w-full accent-sky-500"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500">Y Position ({activeElement.y}%)</span>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      value={activeElement.y}
                      onChange={(e) => handleUpdateElement(activeElement.id, { y: parseInt(e.target.value) })}
                      className="w-full accent-sky-500"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500">Width ({activeElement.width}%)</span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={activeElement.width}
                      onChange={(e) => handleUpdateElement(activeElement.id, { width: parseInt(e.target.value) })}
                      className="w-full accent-sky-500"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500">Height ({activeElement.height}%)</span>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={activeElement.height}
                      onChange={(e) => handleUpdateElement(activeElement.id, { height: parseInt(e.target.value) })}
                      className="w-full accent-sky-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">Select an element layer from below or click directly on the canvas to move & edit it.</p>
              <div className="space-y-1.5">
                {template.elements.map((el) => (
                  <div
                    key={el.id}
                    onClick={() => setSelectedElementId(el.id)}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-500/50 cursor-pointer flex items-center justify-between text-xs transition-all"
                  >
                    <span className="font-semibold text-slate-200 capitalize">{el.label || el.type}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({el.x}%, {el.y}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Render Progress Modal */}
      {isExporting && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-100 text-sm">
              {exportedResultUrl ? 'Social Video Ready!' : 'Rendering Social Video...'}
            </h3>

            {!exportedResultUrl ? (
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">{exportProgress.status}</span>
                  <span className="text-sky-400 font-mono">{exportProgress.pct}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div style={{ width: `${exportProgress.pct}%` }} className="h-full bg-sky-500 transition-all duration-200" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <video src={exportedResultUrl} controls className="w-full aspect-video rounded-xl bg-slate-950" />
                <a
                  href={exportedResultUrl}
                  download="social_demo_video.mp4"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Social Video</span>
                </a>
              </div>
            )}

            <button onClick={() => setIsExporting(false)} className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
