// Chrome Extension Manifest V3 configuration & source code generators

export const EXTENSION_MANIFEST_JSON = {
  manifest_version: 3,
  name: 'App Demo Creator — Screen & Click Recorder',
  version: '1.0.0',
  description: 'Record browser application demos with automatic click tracking and launch instant video editor.',
  permissions: [
    'activeTab',
    'tabCapture',
    'desktopCapture',
    'storage',
    'scripting'
  ],
  host_permissions: [
    '<all_urls>'
  ],
  background: {
    service_worker: 'background.js',
  },
  action: {
    default_popup: 'popup.html',
    default_title: 'App Demo Creator',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['content.js'],
      run_at: 'document_start'
    }
  ]
};

export const EXTENSION_BACKGROUND_JS = `// Background Service Worker for App Demo Creator
let isRecording = false;
let recordedClicks = [];
let recordingStartTime = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_RECORDING') {
    isRecording = true;
    recordedClicks = [];
    recordingStartTime = Date.now();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'ENABLE_CLICK_TRACKING' });
      }
    });
    sendResponse({ status: 'recording_started' });
  } else if (message.type === 'RECORDED_CLICK') {
    if (isRecording) {
      const timeInSec = (Date.now() - recordingStartTime) / 1000;
      recordedClicks.push({
        timestamp: timeInSec,
        x: message.x,
        y: message.y
      });
    }
  } else if (message.type === 'STOP_RECORDING') {
    isRecording = false;
    sendResponse({
      status: 'recording_stopped',
      clicks: recordedClicks,
      duration: (Date.now() - recordingStartTime) / 1000
    });
  } else if (message.type === 'GET_RECORDING_STATUS') {
    sendResponse({
      isRecording,
      duration: isRecording ? (Date.now() - recordingStartTime) / 1000 : 0,
      clickCount: recordedClicks.length
    });
  }
  return true;
});
`;

export const EXTENSION_CONTENT_JS = `// Content Script for active tab click detection
let clickTrackingEnabled = false;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'ENABLE_CLICK_TRACKING') {
    clickTrackingEnabled = true;
  }
});

document.addEventListener('click', (e) => {
  if (!clickTrackingEnabled) return;
  const xPercent = (e.clientX / window.innerWidth) * 100;
  const yPercent = (e.clientY / window.innerHeight) * 100;

  // Visual click indicator on active page
  const ripple = document.createElement('div');
  ripple.style.position = 'fixed';
  ripple.style.left = (e.clientX - 20) + 'px';
  ripple.style.top = (e.clientY - 20) + 'px';
  ripple.style.width = '40px';
  ripple.style.height = '40px';
  ripple.style.borderRadius = '50%';
  ripple.style.border = '3px solid #38bdf8';
  ripple.style.backgroundColor = 'rgba(56, 189, 248, 0.3)';
  ripple.style.pointerEvents = 'none';
  ripple.style.zIndex = '999999';
  ripple.style.transition = 'all 0.5s ease-out';

  document.body.appendChild(ripple);
  setTimeout(() => {
    ripple.style.transform = 'scale(2)';
    ripple.style.opacity = '0';
  }, 10);
  setTimeout(() => ripple.remove(), 550);

  // Send click event to background
  chrome.runtime.sendMessage({
    type: 'RECORDED_CLICK',
    x: xPercent,
    y: yPercent
  });
}, true);
`;

export const EXTENSION_POPUP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 16px;
      background: #0f172a;
      color: #f8fafc;
    }
    h2 { font-size: 16px; margin-top: 0; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.4; }
    .btn {
      width: 100%;
      padding: 10px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      margin-top: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn-primary { background: #0284c7; color: white; }
    .btn-primary:hover { background: #0369a1; }
    .btn-danger { background: #ef4444; color: white; }
    .status {
      padding: 10px;
      background: #1e293b;
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 13px;
    }
    .badge {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      margin-right: 6px;
    }
    .badge.recording { background: #ef4444; animation: blink 1s infinite; }
    @keyframes blink { 50% { opacity: 0.3; } }
  </style>
</head>
<body>
  <h2>🎬 App Demo Creator</h2>
  <div class="status" id="status">
    <span class="badge" id="badge"></span>
    <span id="statusText">Ready to record app demo</span>
  </div>

  <button id="recordBtn" class="btn btn-primary">⏺ Start Tab Recording</button>
  <button id="openEditorBtn" class="btn" style="background:#334155; color:#f8fafc; margin-top:12px;">📂 Open Demo Editor App</button>

  <script src="popup.js"></script>
</body>
</html>
`;

export const EXTENSION_POPUP_JS = `document.addEventListener('DOMContentLoaded', () => {
  const recordBtn = document.getElementById('recordBtn');
  const statusText = document.getElementById('statusText');
  const badge = document.getElementById('badge');
  const openEditorBtn = document.getElementById('openEditorBtn');

  function updateStatus() {
    chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATUS' }, (res) => {
      if (res && res.isRecording) {
        badge.classList.add('recording');
        statusText.innerText = 'Recording (' + Math.floor(res.duration) + 's) - ' + res.clickCount + ' clicks captured';
        recordBtn.innerText = '⏹ Stop Recording & Open Editor';
        recordBtn.className = 'btn btn-danger';
      } else {
        badge.classList.remove('recording');
        statusText.innerText = 'Ready to record active tab';
        recordBtn.innerText = '⏺ Start Tab Recording';
        recordBtn.className = 'btn btn-primary';
      }
    });
  }

  updateStatus();
  setInterval(updateStatus, 1000);

  recordBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATUS' }, (res) => {
      if (res && res.isRecording) {
        chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, () => {
          updateStatus();
        });
      } else {
        chrome.runtime.sendMessage({ type: 'START_RECORDING' }, () => {
          updateStatus();
        });
      }
    });
  });

  openEditorBtn.addEventListener('click', () => {
    window.open('https://ai.studio/build', '_blank');
  });
});
`;
