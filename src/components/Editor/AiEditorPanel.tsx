import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Undo2, CheckCircle2, Loader2, User, ChevronDown, Clock, ZoomIn, Film, MessageSquareText, Wand2, Check } from 'lucide-react';
import { ChatMessage, EditorContext } from '../../lib/aiEditor/types';
import { aiEditorService } from '../../lib/aiEditor/aiService';
import { executeEditorCommands } from '../../lib/aiEditor/commandExecutor';
import { Project } from '../../types';

interface AiEditorPanelProps {
  project: Project;
  currentTime: number;
  onUpdateProject: (updated: Project) => void;
  onUndo: () => void;
  canUndo: boolean;
  onSeek?: (time: number) => void;
}

export const AiEditorPanel: React.FC<AiEditorPanelProps> = ({
  project,
  currentTime,
  onUpdateProject,
  onUndo,
  canUndo,
  onSeek,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hi! I can help you edit your video.\nTell me what you want to change.',
      timestamp: Date.now(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || inputPrompt).trim();
    if (!promptText || isProcessing) return;

    const userMsgId = 'msg_' + Date.now();
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: promptText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputPrompt('');
    setIsProcessing(true);

    const context: EditorContext = {
      videoDuration: project.duration || 60,
      currentTime,
      existingAnnotations: project.annotations.map((a) => ({ id: a.id, timestamp: a.startTime, text: a.text })),
      existingTransitions: project.transitions.map((t) => ({ id: t.id, timestamp: t.timestamp, title: t.title })),
      hasAudioTrack: project.audioTracks.length > 0,
    };

    try {
      const { commands, parsedBy } = await aiEditorService.interpretInstruction(promptText, context);

      if (!commands || commands.length === 0) {
        const noCmdMsg: ChatMessage = {
          id: 'ai_' + Date.now(),
          sender: 'ai',
          text: 'I could not recognize a specific editing action. Try asking to trim, add text, add a transition, or add background music.',
          timestamp: Date.now(),
          parsedBy,
        };
        setMessages((prev) => [...prev, noCmdMsg]);
      } else {
        const { updatedProject, result } = await executeEditorCommands(commands, project);
        onUpdateProject(updatedProject);

        if (onSeek) {
          const cmdWithTime = commands.find((cmd) => 'timestamp' in cmd && typeof (cmd as any).timestamp === 'number');
          if (cmdWithTime) {
            onSeek((cmdWithTime as any).timestamp);
          }
        }

        const aiMsg: ChatMessage = {
          id: 'ai_' + Date.now(),
          sender: 'ai',
          text: result.summaries.join('\n'),
          timestamp: Date.now(),
          parsedBy,
          executionResult: result,
          commands,
        };

        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'ai_err_' + Date.now(),
        sender: 'ai',
        text: `Unable to process instruction: ${err?.message || 'Error occurred'}.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const examplePrompts = [
    { text: 'Remove the first 5 seconds', icon: Clock },
    { text: 'Add zoom in on key clicks', icon: ZoomIn },
    { text: 'Add intro before the video', icon: Film },
    { text: 'Add subtitle: "Built for teams"', icon: MessageSquareText },
    { text: 'Make it more engaging', icon: Wand2 },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0d1322] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl select-none">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-[#090d18] border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 leading-none">
              AI Editor Assistant
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Your creative editing copilot</p>
          </div>
        </div>

        {/* Deterministic Badge */}
        <button className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-medium text-sky-400 flex items-center gap-1 hover:border-slate-700 transition-all">
          <span className="text-[9px] text-sky-400 font-bold">✦ Deterministic</span>
          <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-6 h-6 rounded-md bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3" />
              </div>
            )}

            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-sky-500 text-white font-medium rounded-br-xs shadow-md shadow-sky-500/10'
                  : 'bg-[#131b2e] border border-slate-800/80 text-slate-200 rounded-bl-xs'
              }`}
            >
              <div className="whitespace-pre-wrap font-medium">{msg.text}</div>

              {msg.executionResult && msg.executionResult.success && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Applied to Timeline
                  </span>
                  {canUndo && (
                    <button
                      onClick={onUndo}
                      className="text-slate-400 hover:text-white flex items-center gap-0.5 hover:underline transition-all"
                    >
                      <Undo2 className="w-3 h-3" />
                      Undo
                    </button>
                  )}
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                <User className="w-3 h-3" />
              </div>
            )}
          </div>
        ))}

        {/* Try these examples list directly below initial message if only 1 msg */}
        {messages.length <= 1 && (
          <div className="pt-2 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400">Try these examples</div>
            <div className="space-y-1.5">
              {examplePrompts.map((item, idx) => {
                const IconComp = item.icon;
                return (
                  <button
                    key={idx}
                    disabled={isProcessing}
                    onClick={() => handleSendMessage(item.text)}
                    className="w-full text-left px-3 py-2 rounded-xl bg-[#121929] hover:bg-[#1a2338] border border-slate-800/80 hover:border-sky-500/40 text-xs text-slate-300 font-medium flex items-center gap-2.5 transition-all group"
                  >
                    <IconComp className="w-3.5 h-3.5 text-sky-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">{item.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex gap-2 items-center text-xs text-sky-400 font-medium bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/20 w-fit">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
            <span>Executing edit...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Area */}
      <div className="p-3 bg-[#090d18] border-t border-slate-800/80 space-y-2 shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Describe your edit..."
            disabled={isProcessing}
            className="w-full bg-[#0d1322] border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 disabled:opacity-50"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputPrompt.trim() || isProcessing}
            className="absolute right-1.5 p-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white transition-all disabled:opacity-30 disabled:hover:bg-sky-500 flex items-center justify-center shadow-md shadow-sky-500/20"
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Local Parser Status Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0d1322] border border-slate-800/60 text-[10px] text-slate-400 font-medium">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="text-xs">⚡</span> Instant Local Parser
          </span>
          <span className="text-slate-500">•</span>
          <span className="truncate">Edits are applied locally. No credits used.</span>
          <div className="ml-auto w-3.5 h-3.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Check className="w-2.5 h-2.5 text-emerald-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

