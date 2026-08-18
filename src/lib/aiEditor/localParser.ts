import { EditorCommand, EditorContext } from './types';

/**
 * Parses timestamp strings like:
 * - "01:02.02" -> 62.02
 * - "1:05.50" -> 65.5
 * - "00:15" -> 15
 * - "25s" or "25 seconds" -> 25
 * - "at 2 minutes" -> 120
 */
export function parseTimestamp(str: string): number | null {
  if (!str) return null;
  const clean = str.trim().toLowerCase();

  // Pattern: 01:02.02 or 01:02 or 1:05.5
  const mmssMatch = clean.match(/^(\d+):(\d+)(?:\.(\d+))?$/);
  if (mmssMatch) {
    const min = parseInt(mmssMatch[1], 10);
    const sec = parseInt(mmssMatch[2], 10);
    const msStr = mmssMatch[3] || '0';
    const ms = parseFloat(`0.${msStr}`);
    return min * 60 + sec + ms;
  }

  // Pattern: 1 min 5 sec or 1 minute 5 seconds
  const minSecWordMatch = clean.match(/(?:(\d+)\s*(?:min|minute|m))?\s*(?:(\d+(?:\.\d+)?)\s*(?:sec|second|s))?/);
  if (minSecWordMatch && (minSecWordMatch[1] || minSecWordMatch[2])) {
    const min = minSecWordMatch[1] ? parseFloat(minSecWordMatch[1]) : 0;
    const sec = minSecWordMatch[2] ? parseFloat(minSecWordMatch[2]) : 0;
    return min * 60 + sec;
  }

  // Pure number
  const num = parseFloat(clean);
  if (!isNaN(num)) return num;

  return null;
}

/**
 * Helper to extract time ranges like "from 01:02.02 to 01:06.40" or "0:00 - 0:05" or "first 5 seconds"
 */
function extractTimeRange(text: string, duration: number): { start: number; end: number } | null {
  const lower = text.toLowerCase();

  // Pattern: "first X seconds" or "first X s"
  const firstMatch = lower.match(/(?:first|beginning)\s+(\d+(?:\.\d+)?)\s*(?:seconds|sec|s)?/);
  if (firstMatch) {
    return { start: 0, end: parseFloat(firstMatch[1]) };
  }

  // Pattern: "last X seconds"
  const lastMatch = lower.match(/(?:last|end)\s+(\d+(?:\.\d+)?)\s*(?:seconds|sec|s)?/);
  if (lastMatch && duration > 0) {
    const len = parseFloat(lastMatch[1]);
    return { start: Math.max(0, duration - len), end: duration };
  }

  // Pattern: "from 01:02.02 to 01:06.40" or "0:10 to 0:20" or "0:10 - 0:20"
  const rangeMatch = text.match(/(?:from\s+)?(\d+(?::\d+)?(?:\.\d+)?(?:\s*s)?)\s*(?:to|-|until)\s*(\d+(?::\d+)?(?:\.\d+)?(?:\s*s)?)/i);
  if (rangeMatch) {
    const start = parseTimestamp(rangeMatch[1]);
    const end = parseTimestamp(rangeMatch[2]);
    if (start !== null && end !== null && end > start) {
      return { start, end };
    }
  }

  return null;
}

/**
 * Deterministic local parser that tries to understand simple explicit commands without AI.
 * Returns EditorCommand[] if deterministically matched, or null if LLM is required.
 */
