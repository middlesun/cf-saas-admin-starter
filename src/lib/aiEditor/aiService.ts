import { EditorCommand, EditorContext, AiUsageMetrics } from './types';
import { tryLocalParse } from './localParser';

export class AiEditorService {
  private metrics: AiUsageMetrics = {
    totalRequests: 0,
    localParses: 0,
    aiParses: 0,
    estimatedTokens: 0,
  };

  public getMetrics(): AiUsageMetrics {
    return { ...this.metrics };
  }

  /**
   * Main entry point to interpret a natural language editing instruction.
   * Prefers local deterministic parsing to save API tokens and reduce latency.
   */
  public async interpretInstruction(
    prompt: string,
    context: EditorContext
  ): Promise<{ commands: EditorCommand[]; parsedBy: 'local' | 'ai'; tokenEstimate: number }> {
    this.metrics.totalRequests++;

    // Step 1: Try Local Parser (0 cost, instant)
    const localCommands = tryLocalParse(prompt, context);
    if (localCommands && localCommands.length > 0) {
      this.metrics.localParses++;
      console.log('⚡ Local Intent Parser successfully matched command:', localCommands);
      return {
        commands: localCommands,
        parsedBy: 'local',
        tokenEstimate: 0,
      };
    }

    // Step 2: Fallback to Server Gemini API Call
    this.metrics.aiParses++;
    try {
      const response = await fetch('/api/ai-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      const data = await response.json();
      const commands: EditorCommand[] = data.commands || [];
      const tokenEstimate = data.tokenEstimate || Math.ceil(prompt.length / 4);

      this.metrics.estimatedTokens += tokenEstimate;

      console.log('✨ AI Gemini Interpreter returned commands:', commands, `(Est. Tokens: ${tokenEstimate})`);

      return {
        commands,
        parsedBy: 'ai',
        tokenEstimate,
      };
    } catch (error: any) {
      console.error('AI Service Error:', error);
      throw new Error(error?.message || 'Failed to interpret instruction with AI.');
    }
  }
}

export const aiEditorService = new AiEditorService();
