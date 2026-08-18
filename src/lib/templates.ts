import { TransitionCard, SlideType, CreatorProfile, ProductProfile, CustomSlideTemplate, StylePreset } from '../types';

export interface SlideTemplateDefinition {
  id: string;
  slideType: SlideType;
  name: string;
  category: 'SaaS' | 'AI' | 'Tutorial' | 'CTA' | 'Founder' | 'Minimal' | 'Split' | 'Bold';
  description: string;
  defaultConfig: Partial<TransitionCard>;
}

export const INTRO_TEMPLATES: SlideTemplateDefinition[] = [
  {
    id: 'intro_01',
    slideType: 'intro',
    name: 'Intro 1 — Simple Product Title',
    category: 'SaaS',
    description: 'Clean product name and short tagline. Perfect for simple SaaS product walkthroughs.',
    defaultConfig: {
      title: 'ACME STUDIO',
      tagline: 'The modern video editing suite for SaaS builders & creators',
      style: 'saas',
      duration: 4.0,
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#38bdf8',
      fontSize: 42,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'center',
      bgType: 'gradient',
      gradientColors: ['#0f172a', '#1e293b'],
      gradientDirection: 'to-br',
      animationStyle: 'fade',
    },
  },
  {
    id: 'intro_02',
    slideType: 'intro',
    name: 'Intro 2 — Product + Screenshot',
    category: 'SaaS',
    description: 'Displays your product name, tagline, and an embedded application UI screenshot.',
    defaultConfig: {
      title: 'ACME STUDIO',
      tagline: 'Build better video workflows in minutes',
      headline: 'Build better video workflows',
      style: 'saas',
      duration: 4.5,
      bgColor: '#020617',
      textColor: '#ffffff',
      accentColor: '#38bdf8',
      fontSize: 38,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'center',
      bgType: 'gradient',
      gradientColors: ['#020617', '#0f172a'],
      gradientDirection: 'to-b',
      animationStyle: 'pop',
    },
  },
  {
    id: 'intro_03',
    slideType: 'intro',
    name: 'Intro 3 — Large Headline',
    category: 'Bold',
    description: 'High-impact marketing headline with a subtle product name tag and gradient backdrop.',
    defaultConfig: {
      title: 'ACME STUDIO',
      headline: 'Build AI-powered apps faster than ever.',
      subtitle: 'A complete developer platform for modern product teams.',
      style: 'gradient',
      duration: 5.0,
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#818cf8',
      fontSize: 44,
      fontWeight: 'bold',
      fontFamily: 'system-ui, sans-serif',
      alignment: 'center',
      bgType: 'gradient',
      gradientColors: ['#0f172a', '#3b82f6', '#1e1b4b'],
      gradientDirection: 'to-br',
      animationStyle: 'slide',
    },
  },
  {
    id: 'intro_04',
    slideType: 'intro',
    name: 'Intro 4 — AI Product',
    category: 'AI',
    description: 'Tailored for AI tools with prominent AI badges, glowing accents, and product screenshot.',
    defaultConfig: {
      title: 'ACME AI',
      headline: 'Meet your new AI assistant.',
      subtitle: 'Automate customer support, lead generation, and content creation.',
      style: 'saas',
      duration: 4.5,
      bgColor: '#090d16',
      textColor: '#f8fafc',
      accentColor: '#38bdf8',
      fontSize: 40,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'center',
      bgType: 'gradient',
      gradientColors: ['#030712', '#0f172a', '#1e1b4b'],
      gradientDirection: 'to-br',
      animationStyle: 'stagger',
    },
  },
  {
    id: 'intro_05',
    slideType: 'intro',
    name: 'Intro 5 — Feature Introduction',
    category: 'SaaS',
    description: 'Introduces a specific feature or release before launching into the demo.',
    defaultConfig: {
      title: 'ACME STUDIO',
      headline: "Today we're going to see how to automate customer support with Acme AI",
      subtitle: 'Feature Walkthrough & Implementation Guide',
      style: 'centered',
      duration: 4.5,
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#38bdf8',
      fontSize: 34,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'center',
      bgType: 'gradient',
      gradientColors: ['#0f172a', '#1e293b'],
      gradientDirection: 'to-r',
      animationStyle: 'fade',
    },
  },
  {
    id: 'intro_06',
    slideType: 'intro',
    name: 'Intro 6 — Tutorial Style',
    category: 'Tutorial',
    description: 'Designed for YouTube & developer tutorials. Focuses on topic + product context.',
    defaultConfig: {
      title: 'ACME DEVELOPER HUB',
      headline: 'How to Set Up Your API Key in Under 2 Minutes',
      subtitle: 'A complete step-by-step walkthrough of Acme Studio',
      style: 'minimal',
      duration: 4.0,
      bgColor: '#020617',
      textColor: '#38bdf8',
      accentColor: '#60a5fa',
      fontSize: 36,
      fontWeight: 'bold',
      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
      alignment: 'center',
      bgType: 'solid',
      animationStyle: 'typewriter',
    },
  },
  {
    id: 'intro_07',
    slideType: 'intro',
    name: 'Intro 7 — Product Screenshot Focus',
    category: 'SaaS',
    description: 'Puts a large application UI screenshot front and center with crisp titles above.',
    defaultConfig: {
      title: 'ACME DASHBOARD',
      headline: 'Real-Time SaaS Analytics Platform',
      tagline: 'Track MRR, churn, and active users in one unified dashboard',
      style: 'saas',
      duration: 5.0,
      bgColor: '#0f172a',
      textColor: '#f8fafc',
      accentColor: '#38bdf8',
      fontSize: 38,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'center',
      bgType: 'gradient',
      gradientColors: ['#020617', '#0f172a'],
      gradientDirection: 'to-b',
      animationStyle: 'zoom',
    },
  },
  {
    id: 'intro_08',
    slideType: 'intro',
    name: 'Intro 8 — Minimal',
    category: 'Minimal',
    description: 'Ultra-clean, elegant design with generous whitespace and a subtle brand logo.',
    defaultConfig: {
      title: 'ACME',
      tagline: 'Simple, fast, and elegant product workflows.',
      style: 'minimal',
      duration: 3.5,
      bgColor: '#020617',
      textColor: '#ffffff',
      accentColor: '#94a3b8',
      fontSize: 40,
      fontWeight: 'semibold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'center',
      bgType: 'solid',
      animationStyle: 'fade',
    },
  },
  {
    id: 'intro_09',
    slideType: 'intro',
    name: 'Intro 9 — Bold Gradient',
    category: 'Bold',
    description: 'Vibrant multi-color gradient background paired with high-contrast display text.',
    defaultConfig: {
      title: 'ACME DEMO',
      headline: 'Transform your product demos today',
      subtitle: 'Instant sharable SaaS video presentations.',
      style: 'gradient',
      duration: 4.5,
      bgColor: '#4f46e5',
      textColor: '#ffffff',
      accentColor: '#38bdf8',
      fontSize: 42,
      fontWeight: 'bold',
      fontFamily: 'system-ui, sans-serif',
      alignment: 'center',
      bgType: 'gradient',
      gradientColors: ['#312e81', '#4f46e5', '#9333ea'],
      gradientDirection: 'to-br',
      animationStyle: 'slide',
    },
  },
  {
    id: 'intro_10',
    slideType: 'intro',
    name: 'Intro 10 — Split Screen',
    category: 'Split',
    description: 'Side-by-side layout: Text details on the left, UI screenshot on the right.',
    defaultConfig: {
      title: 'ACME PLATFORM',
      headline: 'Next-Generation Developer Workspace',
      subtitle: 'Empower your engineering team with automated CI/CD and real-time monitoring.',
      style: 'saas',
      duration: 5.0,
      bgColor: '#0b0f19',
      textColor: '#ffffff',
      accentColor: '#38bdf8',
      fontSize: 36,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'left',
      bgType: 'gradient',
      gradientColors: ['#030712', '#0f172a'],
      gradientDirection: 'to-r',
      animationStyle: 'slide',
    },
  },
];

