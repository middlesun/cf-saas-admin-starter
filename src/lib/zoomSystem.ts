import { ZoomEvent, AutoZoomSettings, ClickAnimation, ZoomStyle } from '../types';

export const DEFAULT_AUTO_ZOOM_SETTINGS: AutoZoomSettings = {
  enabled: true,
  defaultZoomLevel: 1.5,
  zoomDuration: 'normal',
  customDuration: 2.5,
  zoomStyle: 'smooth',
  zoomBackOut: 'delay',
  holdDuration: 1.5,
};

/**
 * Ensures focus point (x, y in percent) doesn't zoom outside video frame boundaries
 */
export function clampFocusPoint(xPercent: number, yPercent: number, zoomLevel: number): { x: number; y: number } {
  if (zoomLevel <= 1.0) return { x: 50, y: 50 };

  // Half-width and half-height visible fraction when zoomed
  const halfVisibleWidthPercent = (50 / zoomLevel);
  const halfVisibleHeightPercent = (50 / zoomLevel);

  const minX = halfVisibleWidthPercent;
  const maxX = 100 - halfVisibleWidthPercent;
  const minY = halfVisibleHeightPercent;
  const maxY = 100 - halfVisibleHeightPercent;

  const clampedX = Math.max(minX, Math.min(maxX, xPercent));
  const clampedY = Math.max(minY, Math.min(maxY, yPercent));

  return { x: Math.round(clampedX * 10) / 10, y: Math.round(clampedY * 10) / 10 };
}

/**
 * Helper to get zoom-in/out speed duration in seconds based on duration setting or custom speed
 */
export function getSpeedFromSettings(settings: AutoZoomSettings): { totalDuration: number; zoomInSpeed: number; zoomOutSpeed: number } {
  let zoomInSpeed = 0.5;
  let zoomOutSpeed = 0.5;
  let totalDuration = 2.5;

  if (settings.zoomDuration === 'fast') {
    zoomInSpeed = 0.3;
    zoomOutSpeed = 0.3;
    totalDuration = 1.8;
  } else if (settings.zoomDuration === 'normal') {
    zoomInSpeed = 0.5;
    zoomOutSpeed = 0.5;
    totalDuration = 2.5;
  } else if (settings.zoomDuration === 'slow') {
    zoomInSpeed = 0.8;
    zoomOutSpeed = 0.8;
    totalDuration = 3.5;
  } else if (settings.zoomDuration === 'custom' && settings.customDuration) {
    totalDuration = settings.customDuration;
    zoomInSpeed = Math.min(0.6, totalDuration * 0.25);
    zoomOutSpeed = Math.min(0.6, totalDuration * 0.25);
  }

  if (settings.zoomBackOut === 'immediate') {
    totalDuration = zoomInSpeed + zoomOutSpeed + 0.5;
  } else if (settings.zoomBackOut === 'delay') {
    totalDuration = zoomInSpeed + zoomOutSpeed + (settings.holdDuration || 1.5);
  } else if (settings.zoomBackOut === 'keep') {
    totalDuration = 5.0; // long hold
  }

  return { totalDuration, zoomInSpeed, zoomOutSpeed };
}

/**
 * Intelligent Automatic Zoom Generator
 * Analyzes click/interaction events, filters noise/rapid clicks,
 * groups nearby interactions, and creates smooth, intentional zooms.
 */
export function generateAutoZooms(
  clickAnimations: ClickAnimation[],
  settings: AutoZoomSettings = DEFAULT_AUTO_ZOOM_SETTINGS,
  projectDuration: number = 30
): ZoomEvent[] {
  if (!settings.enabled || !clickAnimations || clickAnimations.length === 0) {
    return [];
  }

  // Sort interaction clicks chronologically
  const sortedClicks = [...clickAnimations].sort((a, b) => a.timestamp - b.timestamp);
  const { totalDuration, zoomInSpeed, zoomOutSpeed } = getSpeedFromSettings(settings);

  // Group clicks that occur close together (< 2.5 seconds apart)
  const clickGroups: ClickAnimation[][] = [];
  let currentGroup: ClickAnimation[] = [];

  for (const click of sortedClicks) {
    if (currentGroup.length === 0) {
      currentGroup.push(click);
    } else {
      const lastClick = currentGroup[currentGroup.length - 1];
      if (click.timestamp - lastClick.timestamp <= 2.5) {
        // Group together
        currentGroup.push(click);
      } else {
        clickGroups.push(currentGroup);
        currentGroup = [click];
      }
    }
  }
  if (currentGroup.length > 0) {
    clickGroups.push(currentGroup);
  }

  const generatedZooms: ZoomEvent[] = [];

  clickGroups.forEach((group, index) => {
    const firstClick = group[0];
    const lastClick = group[group.length - 1];

    // Compute weighted average focal point for group
    let avgX = 0;
    let avgY = 0;
    group.forEach((c) => {
      avgX += c.x;
      avgY += c.y;
    });
    avgX /= group.length;
    avgY /= group.length;

    // Start zoom slightly before interaction (0.2s before first click)
    const startTime = Math.max(0, firstClick.timestamp - 0.2);
    const interactionSpan = lastClick.timestamp - firstClick.timestamp;
    const groupDuration = Math.min(
      projectDuration - startTime,
      Math.max(totalDuration, interactionSpan + zoomInSpeed + zoomOutSpeed + 1.0)
    );

    const zoomLevel = settings.defaultZoomLevel || 1.5;
    const clampedFocus = clampFocusPoint(avgX, avgY, zoomLevel);

    generatedZooms.push({
      id: `zoom_auto_${index}_${Date.now()}`,
      timestamp: Math.round(startTime * 10) / 10,
      duration: Math.round(groupDuration * 10) / 10,
      zoomInSpeed,
      zoomOutSpeed,
      zoomLevel,
      x: clampedFocus.x,
      y: clampedFocus.y,
      style: settings.zoomStyle || 'smooth',
      isAuto: true,
      disabled: false,
      label: `Auto Zoom (${group.length} click${group.length > 1 ? 's' : ''})`,
    });
  });

  return generatedZooms;
}

