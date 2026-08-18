import { StylePreset } from '../types';

export const DEFAULT_PRESETS: StylePreset[] = [
  {
    id: 'preset_saas_style',
    name: 'My SaaS Style',
    description: 'Sky-blue & purple gradients with white text and rounded callouts',
    isCustom: false,
    transitionBgColor: '#0f172a',
    transitionTextColor: '#38bdf8',
    transitionStyle: 'saas',
    transitionFontSize: 32,
    transitionFontFamily: 'Inter, sans-serif',
    calloutBgColor: '#0284c7',
    calloutTextColor: '#ffffff',
    calloutStyle: 'rounded',
    calloutFontFamily: 'Inter, sans-serif',
    calloutFontSize: 16,
    calloutFontWeight: '600',
    calloutFontStyle: 'normal',
    calloutTextAlign: 'left',
    calloutPadding: 16,
    calloutBorderRadius: 12,
    calloutShadow: true,
    clickColor: '#38bdf8',
    clickStyle: 'ripple',
  },
  {
    id: 'preset_dark_minimal',
    name: 'Dark Minimal',
    description: 'Sleek dark floating cards with high contrast text',
    isCustom: false,
    transitionBgColor: '#020617',
    transitionTextColor: '#38bdf8',
    transitionStyle: 'minimal',
    transitionFontSize: 30,
    transitionFontFamily: 'ui-monospace, SFMono-Regular, monospace',
    calloutBgColor: '#1e293b',
    calloutTextColor: '#38bdf8',
    calloutStyle: 'floating',
    calloutFontFamily: 'ui-monospace, SFMono-Regular, monospace',
    calloutFontSize: 15,
    calloutFontWeight: '600',
    calloutFontStyle: 'normal',
    calloutTextAlign: 'left',
    calloutPadding: 14,
    calloutBorderRadius: 10,
    calloutShadow: true,
    clickColor: '#38bdf8',
    clickStyle: 'highlight',
  },
  {
    id: 'preset_vibrant_launch',
    name: 'Vibrant Launch',
    description: 'Eye-catching rose background with speech bubbles',
    isCustom: false,
    transitionBgColor: '#f43f5e',
    transitionTextColor: '#ffffff',
    transitionStyle: 'gradient',
    transitionFontSize: 36,
    transitionFontFamily: 'system-ui, sans-serif',
    calloutBgColor: '#f43f5e',
    calloutTextColor: '#ffffff',
    calloutStyle: 'speech',
    calloutFontFamily: 'system-ui, sans-serif',
    calloutFontSize: 17,
    calloutFontWeight: '800',
    calloutFontStyle: 'normal',
    calloutTextAlign: 'center',
    calloutPadding: 18,
    calloutBorderRadius: 16,
    calloutShadow: true,
    clickColor: '#f43f5e',
    clickStyle: 'pulse',
  },
  {
    id: 'preset_corporate_tech',
    name: 'Corporate Tech',
    description: 'Professional navy blue with clean caption tags',
    isCustom: false,
    transitionBgColor: '#1e3a8a',
    transitionTextColor: '#ffffff',
    transitionStyle: 'centered',
    transitionFontSize: 34,
    transitionFontFamily: 'Georgia, serif',
    calloutBgColor: '#1e3a8a',
    calloutTextColor: '#ffffff',
    calloutStyle: 'minimal',
    calloutFontFamily: 'Georgia, serif',
    calloutFontSize: 16,
    calloutFontWeight: '600',
    calloutFontStyle: 'normal',
    calloutTextAlign: 'left',
    calloutPadding: 16,
    calloutBorderRadius: 8,
    calloutShadow: false,
    clickColor: '#60a5fa',
    clickStyle: 'spotlight',
  },
];

const PRESETS_STORAGE_KEY = 'saas_demo_creator_style_presets';

export function getCustomPresets(): StylePreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse custom presets:', e);
    return [];
  }
}

export function getAllPresets(): StylePreset[] {
  return [...DEFAULT_PRESETS, ...getCustomPresets()];
}

export function saveCustomPreset(preset: StylePreset): void {
  const existing = getCustomPresets();
  const updated = [preset, ...existing.filter((p) => p.id !== preset.id)];
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated));
}

export function deleteCustomPreset(id: string): void {
  const existing = getCustomPresets();
  const updated = existing.filter((p) => p.id !== id);
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated));
}
