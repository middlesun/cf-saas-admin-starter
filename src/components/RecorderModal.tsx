import React, { useState, useEffect, useRef } from 'react';
import { Project, RecordedClickEvent } from '../types';
import { Video, Pause, Play, Square, Circle, AlertCircle, Laptop, MousePointerClick, X, Crop, Move, Maximize2, Check, RotateCcw, Volume2, VolumeX, Eye, ZoomIn } from 'lucide-react';
import { generateAutoZooms, DEFAULT_AUTO_ZOOM_SETTINGS } from '../lib/zoomSystem';

interface RecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinishRecording: (project: Project) => void;
}

export const RecorderModal: React.FC<RecorderModalProps> = ({
  isOpen,
  onClose,
  onFinishRecording,
}) => {
  const [recordMode, setRecordMode] = useState<'screen' | 'area' | 'simulated'>('screen');
  const [recordingState, setRecordingState] = useState<'idle' | 'countdown' | 'recording' | 'paused'>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [recordedClicks, setRecordedClicks] = useState<RecordedClickEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-recording options state (Audio, Click tracking, Auto Zoom)
  const [enableAudio, setEnableAudio] = useState<boolean>(true);
  const [enableClickTracking, setEnableClickTracking] = useState<boolean>(true);
  const [enableAutoZoom, setEnableAutoZoom] = useState<boolean>(true);

  // Area Selection Frame state
  const [isSelectingArea, setIsSelectingArea] = useState<boolean>(false);
  const [cropArea, setCropArea] = useState<{ x: number; y: number; width: number; height: number }>(() => {
    const w = Math.min(1280, Math.max(320, window.innerWidth - 120));
    const h = Math.min(720, Math.max(240, window.innerHeight - 180));
    return {
      x: Math.max(20, Math.floor((window.innerWidth - w) / 2)),
      y: Math.max(20, Math.floor((window.innerHeight - h) / 2)),
      width: w,
      height: h,
    };
  });
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; areaX: number; areaY: number; areaW: number; areaH: number }>({
    mouseX: 0,
    mouseY: 0,
    areaX: 0,
    areaY: 0,
    areaW: 0,
    areaH: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rawDisplayStreamRef = useRef<MediaStream | null>(null);
  const cropVideoRef = useRef<HTMLVideoElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropAnimFrameRef = useRef<number | null>(null);

  const videoChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const isStoppingRef = useRef<boolean>(false);
  const recordedClicksRef = useRef<RecordedClickEvent[]>([]);

  recordedClicksRef.current = recordedClicks;

  // Simulated Web App Canvas state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [simulatedScore, setSimulatedScore] = useState<number>(42);
  const [simulatedActiveTab, setSimulatedActiveTab] = useState<'dash' | 'users' | 'settings'>('dash');

  useEffect(() => {
    if (!isOpen) {
      if (recordingState === 'recording' || recordingState === 'paused') {
        handleStopRecording();
      } else {
        cleanupStream();
      }
      setRecordingState('idle');
      setIsSelectingArea(false);
      setElapsedSeconds(0);
      setRecordedClicks([]);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const cleanupStream = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (cropAnimFrameRef.current) {
      clearInterval(cropAnimFrameRef.current);
      cancelAnimationFrame(cropAnimFrameRef.current);
      cropAnimFrameRef.current = null;
    }
    if (cropVideoRef.current) {
      cropVideoRef.current.pause();
      cropVideoRef.current.srcObject = null;
      cropVideoRef.current = null;
    }
    if (rawDisplayStreamRef.current) {
      rawDisplayStreamRef.current.getTracks().forEach((t) => t.stop());
      rawDisplayStreamRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  // Drag and resize handlers for Area Selection Overlay
  const handleHandleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveHandle(handle);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      areaX: cropArea.x,
      areaY: cropArea.y,
      areaW: cropArea.width,
      areaH: cropArea.height,
    };
  };

  useEffect(() => {
    if (!activeHandle) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { mouseX, mouseY, areaX, areaY, areaW, areaH } = dragStartRef.current;
      const dx = e.clientX - mouseX;
      const dy = e.clientY - mouseY;

      const minW = 200;
      const minH = 150;
      const maxW = window.innerWidth;
      const maxH = window.innerHeight;

      let newX = areaX;
      let newY = areaY;
      let newW = areaW;
      let newH = areaH;

      if (activeHandle === 'move') {
        newX = Math.max(0, Math.min(maxW - areaW, areaX + dx));
        newY = Math.max(0, Math.min(maxH - areaH, areaY + dy));
      } else {
        if (activeHandle.includes('e')) {
          newW = Math.max(minW, Math.min(maxW - areaX, areaW + dx));
        }
        if (activeHandle.includes('s')) {
          newH = Math.max(minH, Math.min(maxH - areaY, areaH + dy));
        }
        if (activeHandle.includes('w')) {
          const possibleW = areaW - dx;
          if (possibleW >= minW) {
            const clampedX = Math.max(0, areaX + dx);
            newW = areaW + (areaX - clampedX);
            newX = clampedX;
          } else {
            newX = areaX + (areaW - minW);
            newW = minW;
          }
        }
        if (activeHandle.includes('n')) {
          const possibleH = areaH - dy;
          if (possibleH >= minH) {
            const clampedY = Math.max(0, areaY + dy);
            newH = areaH + (areaY - clampedY);
            newY = clampedY;
          } else {
            newY = areaY + (areaH - minH);
            newH = minH;
          }
        }
      }

      setCropArea({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      });
    };

    const handleMouseUp = () => {
      setActiveHandle(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeHandle]);

  const applyPreset = (w: number, h: number) => {
    const targetW = Math.min(w, window.innerWidth - 40);
    const targetH = Math.min(h, window.innerHeight - 40);
    const targetX = Math.max(20, Math.floor((window.innerWidth - targetW) / 2));
    const targetY = Math.max(20, Math.floor((window.innerHeight - targetH) / 2));
    setCropArea({ x: targetX, y: targetY, width: targetW, height: targetH });
  };

  const handleStartCapture = async () => {
    setIsSelectingArea(false);
    setErrorMessage(null);
    setRecordedClicks([]);
    setRecordingState('countdown');
    setCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        startMediaRecording();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const startMediaRecording = async () => {
    videoChunksRef.current = [];
    isStoppingRef.current = false;
    try {
      let stream: MediaStream;

      if (recordMode === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
            width: { ideal: 2560, max: 3840 },
            height: { ideal: 1440, max: 2160 },
            frameRate: { ideal: 60, max: 60 },
          },
          audio: enableAudio,
          surfaceSwitching: 'include',
          selfBrowserSurface: 'exclude',
          preferCurrentTab: false,
          monitorTypeSurfaces: 'include',
          systemAudio: enableAudio ? 'include' : 'exclude',
        } as any);
      } else if (recordMode === 'area') {
        const rawStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
            width: { ideal: 2560, max: 3840 },
            height: { ideal: 1440, max: 2160 },
            frameRate: { ideal: 60, max: 60 },
          },
          audio: enableAudio,
          surfaceSwitching: 'include',
          selfBrowserSurface: 'exclude',
          preferCurrentTab: false,
          monitorTypeSurfaces: 'include',
          systemAudio: enableAudio ? 'include' : 'exclude',
        } as any);
        rawDisplayStreamRef.current = rawStream;

        // Set up offscreen video and canvas to crop exact selected rectangle
        const cropVideo = document.createElement('video');
        cropVideo.srcObject = rawStream;
        cropVideo.autoplay = true;
        cropVideo.muted = true;
        cropVideo.playsInline = true;
        cropVideoRef.current = cropVideo;

        await new Promise<void>((resolve) => {
          cropVideo.onloadedmetadata = () => {
            cropVideo.play().then(() => resolve()).catch(() => resolve());
          };
        });

        const cropCanvas = document.createElement('canvas');
        cropCanvasRef.current = cropCanvas;
        const ctx = cropCanvas.getContext('2d', { alpha: false });

        // Save viewport position on screen when capture was started
        const vX = (window.screenX || window.screenLeft || 0) + Math.max(0, window.outerWidth - window.innerWidth);
        const vY = (window.screenY || window.screenTop || 0) + Math.max(0, window.outerHeight - window.innerHeight);

        // Use setInterval (33ms = ~30fps) so drawing loop continues across browser tab/window switches
        const drawFrame = () => {
          if (ctx && cropVideo && cropVideo.readyState >= 2) {
            const vidW = cropVideo.videoWidth;
            const vidH = cropVideo.videoHeight;
            if (vidW > 0 && vidH > 0) {
              const screenW = window.screen.width || window.innerWidth;
              const screenH = window.screen.height || window.innerHeight;

              const scaleX = vidW / screenW;
              const scaleY = vidH / screenH;

              let sx = Math.floor((vX + cropArea.x) * scaleX);
              let sy = Math.floor((vY + cropArea.y) * scaleY);
              let sw = Math.floor(cropArea.width * scaleX);
              let sh = Math.floor(cropArea.height * scaleY);

              // Clamp to monitor boundaries
              sx = Math.max(0, Math.min(vidW - 10, sx));
              sy = Math.max(0, Math.min(vidH - 10, sy));
              sw = Math.max(10, Math.min(vidW - sx, sw));
              sh = Math.max(10, Math.min(vidH - sy, sh));

              if (cropCanvas.width !== sw || cropCanvas.height !== sh) {
                cropCanvas.width = sw;
                cropCanvas.height = sh;
              }

              ctx.drawImage(cropVideo, sx, sy, sw, sh, 0, 0, sw, sh);
            }
          }
        };
        drawFrame();
        const cropInterval = window.setInterval(drawFrame, 33);
        cropAnimFrameRef.current = cropInterval as unknown as number;

        const croppedStream = cropCanvas.captureStream(60);
        if (enableAudio) {
          rawStream.getAudioTracks().forEach((track) => {
            croppedStream.addTrack(track);
          });
        }

        stream = croppedStream;
      } else {
        // Capture stream from simulated interactive app canvas
        if (!canvasRef.current) throw new Error('Canvas not initialized');
        stream = canvasRef.current.captureStream(60);
      }

      streamRef.current = stream;

      // Listen for stream ending (e.g. user clicks Stop Sharing native browser bar)
      const videoTrack = (rawDisplayStreamRef.current || stream).getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          handleStopRecording();
        };
      }

      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 15000000 });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(1000);
      setRecordingState('recording');
      startTimeRef.current = Date.now();
      setElapsedSeconds(0);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err: unknown) {
      setRecordingState('idle');
      const errStr = err instanceof Error ? err.message : String(err);
      if (errStr.includes('Permission denied') || errStr.includes('NotAllowedError')) {
        setErrorMessage('Screen recording permission was denied. Please allow display capture to record.');
      } else {
        setErrorMessage(`Recording error: ${errStr}`);
      }
    }
  };

  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
  };

  const handleStopRecording = () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    const finalizeAndSave = () => {
      const chunks = videoChunksRef.current;
      const videoBlob = new Blob(chunks, { type: 'video/webm' });
      const computedDuration = startTimeRef.current > 0
        ? Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000))
        : Math.max(1, elapsedSeconds);

      const clickAnims = enableClickTracking
        ? recordedClicksRef.current.map((clk, idx) => ({
            id: `click_rec_${idx}`,
            timestamp: clk.timestamp,
            x: clk.x,
            y: clk.y,
            style: 'ripple' as const,
            size: 45,
            duration: 0.6,
            color: '#38bdf8',
            playSound: true,
          }))
        : [];

      const generatedZooms = enableAutoZoom
        ? generateAutoZooms(clickAnims, DEFAULT_AUTO_ZOOM_SETTINGS, computedDuration)
        : [];

      // Create new Project object
      const newProject: Project = {
        id: 'proj_' + Date.now(),
        name: `App Demo - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sourceVideoBlob: videoBlob,
        sourceVideoBlobUrl: URL.createObjectURL(videoBlob),
        duration: computedDuration,
        videoSegments: [
          {
            id: 'seg_1',
            startTime: 0,
            endTime: computedDuration,
            speed: 1.0,
          },
        ],
        clickAnimations: clickAnims,
        zoomEvents: generatedZooms,
        autoZoomSettings: {
          ...DEFAULT_AUTO_ZOOM_SETTINGS,
          enabled: enableAutoZoom,
        },
        annotations: [],
        transitions: [],
        audioTracks: [],
        settings: {
          width: recordMode === 'area' ? cropArea.width : 1280,
          height: recordMode === 'area' ? cropArea.height : 720,
          fps: 30,
        },
      };

      cleanupStream();
      setRecordingState('idle');
      setIsSelectingArea(false);
      onFinishRecording(newProject);
    };

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      finalizeAndSave();
      return;
    }

    recorder.onstop = () => {
      finalizeAndSave();
    };

    try {
      recorder.stop();
    } catch (e) {
      console.warn('Error stopping MediaRecorder:', e);
      finalizeAndSave();
    }
  };

  // Click tracker on simulated interactive demo canvas
  const handleSimulatedCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (recordingState !== 'recording') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const timeSec = (Date.now() - startTimeRef.current) / 1000;
    setRecordedClicks((prev) => [...prev, { timestamp: timeSec, x, y }]);
    setSimulatedScore((s) => s + 1);
  };

  // Render loop for simulated interactive app
  useEffect(() => {
    if (recordMode !== 'simulated' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    let animId: number;

    const render = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // App Header Bar
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, 56);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillText('⚡ DemoApp Sandbox', 24, 35);

      // Navigation tabs
      const tabs: ('dash' | 'users' | 'settings')[] = ['dash', 'users', 'settings'];
      tabs.forEach((tab, i) => {
        const active = simulatedActiveTab === tab;
        ctx.fillStyle = active ? '#0284c7' : '#334155';
        ctx.beginPath();
        ctx.roundRect(260 + i * 110, 12, 96, 32, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '500 13px Inter, sans-serif';
        ctx.fillText(tab.toUpperCase(), 280 + i * 110, 32);
      });

      // App Body
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(40, 80, 1200, 580, 12);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillText(`Interactive ${simulatedActiveTab.toUpperCase()} Panel`, 80, 130);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText('Click elements below to capture live user interactions & click coordinates!', 80, 160);

      // Metric Button Card
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(80, 200, 240, 100, 10);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Inter, sans-serif';
      ctx.fillText(`${simulatedScore}`, 100, 250);
      ctx.font = '13px Inter, sans-serif';
      ctx.fillText('Clicks Tracked (Click Me)', 100, 280);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [recordMode, simulatedActiveTab, simulatedScore]);

  if (!isOpen) return null;

  // Render Selectable & Resizable Area Selection Frame Overlay
  if (isSelectingArea && recordingState === 'idle') {
    return (
      <div className="fixed inset-0 z-[200] overflow-hidden select-none animate-in fade-in duration-150">
        {/* Dimmed Backdrops around Selected Frame Area */}
        <div
          className="absolute bg-slate-950/75 backdrop-blur-[2px]"
          style={{ top: 0, left: 0, width: '100%', height: cropArea.y }}
        />
        <div
          className="absolute bg-slate-950/75 backdrop-blur-[2px]"
          style={{
            top: cropArea.y + cropArea.height,
            left: 0,
            width: '100%',
            height: Math.max(0, window.innerHeight - (cropArea.y + cropArea.height)),
          }}
        />
        <div
          className="absolute bg-slate-950/75 backdrop-blur-[2px]"
          style={{ top: cropArea.y, left: 0, width: cropArea.x, height: cropArea.height }}
        />
        <div
          className="absolute bg-slate-950/75 backdrop-blur-[2px]"
          style={{
            top: cropArea.y,
            left: cropArea.x + cropArea.width,
            width: Math.max(0, window.innerWidth - (cropArea.x + cropArea.width)),
            height: cropArea.height,
          }}
        />

        {/* Selected Frame Box */}
        <div
          className="absolute border-2 border-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.4)] transition-shadow cursor-move flex flex-col justify-between"
          style={{
            left: cropArea.x,
            top: cropArea.y,
            width: cropArea.width,
            height: cropArea.height,
          }}
          onMouseDown={(e) => handleHandleMouseDown(e, 'move')}
        >
          {/* Inner Grid Guidelines */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
            <div className="border-r border-b border-sky-300" />
            <div className="border-r border-b border-sky-300" />
            <div className="border-b border-sky-300" />
            <div className="border-r border-b border-sky-300" />
            <div className="border-r border-b border-sky-300" />
            <div className="border-b border-sky-300" />
            <div className="border-r border-sky-300" />
            <div className="border-r border-sky-300" />
            <div />
          </div>

          {/* Dimension Badge */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/90 border border-sky-500/50 text-sky-300 font-mono text-xs font-bold shadow-xl flex items-center gap-1.5 pointer-events-none z-10">
            <Crop className="w-3.5 h-3.5 text-sky-400" />
            <span>{cropArea.width} × {cropArea.height} px</span>
          </div>

          {/* Center Drag Handle Indicator */}
          <div className="m-auto px-3 py-1.5 rounded-lg bg-slate-900/80 border border-sky-500/30 text-sky-200 text-xs font-semibold flex items-center gap-2 pointer-events-none shadow-md">
            <Move className="w-4 h-4 text-sky-400" />
            <span>Drag inside to move frame</span>
          </div>

          {/* 8 Resize Handles */}
          {/* NW */}
          <div
            className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-sky-500 shadow-lg cursor-nwse-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleHandleMouseDown(e, 'nw')}
          />
          {/* N */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-sky-500 shadow-lg cursor-ns-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleHandleMouseDown(e, 'n')}
          />
          {/* NE */}
          <div
            className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-sky-500 shadow-lg cursor-nesw-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleHandleMouseDown(e, 'ne')}
          />
          {/* E */}
          <div
            className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-sky-500 shadow-lg cursor-ew-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleHandleMouseDown(e, 'e')}
          />
          {/* SE */}
          <div
            className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-sky-500 shadow-lg cursor-nwse-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleHandleMouseDown(e, 'se')}
          />
          {/* S */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-sky-500 shadow-lg cursor-ns-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleHandleMouseDown(e, 's')}
          />
          {/* SW */}
          <div
            className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-sky-500 shadow-lg cursor-nesw-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleHandleMouseDown(e, 'sw')}
          />
          {/* W */}
          <div
            className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-sky-500 shadow-lg cursor-ew-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleHandleMouseDown(e, 'w')}
          />
        </div>

        {/* Floating Toolbar Bar attached to top/bottom of screen */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[210] flex items-center gap-3 px-5 py-3 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md text-white">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium border-r border-slate-700 pr-3">
            <span className="text-slate-400">Presets:</span>
            <button
              onClick={() => applyPreset(1280, 720)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-sky-500/20 hover:text-sky-300 text-[11px] font-mono transition-colors"
            >
              1280×720
            </button>
            <button
              onClick={() => applyPreset(1920, 1080)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-sky-500/20 hover:text-sky-300 text-[11px] font-mono transition-colors"
            >
              1920×1080
            </button>
            <button
              onClick={() => applyPreset(800, 800)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-sky-500/20 hover:text-sky-300 text-[11px] font-mono transition-colors"
            >
              800×800
            </button>
            <button
              onClick={() => applyPreset(window.innerWidth - 40, window.innerHeight - 40)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-sky-500/20 hover:text-sky-300 text-[11px] font-mono transition-colors"
            >
              Fit
            </button>
          </div>

          <button
            onClick={() => setIsSelectingArea(false)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>

          <button
            onClick={handleStartCapture}
            className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/25 transition-all hover:scale-105"
          >
            <Circle className="w-4 h-4 fill-white" />
            <span>Start Recording Area</span>
          </button>
        </div>
      </div>
    );
  }

  // Render floating minimal control bar during active screen/area recording
  if ((recordingState === 'recording' || recordingState === 'paused') && (recordMode === 'screen' || recordMode === 'area')) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-2.5 bg-slate-900/95 border border-slate-700/80 rounded-full shadow-2xl backdrop-blur-md text-white select-none animate-in fade-in slide-in-from-bottom-3 duration-200">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            {recordingState === 'recording' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            )}
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </span>
          <span className="font-mono font-bold text-sky-400 text-sm">
            {formatTimer(elapsedSeconds)}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-700" />

        {recordMode === 'area' && (
          <div className="text-xs text-sky-300 font-mono font-semibold px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
            {cropArea.width}×{cropArea.height}
          </div>
        )}

        <div className="text-xs text-slate-300 font-medium hidden sm:block">
          <span className="text-sky-400 font-bold">{recordedClicks.length}</span> clicks captured
        </div>

        <div className="h-4 w-px bg-slate-700 hidden sm:block" />

        {recordingState === 'recording' ? (
          <button
            onClick={handlePauseRecording}
            className="p-1.5 rounded-full hover:bg-slate-800 text-amber-400 transition-colors"
            title="Pause Recording"
          >
            <Pause className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleResumeRecording}
            className="p-1.5 rounded-full hover:bg-slate-800 text-emerald-400 transition-colors"
            title="Resume Recording"
          >
            <Play className="w-4 h-4 fill-emerald-400" />
          </button>
        )}

        <button
          onClick={handleStopRecording}
          className="px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-all hover:scale-105 active:scale-95"
        >
          <Square className="w-3.5 h-3.5 fill-white" />
          <span>Stop Recording</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-base">Record Web App Demo</h2>
              <p className="text-xs text-slate-400">Capture browser screen, selected area, or active application tab</p>
            </div>
          </div>

          {recordingState === 'idle' && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {recordingState === 'idle' && (
            <div className="space-y-6">
              {/* Mode Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => setRecordMode('screen')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center gap-2 ${
                    recordMode === 'screen'
                      ? 'bg-sky-500/10 border-sky-500 text-sky-400'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Laptop className="w-7 h-7" />
                  <div className="font-semibold text-xs text-slate-200">Full Screen / Window</div>
                  <p className="text-[11px] text-slate-400">Record full browser window or tab</p>
                </div>

                <div
                  onClick={() => {
                    setRecordMode('area');
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center gap-2 ${
                    recordMode === 'area'
                      ? 'bg-sky-500/10 border-sky-500 text-sky-400'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Crop className="w-7 h-7" />
                  <div className="font-semibold text-xs text-slate-200">Record Area</div>
                  <p className="text-[11px] text-slate-400">Select & resize a custom region</p>
                </div>

                <div
                  onClick={() => setRecordMode('simulated')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center gap-2 ${
                    recordMode === 'simulated'
                      ? 'bg-sky-500/10 border-sky-500 text-sky-400'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <MousePointerClick className="w-7 h-7" />
                  <div className="font-semibold text-xs text-slate-200">Interactive Sandbox</div>
                  <p className="text-[11px] text-slate-400">Record demo app with click tracking</p>
                </div>
              </div>

              {recordMode === 'area' && (
                <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between text-xs text-slate-200 gap-3">
                  <div className="flex items-center gap-2.5">
                    <Crop className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-100">Selected Region: </span>
                      <span className="font-mono font-semibold text-sky-300">{cropArea.width} × {cropArea.height} px</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSelectingArea(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Select Recording Area</span>
                  </button>
                </div>
              )}

              {/* Pre-recording Configuration Options */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="font-semibold text-xs text-slate-200 flex items-center justify-between">
                  <span>Pre-Recording Options</span>
                  <span className="text-[10px] text-slate-400 font-normal">Choose parameters before recording starts</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  {/* Audio Toggle */}
                  <label className={`p-3 rounded-lg border cursor-pointer flex items-center gap-2.5 transition-all select-none ${
                    enableAudio ? 'bg-sky-500/10 border-sky-500/50 text-slate-200' : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={enableAudio}
                      onChange={(e) => setEnableAudio(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                        <span>Audio</span>
                      </div>
                      <div className="text-[10px] text-slate-400">Mic & System audio</div>
                    </div>
                  </label>

                  {/* Click Tracking Toggle */}
                  <label className={`p-3 rounded-lg border cursor-pointer flex items-center gap-2.5 transition-all select-none ${
                    enableClickTracking ? 'bg-sky-500/10 border-sky-500/50 text-slate-200' : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={enableClickTracking}
                      onChange={(e) => setEnableClickTracking(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                        <MousePointerClick className="w-3.5 h-3.5 text-sky-400" />
                        <span>Click Tracking</span>
                      </div>
                      <div className="text-[10px] text-slate-400">Visual click ripples</div>
                    </div>
                  </label>

                  {/* Auto Zoom Toggle */}
                  <label className={`p-3 rounded-lg border cursor-pointer flex items-center gap-2.5 transition-all select-none ${
                    enableAutoZoom ? 'bg-sky-500/10 border-sky-500/50 text-slate-200' : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={enableAutoZoom}
                      onChange={(e) => setEnableAutoZoom(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                        <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
                        <span>Auto Zoom</span>
                      </div>
                      <div className="text-[10px] text-slate-400">Smooth focal zooms</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="font-semibold text-slate-200">💡 Tip for best demo recordings:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Click normally during recording. Clicks will automatically get visual ripple animations!</li>
                  <li>Don't worry about speaking or background noise — you can add background audio in the editor.</li>
                  <li>You can trim long pauses or mistakes after stopping recording.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Canvas always mounted to prevent 'Canvas not initialized' error */}
          <div className={recordMode === 'simulated' && (recordingState === 'recording' || recordingState === 'paused') ? 'block' : 'hidden'}>
            <div className="space-y-2 mb-6">
              <div className="text-xs font-semibold text-slate-400">Interactive App Canvas (Click inside to record):</div>
              <div
                className="relative aspect-video rounded-xl border border-slate-700 overflow-hidden cursor-crosshair shadow-lg"
                onClick={handleSimulatedCanvasClick}
              >
                <canvas ref={canvasRef} width={1280} height={720} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Countdown State */}
          {recordingState === 'countdown' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="text-6xl font-extrabold text-sky-400 animate-bounce">{countdown}</div>
              <p className="text-sm font-semibold text-slate-300">Get ready to interact with your application...</p>
            </div>
          )}

          {/* Active Recording State */}
          {(recordingState === 'recording' || recordingState === 'paused') && (
            <div className="space-y-6">
              {/* Active Recording Indicator Bar */}
              <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Circle
                      className={`w-3.5 h-3.5 text-rose-500 fill-rose-500 ${
                        recordingState === 'recording' ? 'animate-ping' : 'opacity-40'
                      }`}
                    />
                    <span className="font-semibold text-slate-100 text-sm">
                      {recordingState === 'recording' ? 'Recording Active' : 'Paused'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-sky-400 text-lg px-3 py-1 rounded bg-slate-900 border border-slate-700">
                    {formatTimer(elapsedSeconds)}
                  </span>
                </div>

                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-sky-400">{recordedClicks.length}</span> clicks captured
                </div>
              </div>

              {(recordMode === 'screen' || recordMode === 'area') && (
                <div className="py-2 px-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-[11px] gap-2">
                  <span className="text-slate-300 font-medium truncate">
                    {recordMode === 'area'
                      ? `Recording area (${cropArea.width}×${cropArea.height}) active.`
                      : 'Screen recording active in selected browser tab.'}
                  </span>
                  <span className="text-slate-500 shrink-0">
                    Click Stop below when done
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 border-t border-slate-800 flex items-center justify-between bg-slate-900/50">
          {recordingState === 'idle' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (recordMode === 'area') {
                    setIsSelectingArea(true);
                  } else {
                    handleStartCapture();
                  }
                }}
                className="px-6 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20"
              >
                <Circle className="w-4 h-4 fill-white" />
                <span>{recordMode === 'area' ? 'Select Recording Area' : 'Start Recording'}</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 w-full justify-end">
              {recordingState === 'recording' ? (
                <button
                  onClick={handlePauseRecording}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700"
                >
                  <Pause className="w-4 h-4 text-amber-400" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  onClick={handleResumeRecording}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700"
                >
                  <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  <span>Resume</span>
                </button>
              )}

              <button
                onClick={handleStopRecording}
                className="px-6 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/25"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stop Recording</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}