export const OUTRO_TEMPLATES: SlideTemplateDefinition[] = [
  {
    id: 'outro_01',
    slideType: 'outro',
    name: 'Outro 1 — Visit Website',
    category: 'CTA',
    description: 'Directs viewers to your main website URL with a clear Thank You ending.',
    defaultConfig: {
      title: 'THANK YOU',
      headline: 'Learn more and start your free trial',
      websiteUrl: 'acme.ai',
      ctaText: 'Visit acme.ai',
      style: 'centered',
      duration: 5.0,
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#38bdf8',
      buttonColor: '#0284c7',
      buttonTextColor: '#ffffff',
      fontSize: 40,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'center',
      bgType: 'gradient',
      gradientColors: ['#0f172a', '#1e293b'],
      gradientDirection: 'to-br',
      animationStyle: 'fade',
    },
  },
  {
    id: 'outro_02',
    slideType: 'outro',
    name: 'Outro 2 — Subscribe',
    category: 'Tutorial',
    description: 'Encourages viewers to subscribe to your channel or newsletter for upcoming tutorials.',
    defaultConfig: {
      title: 'ENJOYED THIS DEMO?',
      headline: 'Subscribe for more weekly product tutorials & walkthroughs',
      ctaText: 'Subscribe Now',
      websiteUrl: 'youtube.com/@acme',
      style: 'saas',
      duration: 5.5,
      bgColor: '#020617',
      textColor: '#ffffff',
      accentColor: '#f43f5e',
      buttonColor: '#f43f5e',
      buttonTextColor: '#ffffff',
      fontSize: 38,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'center',
      bgType: 'gradient',
      gradientColors: ['#020617', '#1e1b4b'],
      gradientDirection: 'to-b',
      animationStyle: 'pop',
    },
  },
  {
    id: 'outro_03',
    slideType: 'outro',
    name: 'Outro 3 — Product CTA',
    category: 'CTA',
    description: 'High-converting product call-to-action slide with prominent primary button.',
    defaultConfig: {
      title: 'TRY ACME TODAY',
      headline: 'Start building your next application in seconds',
      ctaText: 'Start Free Trial',
      websiteUrl: 'acme.ai/signup',
      style: 'saas',
      duration: 6.0,
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#38bdf8',
      buttonColor: '#0284c7',
      buttonTextColor: '#ffffff',
      fontSize: 42,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'center',
      bgType: 'gradient',
      gradientColors: ['#0b0f19', '#0284c7', '#0f172a'],
      gradientDirection: 'to-br',
      animationStyle: 'zoom',
    },
  },
  {
    id: 'outro_04',
    slideType: 'outro',
    name: 'Outro 4 — Social Profiles',
    category: 'CTA',
    description: 'Displays social media handles across X/Twitter, Instagram, LinkedIn, and YouTube.',
    defaultConfig: {
      title: 'FOLLOW US',
      headline: 'Stay updated with our latest features and releases',
      socialHandles: {
        twitter: '@acme_ai',
        youtube: 'youtube.com/@acme',
        linkedin: 'linkedin.com/company/acme',
        instagram: '@acme_studio',
      },
      websiteUrl: 'acme.ai',
      style: 'saas',
      duration: 6.0,
      bgColor: '#090d16',
      textColor: '#f8fafc',
      accentColor: '#38bdf8',
      fontSize: 36,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'center',
      bgType: 'solid',
      animationStyle: 'stagger',
    },
  },
  {
    id: 'outro_05',
    slideType: 'outro',
    name: 'Outro 5 — Contact',
    category: 'CTA',
    description: 'Connect directly with your team via email and official website URL.',
    defaultConfig: {
      title: "LET'S CONNECT",
      headline: 'Have questions or need a custom enterprise demo?',
      email: 'hello@acme.ai',
      websiteUrl: 'acme.ai/contact',
      ctaText: 'Contact Support',
      style: 'centered',
      duration: 5.0,
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#60a5fa',
      fontSize: 38,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'center',
      bgType: 'gradient',
      gradientColors: ['#0f172a', '#1e293b'],
      gradientDirection: 'to-r',
      animationStyle: 'fade',
    },
  },
  {
    id: 'outro_06',
    slideType: 'outro',
    name: 'Outro 6 — Multiple CTA',
    category: 'CTA',
    description: 'Offers multiple action paths: Try product, Visit website, Follow, or Subscribe.',
    defaultConfig: {
      title: 'WHAT TO DO NEXT',
      headline: 'Choose your preferred next step:',
      ctaText: 'Get Started for Free',
      websiteUrl: 'acme.ai',
      email: 'contact@acme.ai',
      socialHandles: {
        twitter: '@acme_ai',
        youtube: 'youtube.com/@acme',
      },
      style: 'saas',
      duration: 6.5,
      bgColor: '#030712',
      textColor: '#ffffff',
      accentColor: '#38bdf8',
      fontSize: 36,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'center',
      bgType: 'gradient',
      gradientColors: ['#030712', '#0f172a'],
      gradientDirection: 'to-b',
      animationStyle: 'slide',
    },
  },
  {
    id: 'outro_07',
    slideType: 'outro',
    name: 'Outro 7 — Product Screenshot',
    category: 'SaaS',
    description: 'Combines an application UI screenshot card alongside strong call-to-action buttons.',
    defaultConfig: {
      title: 'READY TO UPGRADE?',
      headline: 'Experience the full power of Acme Studio today',
      ctaText: 'Try Acme Free',
      websiteUrl: 'acme.ai',
      style: 'saas',
      duration: 6.0,
      bgColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#38bdf8',
      fontSize: 38,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'center',
      bgType: 'gradient',
      gradientColors: ['#020617', '#0f172a'],
      gradientDirection: 'to-b',
      animationStyle: 'pop',
    },
  },
  {
    id: 'outro_08',
    slideType: 'outro',
    name: 'Outro 8 — Founder/Creator',
    category: 'Founder',
    description: 'Personalized outro featuring founder photo, name, role, website, and personal social handles.',
    defaultConfig: {
      title: 'BUILT BY INDIE BUILDERS',
      authorName: 'Alex River',
      authorRole: 'Founder, Acme AI',
      headline: 'Thanks for watching! Reach out anytime if you have feedback.',
      websiteUrl: 'acme.ai',
      email: 'alex@acme.ai',
      socialHandles: {
        twitter: '@alex_river_ai',
        linkedin: 'linkedin.com/in/alexriver',
      },
      style: 'saas',
      duration: 6.0,
      bgColor: '#090d16',
      textColor: '#ffffff',
      accentColor: '#38bdf8',
      fontSize: 36,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'center',
      bgType: 'gradient',
      gradientColors: ['#090d16', '#1e293b'],
      gradientDirection: 'to-br',
      animationStyle: 'stagger',
    },
  },
  {
    id: 'outro_09',
    slideType: 'outro',
    name: 'Outro 9 — Next Video',
    category: 'Tutorial',
    description: 'Designed for YouTube video series with a reserved thumbnail frame for the next tutorial.',
    defaultConfig: {
      title: 'UP NEXT',
      headline: 'Watch the next tutorial: "Advanced API Workflows"',
      ctaText: 'Watch Next Tutorial',
      websiteUrl: 'youtube.com/@acme',
      style: 'saas',
      duration: 5.5,
      bgColor: '#020617',
      textColor: '#ffffff',
      accentColor: '#38bdf8',
      fontSize: 38,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'center',
      bgType: 'gradient',
      gradientColors: ['#020617', '#0f172a'],
      gradientDirection: 'to-b',
      animationStyle: 'slide',
    },
  },
  {
    id: 'outro_10',
    slideType: 'outro',
    name: 'Outro 10 — Minimal Brand Outro',
    category: 'Minimal',
    description: 'A clean, aesthetic brand ending card with logo, product name, and website link.',
    defaultConfig: {
      title: 'ACME STUDIO',
      headline: 'acme.ai',
      websiteUrl: 'acme.ai',
      style: 'minimal',
      duration: 4.0,
      bgColor: '#020617',
      textColor: '#ffffff',
      accentColor: '#94a3b8',
      fontSize: 38,
      fontWeight: 'semibold',
      fontFamily: 'Inter, sans-serif',
      alignment: 'center',
      bgType: 'solid',
      animationStyle: 'fade',
    },
  },
];