/**
 * Easing Functions
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

function easeCinematic(t: number): number {
  return t * t * (3 - 2 * t);
}

function easeSubtle(t: number): number {
  return t; // linear soft
}

export function getEasingValue(t: number, style: ZoomStyle): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (style) {
    case 'ease':
      return easeOutQuad(clamped);
    case 'cinematic':
      return easeCinematic(clamped);
    case 'subtle':
      return easeSubtle(clamped);
    case 'smooth':
    default:
      return easeInOutCubic(clamped);
  }
}

/**
 * Calculates current zoom scale and focal center (x, y) at time `t`
 */
export function calculateZoomTransformAtTime(
  zoomEvents: ZoomEvent[],
  currentTime: number
): { scale: number; x: number; y: number; activeZoom: ZoomEvent | null } {
  const activeZooms = zoomEvents.filter(
    (z) => !z.disabled && currentTime >= z.timestamp && currentTime <= z.timestamp + z.duration
  );

  if (activeZooms.length === 0) {
    // Check if there is a 'keep' zoom prior to currentTime
    const pastKeepZoom = [...zoomEvents]
      .filter((z) => !z.disabled && z.timestamp + z.duration < currentTime)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    // If past keep zoom exists and no new zoom active, maintain zoom
    if (pastKeepZoom && pastKeepZoom.label?.includes('keep')) {
      const clamped = clampFocusPoint(pastKeepZoom.x, pastKeepZoom.y, pastKeepZoom.zoomLevel);
      return { scale: pastKeepZoom.zoomLevel, x: clamped.x, y: clamped.y, activeZoom: pastKeepZoom };
    }

    return { scale: 1.0, x: 50, y: 50, activeZoom: null };
  }

  // Use the most relevant active zoom
  const zoom = activeZooms[activeZooms.length - 1];
  const elapsed = currentTime - zoom.timestamp;
  const inSpeed = zoom.zoomInSpeed || 0.5;
  const outSpeed = zoom.zoomOutSpeed || 0.5;
  const targetScale = zoom.zoomLevel || 1.5;

  let progressScale = 1.0;
  let progressFocalX = 50;
  let progressFocalY = 50;

  if (elapsed <= inSpeed) {
    // Zoom-in phase
    const rawProgress = elapsed / inSpeed;
    const eased = getEasingValue(rawProgress, zoom.style);
    progressScale = 1 + (targetScale - 1) * eased;
    progressFocalX = 50 + (zoom.x - 50) * eased;
    progressFocalY = 50 + (zoom.y - 50) * eased;
  } else if (elapsed > inSpeed && elapsed <= zoom.duration - outSpeed) {
    // Hold phase
    progressScale = targetScale;
    progressFocalX = zoom.x;
    progressFocalY = zoom.y;
  } else {
    // Zoom-out phase
    const outElapsed = elapsed - (zoom.duration - outSpeed);
    const rawProgress = 1 - outElapsed / outSpeed;
    const eased = getEasingValue(rawProgress, zoom.style);

    progressScale = 1 + (targetScale - 1) * eased;
    progressFocalX = 50 + (zoom.x - 50) * eased;
    progressFocalY = 50 + (zoom.y - 50) * eased;
  }

  const clamped = clampFocusPoint(progressFocalX, progressFocalY, progressScale);

  return {
    scale: progressScale,
    x: clamped.x,
    y: clamped.y,
    activeZoom: zoom,
  };
}
