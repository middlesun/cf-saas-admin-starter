import { Project, TextAnnotation, TransitionCard, ClickAnimation, AudioTrack, VideoSegment } from '../../types';
import { EditorCommand, ExecutionResult } from './types';
import { generateSynthesizedAudio } from '../audioSynth';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 10);
  const mStr = String(m).padStart(2, '0');
  const sStr = String(s).padStart(2, '0');
  return ms > 0 ? `${mStr}:${sStr}.${ms}` : `${mStr}:${sStr}`;
}

export async function executeEditorCommands(
  commands: EditorCommand[],
  currentProject: Project
): Promise<{ updatedProject: Project; result: ExecutionResult }> {
  let project: Project = JSON.parse(JSON.stringify(currentProject));
  const summaries: string[] = [];

  for (const cmd of commands) {
    try {
      switch (cmd.action) {
        case 'remove_segment': {
          const start = Math.max(0, cmd.start || 0);
          const end = Math.min(project.duration || 300, cmd.end || start + 5);

          if (end <= start) break;

          // Perform video segment trim/split on primary segment
          const activeSegment = project.videoSegments[0];
          if (activeSegment) {
            if (start <= activeSegment.startTime && end >= activeSegment.endTime) {
              // Ignore invalid removal of entire video
            } else if (start <= activeSegment.startTime) {
              activeSegment.startTime = Math.min(activeSegment.endTime - 0.5, end);
            } else if (end >= activeSegment.endTime) {
              activeSegment.endTime = Math.max(activeSegment.startTime + 0.5, start);
            } else {
              // Split segment into two
              const seg1: VideoSegment = {
                ...activeSegment,
                id: activeSegment.id + '_a',
                endTime: start,
              };
              const seg2: VideoSegment = {
                ...activeSegment,
                id: activeSegment.id + '_b',
                startTime: end,
              };
              project.videoSegments = [seg1, seg2, ...project.videoSegments.slice(1)];
            }
          }

          summaries.push(`✓ Removed ${formatTime(start)}–${formatTime(end)}`);
          break;
        }

        case 'add_text':
        case 'add_callout': {
          const timestamp = Math.max(0, cmd.timestamp || 0);
          const newAnn: TextAnnotation = {
            id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            text: cmd.text || 'Sample Text',
            style: cmd.style || 'rounded',
            animation: cmd.animation || 'pop',
            startTime: timestamp,
            duration: cmd.duration || 3.0,
            x: cmd.x ?? 50,
            y: cmd.y ?? 70,
            fontSize: 20,
            textColor: cmd.textColor || '#ffffff',
            bgColor: cmd.bgColor || '#0284c7',
            opacity: 0.95,
            borderRadius: 12,
            padding: 12,
            shadow: true,
          };

          project.annotations.push(newAnn);
          summaries.push(`✓ Added callout at ${formatTime(timestamp)}: "${newAnn.text}"`);
          break;
        }

        case 'add_transition': {
          const timestamp = Math.max(0, cmd.timestamp || 0);
          const newTr: TransitionCard = {
            id: 'tr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            title: cmd.text || 'Section Title',
            subtitle: cmd.subtitle,
            style: cmd.style || 'saas',
            timestamp,
            duration: cmd.duration || 2.5,
            bgColor: cmd.bgColor || '#0f172a',
            textColor: cmd.textColor || '#38bdf8',
            fontSize: 32,
            alignment: 'center',
          };

          project.transitions.push(newTr);
          summaries.push(`✓ Added transition at ${formatTime(timestamp)}: "${newTr.title}"`);
          break;
        }

        case 'add_audio': {
          const presetId = cmd.presetId || (cmd.mood === 'ambient' ? 'ambient' : cmd.mood === 'lofi' ? 'lofi' : 'upbeat');
          const duration = project.duration || 60;
          const { url } = await generateSynthesizedAudio(presetId, duration);

          const newTrack: AudioTrack = {
            id: 'audio_' + Date.now(),
            name: presetId === 'ambient' ? 'Gentle Tech Ambient' : presetId === 'lofi' ? 'Lo-Fi Focus' : 'Upbeat SaaS Vibe',
            audioBlobUrl: url,
            presetId,
            volume: cmd.volume ?? 0.2,
            fadeIn: true,
            fadeOut: true,
            loop: true,
            startTime: 0,
            duration,
          };

          project.audioTracks = [newTrack];
          summaries.push(`✓ Added ${newTrack.name} audio track`);
          break;
        }

        case 'add_click_animation': {
          const timestamp = Math.max(0, cmd.timestamp || 0);
          const newClick: ClickAnimation = {
            id: 'click_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            timestamp,
            x: cmd.x ?? 50,
            y: cmd.y ?? 50,
            style: cmd.style || 'ripple',
            size: 40,
            duration: 0.6,
            color: cmd.color || '#38bdf8',
            playSound: true,
          };

          project.clickAnimations.push(newClick);
          summaries.push(`✓ Added click animation at ${formatTime(timestamp)}`);
          break;
        }

        case 'delete_element': {
          if (cmd.elementType === 'annotation') {
            if (cmd.elementId) {
              project.annotations = project.annotations.filter((a) => a.id !== cmd.elementId);
              summaries.push(`✓ Deleted callout`);
            } else if (cmd.timestamp !== undefined) {
              // Delete closest annotation to timestamp
              const closest = project.annotations.reduce((prev, curr) =>
                Math.abs(curr.startTime - cmd.timestamp!) < Math.abs(prev.startTime - cmd.timestamp!) ? curr : prev
              , project.annotations[0]);
              if (closest) {
                project.annotations = project.annotations.filter((a) => a.id !== closest.id);
                summaries.push(`✓ Deleted callout at ${formatTime(closest.startTime)}`);
              }
            } else if (project.annotations.length > 0) {
              const deleted = project.annotations.pop();
              summaries.push(`✓ Deleted callout: "${deleted?.text}"`);
            }
          } else if (cmd.elementType === 'transition') {
            if (cmd.elementId) {
              project.transitions = project.transitions.filter((t) => t.id !== cmd.elementId);
              summaries.push(`✓ Deleted transition`);
            } else if (project.transitions.length > 0) {
              const deleted = project.transitions.pop();
              summaries.push(`✓ Deleted transition: "${deleted?.title}"`);
            }
          } else if (cmd.elementType === 'audio') {
            project.audioTracks = [];
            summaries.push(`✓ Removed audio track`);
          } else if (cmd.elementType === 'click') {
            if (project.clickAnimations.length > 0) {
              project.clickAnimations.pop();
              summaries.push(`✓ Deleted click animation`);
            }
          }
          break;
        }

        case 'update_element': {
          if (cmd.elementType === 'annotation' && project.annotations.length > 0) {
            const targetId = cmd.elementId || project.annotations[project.annotations.length - 1].id;
            project.annotations = project.annotations.map((ann) => {
              if (ann.id === targetId) {
                return { ...ann, ...cmd.changes };
              }
              return ann;
            });
            summaries.push(`✓ Updated callout properties`);
          } else if (cmd.elementType === 'transition' && project.transitions.length > 0) {
            const targetId = cmd.elementId || project.transitions[project.transitions.length - 1].id;
            project.transitions = project.transitions.map((tr) => {
              if (tr.id === targetId) {
                return { ...tr, ...cmd.changes };
              }
              return tr;
            });
            summaries.push(`✓ Updated transition card properties`);
          }
          break;
        }
      }
    } catch (e) {
      console.error('Error executing command:', cmd, e);
    }
  }

  project.updatedAt = Date.now();

  return {
    updatedProject: project,
    result: {
      success: summaries.length > 0,
      summaries: summaries.length > 0 ? summaries : ['✓ Command executed'],
      commandCount: commands.length,
    },
  };
}