// Local Storage Keys
const CREATOR_PROFILE_KEY = 'saas_demo_creator_creator_profile';
const PRODUCT_PROFILE_KEY = 'saas_demo_creator_product_profile';
const CUSTOM_TEMPLATES_KEY = 'saas_demo_creator_custom_slide_templates';

// Default Profiles
export const DEFAULT_CREATOR_PROFILE: CreatorProfile = {
  name: 'Alex River',
  role: 'Founder & Maker',
  website: 'acme.ai',
  email: 'alex@acme.ai',
  twitter: '@alex_river_ai',
  youtube: 'youtube.com/@acme',
  linkedin: 'linkedin.com/in/alexriver',
};

export const DEFAULT_PRODUCT_PROFILE: ProductProfile = {
  name: 'Acme Studio',
  tagline: 'The modern SaaS video demo creator',
  website: 'acme.ai',
};

// Local Storage Helper Functions
export function getCreatorProfile(): CreatorProfile {
  try {
    const raw = localStorage.getItem(CREATOR_PROFILE_KEY);
    if (!raw) return DEFAULT_CREATOR_PROFILE;
    return { ...DEFAULT_CREATOR_PROFILE, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_CREATOR_PROFILE;
  }
}

export function saveCreatorProfile(profile: CreatorProfile): void {
  localStorage.setItem(CREATOR_PROFILE_KEY, JSON.stringify(profile));
}

export function getProductProfile(): ProductProfile {
  try {
    const raw = localStorage.getItem(PRODUCT_PROFILE_KEY);
    if (!raw) return DEFAULT_PRODUCT_PROFILE;
    return { ...DEFAULT_PRODUCT_PROFILE, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_PRODUCT_PROFILE;
  }
}

export function saveProductProfile(profile: ProductProfile): void {
  localStorage.setItem(PRODUCT_PROFILE_KEY, JSON.stringify(profile));
}

export function getCustomSlideTemplates(): CustomSlideTemplate[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveCustomSlideTemplate(template: CustomSlideTemplate): void {
  const existing = getCustomSlideTemplates();
  const updated = [template, ...existing.filter((t) => t.id !== template.id)];
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(updated));
}

export function deleteCustomSlideTemplate(id: string): void {
  const existing = getCustomSlideTemplates();
  const updated = existing.filter((t) => t.id !== id);
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(updated));
}

/**
 * Creates a new TransitionCard slide instance populated with template config,
 * user creator/product profiles, and optional brand preset.
 */
export function createSlideFromTemplate(
  templateId: string,
  slideType: SlideType,
  timestamp: number,
  customPreset?: StylePreset
): TransitionCard {
  const allTemplates = [...INTRO_TEMPLATES, ...OUTRO_TEMPLATES];
  const templateDef = allTemplates.find((t) => t.id === templateId);

  const creator = getCreatorProfile();
  const product = getProductProfile();

  const baseConfig = templateDef ? templateDef.defaultConfig : INTRO_TEMPLATES[0].defaultConfig;

  const card: TransitionCard = {
    id: `slide_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    title: baseConfig.title || product.name || 'ACME DEMO',
    subtitle: baseConfig.subtitle || product.tagline || '',
    style: customPreset?.transitionStyle || baseConfig.style || 'saas',
    timestamp,
    duration: baseConfig.duration || 5.0,
    bgColor: customPreset?.transitionBgColor || baseConfig.bgColor || '#0f172a',
    textColor: customPreset?.transitionTextColor || baseConfig.textColor || '#ffffff',
    fontSize: baseConfig.fontSize || 38,
    fontFamily: customPreset?.transitionFontFamily || baseConfig.fontFamily || 'Inter, sans-serif',
    alignment: baseConfig.alignment || 'center',

    slideType,
    templateId,
    productName: product.name || baseConfig.title || 'ACME STUDIO',
    tagline: product.tagline || baseConfig.tagline || '',
    headline: baseConfig.headline || baseConfig.title || 'Welcome to our Demo',
    description: baseConfig.description || '',
    ctaText: baseConfig.ctaText || 'Visit Website',
    websiteUrl: product.website || baseConfig.websiteUrl || 'example.com',
    email: creator.email || baseConfig.email || 'hello@example.com',
    socialHandles: {
      twitter: creator.twitter || baseConfig.socialHandles?.twitter || '@acme_ai',
      youtube: creator.youtube || baseConfig.socialHandles?.youtube || 'youtube.com/@acme',
      linkedin: creator.linkedin || baseConfig.socialHandles?.linkedin || '',
      instagram: creator.instagram || baseConfig.socialHandles?.instagram || '',
    },
    authorName: creator.name || 'John Doe',
    authorRole: creator.role || 'Founder',
    authorPhotoUrl: creator.photoUrl || '',
    logoUrl: product.logoUrl || '',
    screenshotUrl: '',

    bgType: baseConfig.bgType || 'gradient',
    gradientColors: baseConfig.gradientColors || ['#0f172a', '#1e293b'],
    gradientDirection: baseConfig.gradientDirection || 'to-br',
    accentColor: customPreset?.clickColor || baseConfig.accentColor || '#38bdf8',
    buttonColor: customPreset?.calloutBgColor || baseConfig.buttonColor || '#0284c7',
    buttonTextColor: customPreset?.calloutTextColor || baseConfig.buttonTextColor || '#ffffff',

    fontWeight: baseConfig.fontWeight || 'bold',
    animationStyle: baseConfig.animationStyle || 'fade',
  };

  return card;
}
