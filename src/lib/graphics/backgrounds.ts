// Curated Unsplash background collections for SaaS, AI, Tech, Developer, and Product Marketing
export interface BackgroundItem {
  id: string;
  title: string;
  category: 'saas' | 'ai' | 'tech' | 'abstract' | 'gradient' | 'minimal';
  type: 'image' | 'gradient' | 'color';
  value: string; // Image URL, CSS gradient, or Hex color
  thumbnailUrl?: string;
}

export const UNSPLASH_BACKGROUNDS: BackgroundItem[] = [
  {
    id: 'bg_tech_dark_grid',
    title: 'Cyber Grid & Code',
    category: 'tech',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1920&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'bg_ai_neural_mesh',
    title: 'AI Neural Mesh',
    category: 'ai',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'bg_saas_dashboard_blur',
    title: 'SaaS Workspace Glow',
    category: 'saas',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1920&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'bg_abstract_fluid_neon',
    title: 'Neon Fluid Waves',
    category: 'abstract',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1920&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'bg_developer_terminal',
    title: 'Dark Developer Minimal',
    category: 'tech',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1920&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'bg_abstract_glassmorphism',
    title: 'Prismatic Glass',
    category: 'abstract',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1920&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'bg_minimal_studio',
    title: 'Clean Minimal Studio',
    category: 'minimal',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=1920&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'bg_ai_deep_space',
    title: 'Deep AI Horizon',
    category: 'ai',
    type: 'image',
    value: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1920&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=400&auto=format&fit=crop',
  },
];

export const GRADIENT_BACKGROUNDS: BackgroundItem[] = [
  {
    id: 'grad_sky_purple',
    title: 'Sky Blue → Purple',
    category: 'gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #0284c7 0%, #7e22ce 100%)',
  },
  {
    id: 'grad_blue_cyan',
    title: 'Blue → Cyan',
    category: 'gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #1d4ed8 0%, #06b6d4 100%)',
  },
  {
    id: 'grad_purple_pink',
    title: 'Purple → Pink',
    category: 'gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
  },
  {
    id: 'grad_dark_blue_black',
    title: 'Dark Blue → Black',
    category: 'gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)',
  },
  {
    id: 'grad_cyan_blue',
    title: 'Cyan → Blue',
    category: 'gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #0891b2 0%, #2563eb 100%)',
  },
  {
    id: 'grad_light_blue_white',
    title: 'Light Blue → White',
    category: 'gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #e0f2fe 0%, #f8fafc 100%)',
  },
  {
    id: 'grad_slate_tech',
    title: 'Slate Tech Minimal',
    category: 'gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
  },
  {
    id: 'grad_emerald_pulse',
    title: 'Emerald SaaS',
    category: 'gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
  },
];

export const SOLID_BACKGROUNDS: BackgroundItem[] = [
  { id: 'solid_dark_950', title: 'Deep Dark Slate', category: 'minimal', type: 'color', value: '#020617' },
  { id: 'solid_dark_900', title: 'SaaS Dark Navy', category: 'minimal', type: 'color', value: '#0f172a' },
  { id: 'solid_pure_black', title: 'Pure OLED Black', category: 'minimal', type: 'color', value: '#000000' },
  { id: 'solid_light_white', title: 'Clean White', category: 'minimal', type: 'color', value: '#ffffff' },
  { id: 'solid_slate_50', title: 'Soft Slate Light', category: 'minimal', type: 'color', value: '#f8fafc' },
  { id: 'solid_sky_600', title: 'Sky Blue Accent', category: 'minimal', type: 'color', value: '#0284c7' },
  { id: 'solid_indigo_600', title: 'Indigo Tech', category: 'minimal', type: 'color', value: '#4f46e5' },
];

export const SAAS_FONTS = [
  { id: 'inter', name: 'Inter', family: 'Inter, sans-serif' },
  { id: 'plus_jakarta', name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif" },
  { id: 'outfit', name: 'Outfit', family: 'Outfit, sans-serif' },
  { id: 'poppins', name: 'Poppins', family: 'Poppins, sans-serif' },
  { id: 'playfair', name: 'Playfair Display', family: "'Playfair Display', serif" },
  { id: 'mono', name: 'SF Mono Code', family: 'ui-monospace, SFMono-Regular, monospace' },
];
