# SAAS Demo Creator — Feature Documentation

This document details all implemented features, user-facing capabilities, system architecture, data flows, and technical modules present in the **SAAS Demo Creator** codebase.

---

## 1. Executive Summary & Core Capabilities

**SAAS Demo Creator** is a browser-based, full-stack video recording and editing studio designed to create polished product walkthroughs, demo videos, and animated GIFs without requiring voice recording. 

### Key Capabilities:
- **Screen & Area Recording**: Native display media recording with full-screen, custom cropped area, and interactive simulated sandbox modes.
- **Automatic Click & Interaction Tracking**: Capture mouse coordinates during recording to automatically generate animated click ripples and smart zoom/pan events.
- **ScreenToGif-Style Frame Editing**: Millisecond-precision slide strip for bulk-selecting, range-selecting, and trimming specific video frames.
- **Smart Zoom & Pan Engine**: Easing-based camera zoom animations focused dynamically around user clicks and points of interest.
- **Rich Callouts & Annotations**: Animated speech bubbles, rounded tags, floating badges, and typewriter text callouts.
- **Full-Screen Slide & Transition Cards**: Pre-built and customizable SaaS intros, feature transitions, founder cards, and call-to-action outros.
- **Web Audio Background Music Synthesizer**: In-browser algorithmic music generation (Upbeat, Ambient, Lo-Fi) mixed directly into video streams.
- **AI-Powered Natural Language Editor**: Hybrid deterministic local parser + Gemini LLM fallback to execute editing commands from plain English chat.
- **Canva-Style Graphics Creator & Social Reformatter**: Standalone multi-layer graphics editor for video thumbnails, intros/outros, and vertical/square social clips (YouTube, Instagram, TikTok, LinkedIn, Twitter).
- **High-Fidelity Exporter**: Multi-resolution video rendering (720p, 1080p, 4K MP4/WebM) and custom pure-TypeScript GIF89a encoder with Median-Cut color quantization and Floyd-Steinberg dithering.

---

## 2. User-Facing Functionality & Modules

### 2.1. Home Screen & Project Management (`HomeScreen.tsx`)
- **Project Dashboard**: Displays all saved projects sorted newest first, showing thumbnail preview, duration, last updated time, and element count.
- **Quick Action Triggers**:
  - **Record Screen / Tab**: Launches `RecorderModal`.
  - **Import Video File**: Accepts external video files (`.mp4`, `.webm`, `.mov`).
  - **Sample Demo Templates**: Instant 1-click project generation for 3 SaaS templates: *SaaS Metric Dashboard*, *API Configuration & Key Setup*, and *Product Feature Walkthrough*.
- **Batch Management**: Multi-selection checkboxes, "Select All", batch video downloads, single project deletion, and batch deletion.
- **Project Duplication**: Deep copies existing projects with all segments, annotations, zooms, and audio tracks.

### 2.2. Recorder Modal (`RecorderModal.tsx`)
- **Capture Modes**:
  - **Full Screen / Window / Tab**: Standard `navigator.mediaDevices.getDisplayMedia` stream.
  - **Custom Screen Area**: Live interactive selection box with bounding-box canvas cropping stream (`cropCanvas.captureStream`).
  - **Simulated Interactive Sandbox**: Built-in interactive HTML5 canvas app for testing clicks and score tracking without recording external screen content.
- **Recorder Settings**:
  - Audio capture toggle (system/mic audio).
  - Automatic click tracking toggle.
  - Automatic zoom generation toggle.
- **Recording Lifecycle**: 3-second countdown timer, live recording indicator, pause/resume, and safe stream teardown with buffer flushing.

### 2.3. Dual Editing Modes (`EditorView.tsx`)
The editor supports two working modes:
1. **Quick Mode**: Streamlined single-screen workflow prioritizing the `FrameSlideStrip`, audio track selector, and one-click export for rapid GIF/YouTube creation.
2. **Pro Studio Mode**: Full multi-track timeline and dedicated parameter configuration panels.

### 2.4. Editor Panels & Tools

