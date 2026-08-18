import { Project, VideoSegment } from '../types';
import { DEFAULT_AUTO_ZOOM_SETTINGS } from './zoomSystem';

/**
 * Generates an animated HTML5 canvas recording of a realistic SaaS Web App UI
 * returning a WebM Blob and Project object so users can immediately test all editing capabilities!
 */
export async function createSampleDemoProject(
  templateName: 'saas' | 'api' | 'ecom' = 'saas'
): Promise<Project> {
  const canvas = document.createElement('canvas');
  const width = 1280;
  const height = 720;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;
  const fps = 30;
  const durationSeconds = 12;
  const totalFrames = fps * durationSeconds;

  const stream = canvas.captureStream(fps);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm',
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve) => {
    mediaRecorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
  });

  mediaRecorder.start();

  // Render simulated SaaS UI frames
  for (let frame = 0; frame < totalFrames; frame++) {
    const time = frame / fps;
    const progress = time / durationSeconds;

    // Draw dark/light SaaS background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    // Sidebar
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.fillRect(0, 0, 240, height);

    // Sidebar Logo & Nav
    ctx.fillStyle = '#38bdf8'; // sky-400
    ctx.fillRect(24, 28, 32, 32);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillText('Acme SaaS', 68, 50);

    const navItems = ['Dashboard', 'Analytics', 'API Keys', 'Customers', 'Settings'];
    navItems.forEach((item, i) => {
      const active = (templateName === 'api' && i === 2) || (templateName === 'saas' && i === 0);
      ctx.fillStyle = active ? '#0284c7' : 'transparent';
      ctx.beginPath();
      ctx.roundRect(16, 100 + i * 48, 208, 38, 8);
      ctx.fill();

      ctx.fillStyle = active ? '#ffffff' : '#94a3b8';
      ctx.font = '500 14px Inter, sans-serif';
      ctx.fillText(item, 44, 124 + i * 48);
    });

    // Main Header
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(240, 0, width - 240, 64);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 20px Inter, sans-serif';
    ctx.fillText(templateName === 'api' ? 'API Configuration' : 'Product Overview & Metrics', 272, 38);

    // Search bar
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(width - 320, 16, 200, 32, 6);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText('Search features...', width - 308, 37);

    // Cards / Content Body
    if (templateName === 'api') {
      // API Key Config UI
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(272, 96, 700, 180, 12);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.fillText('Production API Key', 296, 132);

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(296, 150, 520, 44, 8);
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.font = '14px monospace';
      ctx.fillText('sk_live_994a28f801bc227...', 312, 177);

      // Copy Button
      ctx.fillStyle = progress > 0.4 && progress < 0.7 ? '#0284c7' : '#2563eb';
      ctx.beginPath();
      ctx.roundRect(832, 150, 110, 44, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 14px Inter, sans-serif';
      ctx.fillText('Copy Key', 854, 177);
    } else {
      // Dashboard Cards
      const metrics = [
        { title: 'Total Revenue', value: `$${Math.floor(48200 + progress * 3500).toLocaleString()}`, change: '+12.4%' },
        { title: 'Active Users', value: `${Math.floor(1240 + progress * 120).toLocaleString()}`, change: '+8.1%' },
        { title: 'Conversion Rate', value: '3.82%', change: '+0.5%' },
      ];

      metrics.forEach((m, idx) => {
        const cx = 272 + idx * 310;
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(cx, 96, 290, 110, 12);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px Inter, sans-serif';
        ctx.fillText(m.title, cx + 20, 126);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillText(m.value, cx + 20, 162);

        ctx.fillStyle = '#10b981';
        ctx.font = '600 12px Inter, sans-serif';
        ctx.fillText(m.change, cx + 200, 162);
      });

      // Interactive Chart
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(272, 230, 920, 420, 12);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.fillText('Monthly Active Growth Trend', 296, 268);

      // Draw Chart line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();

      const points = [
        [320, 580], [420, 520], [520, 480], [620, 510],
        [720, 420], [820, 390], [920, 340], [1020, 360], [1120, 310]
      ];

      points.forEach(([px, py], i) => {
        const adjustedY = py - Math.sin(progress * Math.PI * 2 + i) * 15;
        if (i === 0) ctx.moveTo(px, adjustedY);
        else ctx.lineTo(px, adjustedY);
      });
      ctx.stroke();
    }

    // Animated Simulated Cursor
    let cursorX = 500;
    let cursorY = 300;
    if (progress < 0.3) {
      cursorX = 300 + progress * 1000;
      cursorY = 120;
    } else if (progress < 0.6) {
      cursorX = 880;
      cursorY = 172;
    } else {
      cursorX = 720 + Math.sin(progress * 10) * 80;
      cursorY = 400 + Math.cos(progress * 10) * 40;
    }

    // Draw mouse pointer
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cursorX, cursorY);
    ctx.lineTo(cursorX + 16, cursorY + 16);
    ctx.lineTo(cursorX + 8, cursorY + 18);
    ctx.lineTo(cursorX + 14, cursorY + 30);
    ctx.lineTo(cursorX + 10, cursorY + 32);
    ctx.lineTo(cursorX + 4, cursorY + 20);
    ctx.lineTo(cursorX, cursorY + 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Yield to allow smooth rendering
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }

  mediaRecorder.stop();
  const videoBlob = await recordingPromise;

  const projectId = 'proj_sample_' + templateName + '_' + Date.now();
  const title =
    templateName === 'api'
      ? 'API Setup Walkthrough'
      : templateName === 'ecom'
      ? 'Product Catalog Feature Demo'
      : 'SaaS Dashboard Overview';

  const defaultSegments: VideoSegment[] = [
    {
      id: 'seg_1',
      startTime: 0,
      endTime: durationSeconds,
      speed: 1.0,
    },
  ];

  const project: Project = {
    id: projectId,
    name: title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sourceVideoBlob: videoBlob,
    sourceVideoBlobUrl: URL.createObjectURL(videoBlob),
    duration: durationSeconds,
    videoSegments: defaultSegments,
    clickAnimations: [
      {
        id: 'click_1',
        timestamp: 2.5,
        x: 68.5,
        y: 23.8,
        style: 'ripple',
        size: 40,
        duration: 0.6,
        color: '#38bdf8',
        playSound: true,
      },
      {
        id: 'click_2',
        timestamp: 6.8,
        x: 45.2,
        y: 52.0,
        style: 'pulse',
        size: 50,
        duration: 0.8,
        color: '#f43f5e',
        playSound: true,
      },
    ],
    annotations: [
      {
        id: 'ann_1',
        text: 'This is the main dashboard where you can track user metrics in real-time.',
        style: 'rounded',
        animation: 'typewriter',
        startTime: 1.0,
        duration: 4.0,
        x: 35,
        y: 65,
        fontSize: 15,
        textColor: '#f8fafc',
        bgColor: '#0284c7',
        opacity: 0.95,
        arrowDirection: 'top',
      },
      {
        id: 'ann_2',
        text: 'Click here to copy your production API credentials instantly.',
        style: 'speech',
        animation: 'slide',
        startTime: 5.5,
        duration: 3.5,
        x: 60,
        y: 32,
        fontSize: 14,
        textColor: '#0f172a',
        bgColor: '#38bdf8',
        opacity: 0.95,
      },
    ],
    transitions: [
      {
        id: 'trans_1',
        title: 'Now let\'s configure the API integration',
        subtitle: 'Step 2: Authenticating your request header',
        style: 'saas',
        timestamp: 5.0,
        duration: 2.0,
        bgColor: '#0f172a',
        textColor: '#38bdf8',
        fontSize: 26,
        alignment: 'center',
      },
    ],
    audioTracks: [
      {
        id: 'audio_1',
        name: 'Upbeat SaaS Vibe',
        presetId: 'upbeat',
        volume: 0.35,
        fadeIn: true,
        fadeOut: true,
        loop: true,
        startTime: 0,
        duration: durationSeconds,
      },
    ],
    autoZoomSettings: DEFAULT_AUTO_ZOOM_SETTINGS,
    zoomEvents: [
      {
        id: 'zoom_auto_1',
        timestamp: 2.5,
        duration: 3.0,
        zoomInSpeed: 0.5,
        zoomOutSpeed: 0.5,
        zoomLevel: 1.5,
        x: 68.5,
        y: 23.8,
        style: 'smooth',
        isAuto: true,
        disabled: false,
        label: 'Auto Zoom: Click at 2.5s',
      },
      {
        id: 'zoom_auto_2',
        timestamp: 6.8,
        duration: 3.0,
        zoomInSpeed: 0.5,
        zoomOutSpeed: 0.5,
        zoomLevel: 1.5,
        x: 45.2,
        y: 52.0,
        style: 'smooth',
        isAuto: true,
        disabled: false,
        label: 'Auto Zoom: Click at 6.8s',
      },
    ],
    settings: {
      width: 1280,
      height: 720,
      fps: 30,
    },
  };

  return project;
}