export function tryLocalParse(prompt: string, context: EditorContext): EditorCommand[] | null {
  const text = prompt.trim();
  const lower = text.toLowerCase();

  // 1. Check for Trimming / Removal commands
  // Examples: "remove 0:10 to 0:20", "trim from 01:02.02 to 01:06.40", "delete first 5 seconds"
  if (
    lower.includes('trim') ||
    lower.includes('remove') ||
    lower.includes('cut') ||
    lower.includes('delete section') ||
    (lower.includes('delete') && (lower.includes('0:') || lower.includes('from') || lower.includes('first')))
  ) {
    const range = extractTimeRange(text, context.videoDuration);
    if (range) {
      return [{ action: 'remove_segment', start: range.start, end: range.end }];
    }
  }

  // 2. Check for Adding Text / Callout
  // Examples: "add text at 1:05.50 saying 'This is where you chat'", "add callout at 20s saying 'Click Settings'"
  if (
    lower.includes('add text') ||
    lower.includes('add callout') ||
    lower.includes('add annotation') ||
    lower.includes('add a text') ||
    lower.includes('add a callout')
  ) {
    // Extract quoted text or text after 'saying' or 'text'
    const quotedMatch = text.match(/(?:saying|text|with|reads?)\s+['"“](.+?)['"”]/i) || text.match(/['"“](.+?)['"”]/);
    const timeMatch = text.match(/(?:at|@|around)\s+(\d+(?::\d+)?(?:\.\d+)?(?:\s*s)?)/i);

    let foundTime = timeMatch ? parseTimestamp(timeMatch[1]) : null;
    if (foundTime === null) {
      foundTime = context.currentTime || 5.0;
    }

    let foundText = quotedMatch ? quotedMatch[1] : '';
    if (!foundText) {
      // Fallback extract after "saying "
      const sayingIdx = lower.indexOf('saying ');
      if (sayingIdx !== -1) {
        foundText = text.substring(sayingIdx + 7).trim();
      }
    }

    if (foundText) {
      return [
        {
          action: 'add_text',
          timestamp: foundTime,
          text: foundText,
          style: lower.includes('speech') ? 'speech' : lower.includes('floating') ? 'floating' : 'rounded',
          animation: lower.includes('fade') ? 'fade' : lower.includes('typewriter') ? 'typewriter' : 'pop',
          duration: 3.0,
          x: 50,
          y: 70,
          bgColor: lower.includes('sky') || lower.includes('blue') ? '#0284c7' : '#0284c7',
          textColor: '#ffffff',
        },
      ];
    }
  }

  // 3. Check for Adding Transition
  // Examples: "add transition at 45s with text 'Setting up API'", "add page transition at 1:10 saying 'Next section'"
  if (
    lower.includes('add transition') ||
    lower.includes('add page transition') ||
    lower.includes('add section transition') ||
    lower.includes('add title transition') ||
    lower.includes('full page transition') ||
    lower.includes('full-screen transition')
  ) {
    const quotedMatch = text.match(/(?:saying|text|title|with|reads?)\s+['"“](.+?)['"”]/i) || text.match(/['"“](.+?)['"”]/);
    const timeMatch = text.match(/(?:at|@|around)\s+(\d+(?::\d+)?(?:\.\d+)?(?:\s*s)?)/i);

    let foundTime = timeMatch ? parseTimestamp(timeMatch[1]) : null;
    if (foundTime === null) {
      foundTime = context.currentTime || 0;
    }

    let foundText = quotedMatch ? quotedMatch[1] : '';
    if (!foundText) {
      const sayingIdx = lower.indexOf('saying ');
      if (sayingIdx !== -1) {
        foundText = text.substring(sayingIdx + 7).trim();
      }
    }

    if (foundText) {
      return [
        {
          action: 'add_transition',
          timestamp: foundTime,
          text: foundText,
          style: lower.includes('gradient') ? 'gradient' : lower.includes('minimal') ? 'minimal' : 'saas',
          duration: 2.5,
          bgColor: lower.includes('sky') || lower.includes('blue') ? '#0284c7' : '#0f172a',
          textColor: '#38bdf8',
        },
      ];
    }
  }

  // 4. Check for Background Music / Audio
  // Examples: "add upbeat background music", "add ambient music track", "add lofi music"
  if (lower.includes('add audio') || lower.includes('add music') || lower.includes('add background music') || lower.includes('add track')) {
    let presetId = 'upbeat';
    let mood = 'upbeat';

    if (lower.includes('ambient') || lower.includes('calm') || lower.includes('gentle')) {
      presetId = 'ambient';
      mood = 'ambient';
    } else if (lower.includes('lofi') || lower.includes('lo-fi') || lower.includes('focus') || lower.includes('chill')) {
      presetId = 'lofi';
      mood = 'lofi';
    }

    return [
      {
        action: 'add_audio',
        presetId,
        mood,
        volume: 0.2,
      },
    ];
  }

  // 5. Check for Cursor Click Animation
  // Examples: "add click at 10s", "add click animation at 1:05"
  if (lower.includes('add click') || lower.includes('add cursor click')) {
    const timeMatch = text.match(/(?:at|@|around)\s+(\d+(?::\d+)?(?:\.\d+)?(?:\s*s)?)/i);
    const time = timeMatch ? parseTimestamp(timeMatch[1]) : context.currentTime || 10;
    if (time !== null) {
      return [
        {
          action: 'add_click_animation',
          timestamp: time,
          x: 50,
          y: 50,
          style: 'ripple',
          color: '#38bdf8',
        },
      ];
    }
  }

  // 6. Check for Delete / Remove Element
  // Examples: "delete callout at 20s", "remove music", "delete audio track"
  if (lower.includes('remove music') || lower.includes('delete audio') || lower.includes('remove audio')) {
    return [{ action: 'delete_element', elementType: 'audio' }];
  }

  // If local parser cannot confidently handle the complex/ambiguous request, return null to delegate to LLM
  return null;
}