| Tool / Panel | File | Functionality |
| :--- | :--- | :--- |
| **Frame Slide Strip** | `FrameSlideStrip.tsx` | Millisecond-accurate frame thumbnail strip (ScreenToGif pattern). Multi-select frames (`Ctrl+Click`), range select (`Shift+Click`), delete frames (translates into timeline cuts), adjust FPS (10, 15, 20, 30), zoom scale (50%–150%), and auto-scroll to playhead. |
| **Trim & Cut** | `TrimPanel.tsx` | Visual segment list, start/end time trimming, playback speed multiplier (1.0x, 1.25x, 1.5x, 2.0x), and section removal. |
| **Smart Zoom & Pan** | `ZoomPanel.tsx` | Easing-based focal zoom events (`smooth`, `ease`, `cinematic`, `subtle`), focal point coordinate controls (X/Y with frame boundary clamping), auto-zoom generator threshold settings, and hold duration controls. |
| **Click Ripple Effects** | `ClickPanel.tsx` | 5 visual styles (`ripple`, `highlight`, `pulse`, `spotlight`, `cursor`), custom radius, duration, color palette picker, and audio toggle. |
| **Text Annotations** | `AnnotationPanel.tsx` | 5 visual box styles (`rounded`, `speech`, `floating`, `highlight`, `minimal`), 5 entrance animations (`fade`, `slide`, `pop`, `typewriter`, `expand`), font families, font sizes, background/text colors, directional pointers, and canvas drag-to-reposition. |
| **Slide & Transition Cards** | `TransitionPanel.tsx`, `SlideTemplateModal.tsx`, `SlideCustomizerPanel.tsx` | 8 template categories (SaaS, AI, Tutorial, CTA, Founder, Minimal, Split, Bold), gradient/solid/image backgrounds, logos, author profiles, and typography styling. |
| **Audio Synthesizer & Music** | `AudioPanel.tsx`, `audioSynth.ts` | 3 algorithmic Web Audio presets (*Upbeat SaaS Vibe*, *Gentle Tech Ambient*, *Lo-Fi Focus*), custom audio file upload, volume slider, looping, and fade in/out. |
| **AI Assistant Panel** | `AiEditorPanel.tsx` | Interactive chat assistant accepting natural language instructions to trim, add callouts, create slides, insert music, and add click ripples. |
| **Export Engine & Modal** | `ExportModal.tsx`, `videoExporter.ts`, `gifEncoder.ts` | Configurable resolution (720p, 1080p, 4K), format (MP4, WebM, GIF), framerate, bitrate quality, live progress tracking, and file download. |

### 2.5. Canva Graphics Creator & Social Reformatter (`GraphicsEditorModal.tsx`)
- **Graphic Template Categories**: Intros, Outros, Thumbnails, Square Social (1:1), Vertical Social (9:16).
- **Multi-Layer Canvas**: Drag, resize, layer re-ordering, font styling, shadow effects, and background filters.
- **Background Library**: Integrated Unsplash curated tech/gradient images, CSS gradients, and solid colors.
- **Social Video Reformatter**: Adapts 16:9 demo projects into portrait (9:16) or square (1:1) formats with blurred backdrop framing, custom header banners, and platform presets (YouTube Shorts, TikTok, Instagram Reels, LinkedIn).
- **Direct Timeline Integration**: Push designed intro/outro slides directly into the active project timeline as transition cards.

---

## 3. Architecture & Technical Workflows

### 3.1. Full-Stack Structure
```
├── server.ts                       # Express backend + Gemini API endpoint + Vite dev/prod server
├── src/
│   ├── main.tsx                    # React application mount
│   ├── App.tsx                     # Top-level state orchestrator & modal coordinator
│   ├── types.ts                    # TypeScript data models and interfaces
│   ├── index.css                   # Global Tailwind CSS imports
│   ├── lib/
│   │   ├── db.ts                   # Multi-tier persistence (In-Memory + IndexedDB + LocalStorage)
│   │   ├── videoExporter.ts        # Offscreen canvas video renderer & frame compositor
│   │   ├── gifEncoder.ts           # Pure TypeScript GIF89a LZW encoder with Median-Cut quantization
│   │   ├── zoomSystem.ts           # Camera transform interpolation & auto-zoom generator
│   │   ├── audioSynth.ts           # Web Audio API music synthesizer
│   │   ├── demoVideoGenerator.ts   # Synthetic SaaS UI video generator for templates
│   │   ├── presets.ts              # Pre-defined style themes and palettes
│   │   ├── templates.ts            # Slide template definitions
│   │   ├── extensionManifest.ts    # Chrome Extension Manifest V3 configuration
│   │   ├── aiEditor/
│   │   │   ├── aiService.ts        # AI orchestration service
│   │   │   ├── localParser.ts      # Fast deterministic regex/keyword parser (0 tokens)
│   │   │   ├── commandExecutor.ts  # State mutation engine for editing commands
│   │   │   └── types.ts            # AI command definitions
│   │   └── graphics/
│   │       ├── backgrounds.ts      # Background preset assets & Unsplash collection
│   │       ├── renderer.ts         # Graphics canvas renderer & PNG exporter
│   │       └── templates.ts        # Built-in graphic templates & custom template store
│   └── components/
│       ├── Header.tsx              # Top navigation bar
│       ├── HomeScreen.tsx          # Project gallery, import, and sample creation
│       ├── RecorderModal.tsx       # Display media capture and simulated recording
│       ├── Editor/                 # Video editing views and tool panels
│       └── Graphics/               # Canva-style graphics editor modal
```

