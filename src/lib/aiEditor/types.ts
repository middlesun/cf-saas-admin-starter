import { AnnotationStyle, AnnotationAnimation, TransitionStyle, ClickStyle } from '../../types';

export type EditorCommandAction =
  | 'remove_segment'
  | 'add_text'
  | 'add_callout'
  | 'add_transition'
  | 'add_audio'
  | 'add_click_animation'
  | 'delete_element'
  | 'update_element';

export interface BaseCommand {
  action: EditorCommandAction;
}

export interface RemoveSegmentCommand extends BaseCommand {
  action: 'remove_segment';
  start: number; // in seconds
  end: number;   // in seconds
}

export interface AddTextCommand extends BaseCommand {
  action: 'add_text' | 'add_callout';
  timestamp: number; // seconds
  text: string;
  style?: AnnotationStyle;
  animation?: AnnotationAnimation;
  duration?: number;
  x?: number; // 0-100 percentage
  y?: number; // 0-100 percentage
  textColor?: string;
  bgColor?: string;
}

export interface AddTransitionCommand extends BaseCommand {
  action: 'add_transition';
  timestamp: number; // seconds
  text: string;
  subtitle?: string;
  style?: TransitionStyle;
  duration?: number;
  bgColor?: string;
  textColor?: string;
}

export interface AddAudioCommand extends BaseCommand {
  action: 'add_audio';
  presetId?: string; // 'upbeat' | 'ambient' | 'lofi'
  mood?: string;
  volume?: number;
}

export interface AddClickAnimationCommand extends BaseCommand {
  action: 'add_click_animation';
  timestamp: number;
  x?: number;
  y?: number;
  style?: ClickStyle;
  color?: string;
}

export interface DeleteElementCommand extends BaseCommand {
  action: 'delete_element';
  elementType: 'annotation' | 'transition' | 'audio' | 'click';
  elementId?: string;
  timestamp?: number;
}

export interface UpdateElementCommand extends BaseCommand {
  action: 'update_element';
  elementType: 'annotation' | 'transition' | 'audio' | 'click';
  elementId?: string;
  changes: Record<string, any>;
}

export type EditorCommand =
  | RemoveSegmentCommand
  | AddTextCommand
  | AddTransitionCommand
  | AddAudioCommand
  | AddClickAnimationCommand
  | DeleteElementCommand
  | UpdateElementCommand;

export interface EditorContext {
  videoDuration: number;
  currentTime: number;
  existingAnnotations: Array<{ id: string; timestamp: number; text: string }>;
  existingTransitions: Array<{ id: string; timestamp: number; title: string }>;
  hasAudioTrack: boolean;
  lastEditedElementId?: string;
}

export interface ExecutionResult {
  success: boolean;
  summaries: string[];
  commandCount: number;
  error?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: number;
  parsedBy?: 'local' | 'ai';
  executionResult?: ExecutionResult;
  commands?: EditorCommand[];
}

export interface AiUsageMetrics {
  totalRequests: number;
  localParses: number;
  aiParses: number;
  estimatedTokens: number;
}
