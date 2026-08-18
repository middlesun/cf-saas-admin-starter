import React, { useState } from 'react';
import { SlideType, StylePreset } from '../../types';
import {
  INTRO_TEMPLATES,
  OUTRO_TEMPLATES,
  getCreatorProfile,
  saveCreatorProfile,
  getProductProfile,
  saveProductProfile,
  getCustomSlideTemplates,
  deleteCustomSlideTemplate,
  createSlideFromTemplate,
} from '../../lib/templates';
import { getAllPresets } from '../../lib/presets';
import {
  X,
  Sparkles,
  Layout,
  UserCheck,
  Palette,
  Plus,
  Trash2,
  Check,
  PlaySquare,
  Bookmark,
  Globe,
  Mail,
  Twitter,
  Youtube,
  Linkedin,
  Upload,
} from 'lucide-react';

interface SlideTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSlide: (slide: ReturnType<typeof createSlideFromTemplate>) => void;
  projectDuration: number;
}

export const SlideTemplateModal: React.FC<SlideTemplateModalProps> = ({
  isOpen,
  onClose,
  onAddSlide,
  projectDuration,
}) => {
  const [activeTab, setActiveTab] = useState<'intro' | 'outro' | 'saved' | 'profiles'>('intro');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  // Reusable profiles state
  const [creatorProfile, setCreatorProfile] = useState(getCreatorProfile());
  const [productProfile, setProductProfile] = useState(getProductProfile());
  const [savedTemplates, setSavedTemplates] = useState(getCustomSlideTemplates());
  const [showSavedNotification, setShowSavedNotification] = useState<boolean>(false);

  if (!isOpen) return null;

  const presets = getAllPresets();
  const activePreset = presets.find((p) => p.id === selectedPresetId);

  const handleSaveProfiles = () => {
    saveCreatorProfile(creatorProfile);
    saveProductProfile(productProfile);
    setShowSavedNotification(true);
    setTimeout(() => setShowSavedNotification(false), 2500);
  };

  const handleSelectTemplate = (templateId: string, slideType: SlideType) => {
    // Intros inserted at 0s, Outros inserted at projectDuration
    const timestamp = slideType === 'intro' ? 0 : projectDuration;
    const newSlide = createSlideFromTemplate(templateId, slideType, timestamp, activePreset);
    onAddSlide(newSlide);
    onClose();
  };

  const handleDeleteSavedTemplate = (id: string) => {
    deleteCustomSlideTemplate(id);
    setSavedTemplates(getCustomSlideTemplates());
  };

  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setProductProfile({ ...productProfile, logoUrl: url });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setCreatorProfile({ ...creatorProfile, photoUrl: url });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Intro & Outro Slide Templates</h2>
              <p className="text-xs text-slate-400">
                Choose polished opening and ending screens for SaaS demos, AI tools, and YouTube walkthroughs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation & Brand Preset Selector */}
        <div className="px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('intro')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'intro'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlaySquare className="w-3.5 h-3.5" />
              <span>Intro Slides (10)</span>
            </button>

            <button
              onClick={() => setActiveTab('outro')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'outro'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              <span>Outro Slides (10)</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'saved'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved Custom ({savedTemplates.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('profiles')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'profiles'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Brand & Profiles</span>
            </button>
          </div>

          {/* Quick Preset Selector */}
          <div className="flex items-center gap-2 text-xs">
            <Palette className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 font-medium">Apply Brand Preset:</span>
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-medium focus:outline-none focus:border-sky-500"
            >
              <option value="">Default Template Styling</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-800">
          {/* 1. INTRO TEMPLATES GRID */}
          {activeTab === 'intro' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {INTRO_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="group bg-slate-950 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-sky-500/5 relative overflow-hidden"
                >
                  {/* Category Tag */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {tpl.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{tpl.defaultConfig.duration}s</span>
                  </div>

                  {/* Visual Layout Mockup Box */}
                  <div className="w-full h-32 rounded-xl bg-slate-900 border border-slate-800/80 p-3 flex flex-col items-center justify-center text-center space-y-1 mb-3 relative overflow-hidden group-hover:border-sky-500/30 transition-all">
                    <div className="w-12 h-1 rounded bg-sky-400/80 mb-1" />
                    <div className="font-bold text-xs text-slate-200 line-clamp-1">{tpl.defaultConfig.title}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-2 px-2">
                      {tpl.defaultConfig.headline || tpl.defaultConfig.tagline}
                    </div>

                    {tpl.id === 'intro_02' || tpl.id === 'intro_07' || tpl.id === 'intro_10' ? (
                      <div className="mt-2 w-3/4 h-8 rounded bg-slate-800 border border-slate-700/80 flex items-center justify-center text-[9px] text-slate-500">
                        [ App UI Screenshot ]
                      </div>
                    ) : null}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-sm text-slate-200 group-hover:text-sky-400 transition-colors mb-1">
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4">{tpl.description}</p>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={() => handleSelectTemplate(tpl.id, 'intro')}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-sky-500 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Beginning (0.0s)</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 2. OUTRO TEMPLATES GRID */}
          {activeTab === 'outro' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {OUTRO_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="group bg-slate-950 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-sky-500/5 relative overflow-hidden"
                >
                  {/* Category Tag */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {tpl.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{tpl.defaultConfig.duration}s</span>
                  </div>

                  {/* Visual Layout Mockup Box */}
                  <div className="w-full h-32 rounded-xl bg-slate-900 border border-slate-800/80 p-3 flex flex-col items-center justify-center text-center space-y-1 mb-3 relative overflow-hidden group-hover:border-rose-500/30 transition-all">
                    <div className="font-bold text-xs text-slate-200 line-clamp-1">{tpl.defaultConfig.title}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-2 px-2">
                      {tpl.defaultConfig.headline || tpl.defaultConfig.websiteUrl}
                    </div>

                    <div className="mt-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-[9px] font-bold text-rose-300">
                      {tpl.defaultConfig.ctaText || tpl.defaultConfig.websiteUrl || 'CTA Button'}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-sm text-slate-200 group-hover:text-rose-400 transition-colors mb-1">
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4">{tpl.description}</p>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={() => handleSelectTemplate(tpl.id, 'outro')}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-rose-500 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Ending ({projectDuration.toFixed(1)}s)</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 3. SAVED CUSTOM TEMPLATES */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              {savedTemplates.length === 0 ? (
                <div className="p-12 text-center bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                  <Bookmark className="w-8 h-8 text-slate-600 mx-auto" />
                  <h3 className="font-bold text-slate-300">No Saved Custom Templates Yet</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Customize any Intro or Outro slide in the editor, then click "Save as Reusable Template" to store it here for future videos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {savedTemplates.map((st) => (
                    <div
                      key={st.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-500/10 text-sky-400">
                            {st.slideType}
                          </span>
                          <button
                            onClick={() => handleDeleteSavedTemplate(st.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Delete template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4 className="font-bold text-sm text-slate-200 mb-1">{st.name}</h4>
                        <p className="text-xs text-slate-400">
                          {st.cardConfig.headline || st.cardConfig.title || 'Saved Custom Slide'}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          const ts = st.slideType === 'intro' ? 0 : projectDuration;
                          const newSlide = createSlideFromTemplate(
                            st.templateId || 'intro_01',
                            st.slideType,
                            ts,
                            activePreset
                          );
                          // Merge saved config
                          Object.assign(newSlide, st.cardConfig);
                          onAddSlide(newSlide);
                          onClose();
                        }}
                        className="mt-4 w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Use Custom Template</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. REUSABLE PROFILES & BRANDING */}
          {activeTab === 'profiles' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-between bg-sky-500/10 border border-sky-500/20 p-4 rounded-xl">
                <div>
                  <h3 className="font-bold text-sky-400 text-sm">Reusable Creator & Product Profiles</h3>
                  <p className="text-xs text-slate-400">
                    Save your brand info once. Intro & Outro templates automatically populate these details!
                  </p>
                </div>
                {showSavedNotification && (
                  <span className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 animate-pulse">
                    <Check className="w-3.5 h-3.5" />
                    Profiles Saved!
                  </span>
                )}
              </div>

              {/* Product Profile Section */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-slate-200 text-sm border-b border-slate-800 pb-2">
                  Product Profile (SaaS / App Info)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Product Name</label>
                    <input
                      type="text"
                      value={productProfile.name}
                      onChange={(e) => setProductProfile({ ...productProfile, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Product Website</label>
                    <div className="relative">
                      <Globe className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={productProfile.website || ''}
                        onChange={(e) => setProductProfile({ ...productProfile, website: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-400 font-medium mb-1">Product Tagline</label>
                    <input
                      type="text"
                      value={productProfile.tagline || ''}
                      onChange={(e) => setProductProfile({ ...productProfile, tagline: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-400 font-medium mb-1">Product Logo Image</label>
                    <div className="flex items-center gap-4">
                      {productProfile.logoUrl ? (
                        <img
                          src={productProfile.logoUrl}
                          alt="Logo"
                          className="w-12 h-12 object-contain bg-slate-900 rounded-xl p-1 border border-slate-800"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 text-xs font-bold">
                          Logo
                        </div>
                      )}

                      <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer flex items-center gap-2 border border-slate-700">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Brand Logo</span>
                        <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Creator Profile Section */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-slate-200 text-sm border-b border-slate-800 pb-2">
                  Creator / Founder Profile
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Full Name</label>
                    <input
                      type="text"
                      value={creatorProfile.name}
                      onChange={(e) => setCreatorProfile({ ...creatorProfile, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Role / Title</label>
                    <input
                      type="text"
                      value={creatorProfile.role || ''}
                      onChange={(e) => setCreatorProfile({ ...creatorProfile, role: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Contact Email</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={creatorProfile.email || ''}
                        onChange={(e) => setCreatorProfile({ ...creatorProfile, email: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">X / Twitter Handle</label>
                    <div className="relative">
                      <Twitter className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={creatorProfile.twitter || ''}
                        onChange={(e) => setCreatorProfile({ ...creatorProfile, twitter: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">YouTube Channel</label>
                    <div className="relative">
                      <Youtube className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={creatorProfile.youtube || ''}
                        onChange={(e) => setCreatorProfile({ ...creatorProfile, youtube: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">LinkedIn Profile</label>
                    <div className="relative">
                      <Linkedin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={creatorProfile.linkedin || ''}
                        onChange={(e) => setCreatorProfile({ ...creatorProfile, linkedin: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-400 font-medium mb-1">Founder / Author Photo</label>
                    <div className="flex items-center gap-4">
                      {creatorProfile.photoUrl ? (
                        <img
                          src={creatorProfile.photoUrl}
                          alt="Author"
                          className="w-12 h-12 object-cover rounded-full border border-slate-800"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 text-xs font-bold">
                          Photo
                        </div>
                      )}

                      <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer flex items-center gap-2 border border-slate-700">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Founder Photo</span>
                        <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Profiles Action */}
              <button
                onClick={handleSaveProfiles}
                className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Default Reusable Profiles</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
