import { Project } from '../types';
import { saveProject } from './db';

export interface ProjectFilePackage {
  version: '1.0';
  format: 'saas-demo-creator-project';
  exportedAt: number;
  project: Omit<Project, 'sourceVideoBlob' | 'sourceVideoBlobUrl'>;
  sourceVideoData?: string; // base64 Data URL of source video
  sourceVideoMime?: string;
  sourceVideoSize?: number;
}

/**
 * Converts a Blob to a base64 Data URL with progress feedback
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts a base64 Data URL back to a binary Blob
 */
export async function dataUrlToBlob(dataUrl: string, fallbackMime = 'video/webm'): Promise<Blob> {
  try {
    const res = await fetch(dataUrl);
    return await res.blob();
  } catch {
    // Fallback manual parser if fetch Data URL is restricted
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
    const byteString = atob(parts[1] || parts[0]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ia], { type: mime });
  }
}

/**
 * Packages an editable Project into a portable .demoproj file and triggers download
 */
export async function exportProjectPackage(
  project: Project,
  onProgress?: (percentage: number, status: string) => void
): Promise<Blob> {
  onProgress?.(10, 'Gathering project metadata, timeline & annotations...');

  // Clone project data without internal blob URLs
  const projectMeta: Omit<Project, 'sourceVideoBlob' | 'sourceVideoBlobUrl'> = {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt || Date.now(),
    updatedAt: Date.now(),
    duration: project.duration || 10,
    videoSegments: project.videoSegments || [],
    clickAnimations: project.clickAnimations || [],
    annotations: project.annotations || [],
    transitions: project.transitions || [],
    audioTracks: project.audioTracks || [],
    zoomEvents: project.zoomEvents || [],
    autoZoomSettings: project.autoZoomSettings,
    settings: project.settings || { width: 1920, height: 1080, fps: 30 },
    thumbnailUrl: project.thumbnailUrl,
  };

  let sourceVideoData: string | undefined;
  let sourceVideoMime: string | undefined;
  let sourceVideoSize: number | undefined;

  // Retrieve source video blob
  let videoBlob = project.sourceVideoBlob;
  if (!videoBlob && project.sourceVideoBlobUrl) {
    try {
      onProgress?.(25, 'Fetching source video stream...');
      const response = await fetch(project.sourceVideoBlobUrl);
      videoBlob = await response.blob();
    } catch (e) {
      console.warn('Could not fetch source video blob for project package:', e);
    }
  }

  if (videoBlob && videoBlob.size > 0) {
    onProgress?.(45, 'Encoding source recording data into project package...');
    sourceVideoMime = videoBlob.type || 'video/webm';
    sourceVideoSize = videoBlob.size;
    sourceVideoData = await blobToDataUrl(videoBlob);
  }

  onProgress?.(85, 'Building self-contained .demoproj file...');

  const packageData: ProjectFilePackage = {
    version: '1.0',
    format: 'saas-demo-creator-project',
    exportedAt: Date.now(),
    project: projectMeta,
    sourceVideoData,
    sourceVideoMime,
    sourceVideoSize,
  };

  const jsonString = JSON.stringify(packageData);
  const projectBlob = new Blob([jsonString], { type: 'application/json' });

  onProgress?.(100, 'Project file ready for download!');
  return projectBlob;
}

/**
 * Downloads a project package file with .demoproj extension
 */
export async function downloadProjectFile(
  project: Project,
  onProgress?: (percentage: number, status: string) => void
): Promise<void> {
  const blob = await exportProjectPackage(project, onProgress);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = project.name.replace(/[^a-z0-9_-]/gi, '_') || 'demo_project';
  a.download = `${safeName}.demoproj`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Imports a .demoproj or .json project package file and restores full project state
 */
export async function importProjectPackage(
  file: File,
  onProgress?: (percentage: number, status: string) => void
): Promise<Project> {
  onProgress?.(15, 'Reading project file...');
  const text = await file.text();

  onProgress?.(35, 'Parsing project metadata and timeline structure...');
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error('Invalid project file format: not valid JSON.');
  }

  // Handle both packaged format and raw project metadata JSON
  let projectMeta: any = parsed.project || parsed;
  if (!projectMeta || typeof projectMeta !== 'object') {
    throw new Error('Unrecognized project file: missing project definitions.');
  }

  const newId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  let sourceVideoBlob: Blob | undefined;
  let sourceVideoBlobUrl: string | undefined;

  // Restore source video if embedded
  if (parsed.sourceVideoData) {
    onProgress?.(60, 'Reconstructing source video recording...');
    try {
      sourceVideoBlob = await dataUrlToBlob(parsed.sourceVideoData, parsed.sourceVideoMime || 'video/webm');
      sourceVideoBlobUrl = URL.createObjectURL(sourceVideoBlob);
    } catch (e) {
      console.warn('Failed to restore source video from package:', e);
    }
  }

  onProgress?.(85, 'Restoring timeline, zoom events & annotations...');

  const restoredProject: Project = {
    id: newId,
    name: projectMeta.name || file.name.replace(/\.[^/.]+$/, ''),
    createdAt: projectMeta.createdAt || Date.now(),
    updatedAt: Date.now(),
    duration: Number(projectMeta.duration) || 10,
    videoSegments: Array.isArray(projectMeta.videoSegments) ? projectMeta.videoSegments : [],
    clickAnimations: Array.isArray(projectMeta.clickAnimations) ? projectMeta.clickAnimations : [],
    annotations: Array.isArray(projectMeta.annotations) ? projectMeta.annotations : [],
    transitions: Array.isArray(projectMeta.transitions) ? projectMeta.transitions : [],
    audioTracks: Array.isArray(projectMeta.audioTracks) ? projectMeta.audioTracks : [],
    zoomEvents: Array.isArray(projectMeta.zoomEvents) ? projectMeta.zoomEvents : [],
    autoZoomSettings: projectMeta.autoZoomSettings,
    settings: projectMeta.settings || { width: 1920, height: 1080, fps: 30 },
    thumbnailUrl: projectMeta.thumbnailUrl,
    sourceVideoBlob,
    sourceVideoBlobUrl,
  };

  // Ensure default video segment if empty
  if (restoredProject.videoSegments.length === 0) {
    restoredProject.videoSegments = [
      {
        id: 'seg_default',
        startTime: 0,
        endTime: restoredProject.duration,
        speed: 1.0,
      },
    ];
  }

  // Persist into IndexedDB and in-memory cache
  await saveProject(restoredProject);
  onProgress?.(100, 'Project imported successfully!');

  return restoredProject;
}