### 3.2. Data Flow & Persistence Architecture (`db.ts`)
1. **Tier 1 — In-Memory Store (`inMemoryProjectsCache`)**: Live Map keeping all loaded projects and active `Blob` / `BlobUrl` references to prevent latency or frame dropouts during editing sessions.
2. **Tier 2 — IndexedDB (`AppDemoCreatorDB`)**: Asynchronous storage for `Project` records and raw video Blobs (`sourceVideoBlob`). Handles quota or transaction errors gracefully without crashing the UI.
3. **Tier 3 — LocalStorage Backup (`AppDemoCreator_projects_meta`)**: Stores lightweight project metadata to guarantee project lists survive browser restarts even if IndexedDB is restricted in sandboxed environments.

### 3.3. AI Command Processing Pipeline
```
User Prompt (e.g. "trim first 5 seconds and add text 'Welcome' at 2s")
  │
  ▼
AiEditorService (`aiService.ts`)
  │
  ├──► Step 1: Local Deterministic Parser (`localParser.ts`)
  │      └─ Uses regex to recognize timestamps, trimming ranges, audio keywords.
  │      └─ If matched: returns commands instantly (0 API cost, 0ms latency).
  │
  └──► Step 2: Gemini 3.6 Flash Server Proxy (`/api/ai-editor`)
         └─ Calls server with structured JSON schema.
         └─ Returns validated `EditorCommand[]`.
  │
  ▼
Command Executor (`commandExecutor.ts`)
  └─ Mutates `Project` state (splits segments, pushes annotations/transitions/zooms).
  └─ Appends changes to Undo/Redo history stack and saves to DB.
```

### 3.4. Rendering & Export Pipeline (`videoExporter.ts` & `gifEncoder.ts`)
1. **Source Synchronization**: Asynchronously steps through the video timeline using `seekVideoElement` to decode exact video frames.
2. **Canvas Layering**:
   - Background canvas fill.
   - Transition slide rendering (if active at timestamp).
   - Camera zoom/pan affine transform matrix (`calculateZoomTransformAtTime`).
   - HTML5 video frame draw (`drawImage`).
   - Cursor click animations (ripples/pulses).
   - Text annotations & callout speech bubbles.
3. **Audio Synthesis & Mixing**: Synthesizes algorithmic music via `OfflineAudioContext`, routes to `MediaStreamAudioDestinationNode`, and merges with video canvas stream.
4. **Encoding**:
   - **Video**: Streamed into browser `MediaRecorder` at user-selected bitrate and resolution.
   - **GIF**: Decoded into raw `ImageData` frames, quantized via Median-Cut palette extraction (256 colors per frame), dithered with Floyd-Steinberg error diffusion, and compressed using LZW.

---

## 4. Configuration & Settings

- **Server Port**: Configured to run on port `3000` (`0.0.0.0`) with Express and Vite middleware.
- **Environment Variables**:
  - `GEMINI_API_KEY`: Required for server-side AI command interpretation via `@google/genai`.
- **Project Settings Model**:
  - `width` / `height`: Canvas base resolution (default 1280x720 or custom crop dimensions).
  - `fps`: Target frame rate (default 30 fps, GIF export 15-20 fps).
- **Auto-Zoom Settings**:
  - `defaultZoomLevel`: Scale factor (1.2x to 2.5x).
  - `zoomDuration`: Speed presets (`fast`, `normal`, `slow`, `custom`).
  - `zoomStyle`: Easing curve (`smooth`, `ease`, `cinematic`, `subtle`).
  - `zoomBackOut`: Zoom exit behavior (`immediate`, `delay`, `keep`).

---

## 5. Status of Features: Complete, Incomplete, & Experimental

### ✅ Fully Implemented & Functional:
- Screen, window, tab, and custom cropped area recording.
- Multi-tier IndexedDB + in-memory project persistence.
- ScreenToGif-style frame-based slide strip with multi-selection and frame removal.
- Intelligent automatic zoom generation and manual zoom event editing.
- Click ripple animations with multiple visual styles.
- Text annotations with multiple box styles and animations.
- Transition and title cards with full typography and gradient customization.
- Synthesized Web Audio background music generation and volume mixing.
- Exporting to MP4, WebM, and GIF (with custom Median-Cut / Floyd-Steinberg dithering).
- Canva-style Graphics Editor for intros, outros, thumbnails, and social video reformatting.
- AI Assistant with deterministic local parsing and Gemini 3.6 Flash backend integration.
- Undo/Redo history stack in the editor.
- Sample demo project generators (SaaS, API, E-commerce).

### ⚠️ Partially Implemented / Experimental / Areas for Future Work:
- **Chrome Extension (`src/lib/extensionManifest.ts`)**: The source code strings for Manifest V3 background service worker and content script exist in the codebase, but there is currently no user interface button on the Home Screen to download or package the extension files as a `.zip`.
- **Audio Upload File Duration Trimming**: Uploaded MP3/WAV audio files play as whole tracks; individual waveform trim handles for external audio files are not yet fully exposed in the audio panel.
- **Multi-Video Track Merging**: The timeline currently supports trimming and slicing a single primary recording stream with inserted graphic transition slides; importing and concatenating multiple distinct video files onto a multi-layer video track is not yet implemented.
