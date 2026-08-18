export type ClickStyle = 'ripple' | 'highlight' | 'pulse' | 'spotlight' | 'cursor';

export type AnnotationStyle = 'rounded' | 'speech' | 'floating' | 'highlight' | 'minimal';

export type AnnotationAnimation = 'fade' | 'slide' | 'pop' | 'typewriter' | 'expand';

export type TransitionStyle = 'minimal' | 'centered' | 'saas' | 'gradient' | 'slide' | 'zoom';

export type SlideType = 'intro' | 'outro' | 'transition';

export interface VideoSegment {
  id: string;
  startTime: number; // relative to source video
  endTime: number;   // relative to source video
  speed: number;     // 1.0, 1.25, 1.5, 2.0
}

export interface ClickAnimation {
  id: string;
  timestamp: number; // in project timeline seconds
  x: number;         // percentage (0-100)
  y: number;         // percentage (0-100)
  style: ClickStyle;
  size: number;      // px radius or scale (e.g., 20-80)
  duration: number;  // seconds (e.g., 0.6)
  color: string;     // hex or rgba string
  playSound?: boolean;
}

export interface TextAnnotation {
  id: string;
  text: string;
  style: AnnotationStyle;
  animation: AnnotationAnimation;
  startTime: number; // timeline seconds
  duration: number;  // seconds
  x: number;         // percentage (0-100)
  y: number;         // percentage (0-100)
  width?: number;    // percentage or px
  fontSize: number;  // px (e.g., 16)
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  padding?: number;
  borderRadius?: number;
  shadow?: boolean;
  textColor: string;
  bgColor: string;
  borderColor?: string;
  opacity: number;   // 0.1 - 1.0
  arrowDirection?: 'top' | 'bottom' | 'left' | 'right' | 'none';
}

export interface TransitionCard {
  id: string;
  title: string;
  subtitle?: string;
  style: TransitionStyle;
  timestamp: number; // timeline seconds where transition is inserted
  duration: number;  // seconds (e.g., 2.5)
  bgColor: string;
  textColor: string;
  fontSize: number;  // px (e.g. 28)
  fontFamily?: string;
  alignment: 'center' | 'left';

  // Extended Slide Properties for Intros & Outros
  slideType?: SlideType;
  templateId?: string; // e.g. 'intro_01', 'outro_08'
  productName?: string;
  tagline?: string;
  headline?: string;
  description?: string;
  ctaText?: string;
  websiteUrl?: string;
  email?: string;
  socialHandles?: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  authorName?: string;
  authorRole?: string;
  authorPhotoUrl?: string;
  logoUrl?: string;
  screenshotUrl?: string;

  // Background & Styling
  bgType?: 'solid' | 'gradient' | 'image';
  gradientColors?: string[]; // e.g., ['#0f172a', '#0284c7']
  gradientDirection?: 'to-r' | 'to-br' | 'to-b' | 'radial';
  bgImageUrl?: string;
  bgOverlayOpacity?: number; // 0 - 1
  accentColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;

  // Typography & Animation
  fontWeight?: string;
  animationStyle?: 'fade' | 'slide' | 'pop' | 'typewriter' | 'zoom' | 'stagger';
}

export interface CreatorProfile {
  name: string;
  role?: string;
  photoUrl?: string;
  website?: string;
  email?: string;
  twitter?: string;
  youtube?: string;
  instagram?: string;
  linkedin?: string;
}

export interface ProductProfile {
  name: string;
  tagline?: string;
  website?: string;
  logoUrl?: string;
}

export interface CustomSlideTemplate {
  id: string;
  name: string;
  slideType: SlideType;
  templateId: string;
  cardConfig: Partial<TransitionCard>;
  createdAt: number;
}

export interface StylePreset {
  id: string;
  name: string;
  description?: string;
  isCustom?: boolean;
  transitionBgColor: string;
  transitionTextColor: string;
  transitionStyle: TransitionStyle;
  transitionFontSize: number;
  transitionFontFamily?: string;
  calloutBgColor: string;
  calloutTextColor: string;
  calloutStyle: AnnotationStyle;
  calloutFontFamily: string;
  calloutFontSize: number;
  calloutFontWeight?: string;
  calloutFontStyle?: string;
  calloutTextAlign?: 'left' | 'center' | 'right';
  calloutPadding?: number;
  calloutBorderRadius?: number;
  calloutShadow?: boolean;
  clickColor: string;
  clickStyle: ClickStyle;
}

export interface AudioTrack {
  id: string;
  name: string;
  audioBlobUrl?: string; // blob URL or synth preset id
  presetId?: string;     // 'upbeat' | 'ambient' | 'lofi'
  volume: number;        // 0.0 - 1.0
  fadeIn: boolean;
  fadeOut: boolean;
  loop: boolean;
  startTime: number;     // timeline start offset
  duration: number;      // duration to play
}

export interface ProjectSettings {
  width: number;
  height: number;
  fps: number;
}

export type ZoomStyle = 'smooth' | 'ease' | 'cinematic' | 'subtle';
export type ZoomBackOutBehavior = 'immediate' | 'delay' | 'keep';

export interface AutoZoomSettings {
  enabled: boolean;
  defaultZoomLevel: number;
  zoomDuration: 'fast' | 'normal' | 'slow' | 'custom';
  customDuration?: number;
  zoomStyle: ZoomStyle;
  zoomBackOut: ZoomBackOutBehavior;
  holdDuration?: number;
}

export interface ZoomEvent {
  id: string;
  timestamp: number;
  duration: number;
  zoomInSpeed: number;
  zoomOutSpeed: number;
  zoomLevel: number;
  x: number;
  y: number;
  style: ZoomStyle;
  isAuto?: boolean;
  disabled?: boolean;
  label?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sourceVideoBlobUrl?: string; // stored in IndexedDB as Blob, recreated as URL at runtime
  sourceVideoBlob?: Blob;
  duration: number; // base duration of source video
  videoSegments: VideoSegment[];
  clickAnimations: ClickAnimation[];
  annotations: TextAnnotation[];
  transitions: TransitionCard[];
  audioTracks: AudioTrack[];
  zoomEvents?: ZoomEvent[];
  autoZoomSettings?: AutoZoomSettings;
  settings: ProjectSettings;
  thumbnailUrl?: string;
}

export interface RecordedClickEvent {
  timestamp: number;
  x: number; // percentage
  y: number; // percentage
}

// Unified Graphics Creator & Social Video Reformatting Types
export type GraphicTemplateType = 'intro' | 'outro' | 'thumbnail' | 'social_square' | 'social_vertical';
export type CanvasAspectRatio = '16:9' | '1:1' | '9:16';
export type GraphicElementType = 'text' | 'image' | 'logo' | 'shape' | 'video_placeholder';
export type SocialPlatformId = 'youtube' | 'instagram' | 'tiktok' | 'shorts' | 'facebook' | 'linkedin' | 'twitter';

export interface GraphicElement {
  id: string;
  type: GraphicElementType;
  content?: string; // Text content or image/logo URL
  label?: string;   // Identifier e.g. "Header Headline", "CTA Button"
  x: number;       // Percentage (0-100)
  y: number;       // Percentage (0-100)
  width: number;   // Percentage (0-100)
  height: number;  // Percentage (0-100)
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  padding?: number;
  boxShadow?: string;
  textShadow?: string;
  strokeColor?: string;
  strokeWidth?: number;
  borderWidth?: number;
  borderColor?: string;
  letterSpacing?: number;
  lineHeight?: number;
  opacity?: number;
  objectFit?: 'contain' | 'cover';
  zIndex?: number;
}

export interface GraphicTemplate {
  id: string;
  name: string;
  type: GraphicTemplateType;
  aspectRatio: CanvasAspectRatio;
  width: number;
  height: number;
  background: {
    type: 'color' | 'gradient' | 'image';
    value: string;
    opacity?: number;
    overlayColor?: string;
    overlayOpacity?: number;
    brightness?: number;
    zoom?: number;
    offsetX?: number;
    offsetY?: number;
  };
  elements: GraphicElement[];
  isBuiltIn?: boolean;
  brandPresetId?: string;
  createdAt?: number;
}

