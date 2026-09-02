# Changelog — SAAS Demo Creator

All notable changes, implemented capabilities, and milestone enhancements for the **SAAS Demo Creator** project are documented below.

> **Note on Versioning & History**: The project environment operates without a git commit history repository. The entries below represent verified implementations, architectural improvements, and milestone updates identified directly from the codebase.

---

## [Studio Engine v2.1] — Resilient Hardware Codec Probing & Universal Fallback

### Bug Fix: WebCodecs `OperationError: Encoder creation error`
- **Resolution-Aware Profile & Level Probing**: Fixed an issue where 4K Level 5.2 (`avc1.640034`) was queried for 1080p exports, causing Windows MFT / GPU drivers to reject encoder initialization. Profiles are now strictly resolution-scoped (`avc1.4d002a` and `avc1.64002a` for 1080p60, `avc1.640033` for 4K).
- **Latency Mode Elimination**: Removed `latencyMode: 'quality'` which caused Chromium's hardware Media Foundation H.264 wrapper on Windows to fail during encoder creation.
- **Auto-Retry Across Acceleration Modes**: Added an automated multi-candidate verification loop testing `hardwareAcceleration: 'no-preference'` followed by software fallback (`prefer-software`) with micro-tick verification to catch asynchronous driver creation faults before frame rendering starts.
- **Universal MediaRecorder Failover**: Implemented a fail-safe fallback engine that automatically transitions to the canvas-stream capture pipeline if a user's system has restrictive GPU policies or disabled hardware encoders, guaranteeing 100% export reliability without user-facing failures.

---

## [Studio Engine v2] — Studio-Grade Deterministic WebCodecs Export Engine (Phases 1 & 2)

### Deterministic Hardware Video Pipeline (Phase 1)
- **Native WebCodecs VideoEncoder & VideoFrame Integration**: Replaced legacy real-time `MediaRecorder` stream-capture with a frame-locked, deterministic `VideoEncoder` pipeline (`src/lib/videoExporter.ts`).
  - **Zero Dropped Frames**: Every frame is rendered and encoded individually with microsecond-accurate Presentation Timestamps (PTS), guaranteeing silky smooth 60 FPS zooms and pans.
  - **Hardware Codec Level Probing**: Implemented adaptive hardware encoder configuration probing across AVC/H.264 High Profile levels (`avc1.640034` for 4K UHD, `avc1.64002a` for 1080p60, down to `avc1.640028`), ensuring optimal GPU acceleration.
  - **Studio Bitrate Scaling**: Elevated encoding bitrates to 24–40 Mbps (up to 88 Mbps for 4K UHD) to eliminate compression noise, macroblocking, and color banding around small UI text, syntax highlighting, and dark mode borders.
  - **Hardware Backpressure Flow Control**: Added `videoEncoder.encodeQueueSize` backpressure throttling to prevent memory spikes and ensure reliable hardware GPU frame processing.
  - **Sub-Pixel Image Smoothing**: Enforced `imageSmoothingQuality = 'high'` on video frame compositions, preventing resampling blur during dynamic camera zooms.

### Synchronous Audio Multiplexing & Live Telemetry HUD (Phase 2)
- **Deterministic 48kHz Stereo Audio Mixdown (`mixProjectAudio`)**:
  - Implemented an `OfflineAudioContext` audio processing graph running at 48,000 Hz.
  - Mixes cut and speed-adjusted source video audio segments, background music tracks (synthesized or user-uploaded with volume ramps and fade-in/out envelopes), and synthesized click sound effects.
- **WebCodecs AudioEncoder Integration**:
  - Encodes planar 32-bit float audio (`f32-planar`) directly into AAC-LC (`mp4a.40.2`) at 192 kbps for MP4 and Opus (`A_OPUS`) for WebM.
  - Synchronizes audio chunks with video frames to eliminate audio drift and desync across any duration.
- **In-Memory MP4 Fast Start**:
  - Upgraded `mp4-muxer` configuration with `fastStart: 'in-memory'` and `firstTimestampBehavior: 'strict'`, placing the `moov` atom at the beginning of the file so exported videos stream immediately on web players and social media without buffering.
- **Real-Time Hardware Telemetry Bar (`ExportModal.tsx`)**:
  - Replaced static progress indicators with a live HUD showing current frame / total frames, framerate (FPS), active bitrate (Mbps), audio track status (48kHz Stereo), and remaining time calculation.

---

## [Current Release] — Core Studio & Persistence Updates

### Data Persistence & Storage Architecture
- **Multi-Tier Persistence Engine**: Implemented a 3-tiered persistence system in `src/lib/db.ts`:
  - **In-Memory Cache**: Immediate in-memory `Map` caching for zero-latency project retrieval and safe `Blob` reference preservation during active editing.
  - **IndexedDB**: Persistent asynchronous storage (`AppDemoCreatorDB`) storing project models and binary video blobs.
  - **LocalStorage Metadata Fallback**: Automatic synchronization of lightweight project metadata to guarantee project lists survive browser refreshes or sandboxed storage restrictions.
- **Immediate State Synchronization**: Synchronized project state dispatch in `App.tsx` prior to async database commits to eliminate UI/database desync during screen recordings and project imports.

### Screen & Video Recording
- **Recording Buffer Flushing**: Enhanced `RecorderModal.tsx` to explicitly invoke `mediaRecorder.requestData()` before stopping, ensuring all trailing video chunks are flushed and preventing data loss.
- **Race Condition Prevention**: Added teardown lifecycle guards (`isStoppingRef`) to prevent recorder race conditions during rapid start/stop sequences.
- **Custom Area Cropping**: Added interactive selection overlay with live canvas stream cropping (`cropCanvas.captureStream`).
- **Simulated Recording Sandbox**: Added interactive canvas sandbox mode for zero-permission testing of recording, clicking, and scoring interactions.

### Frame-Based & Dual-Mode Editing
- **Dual Editing Modes**: Introduced **Quick Mode** (streamlined, frame-centric workflow for rapid GIF/social creation) and **Pro Studio Mode** (multi-track timeline with advanced tool panels) in `EditorView.tsx`.
- **Frame Slide Strip (`FrameSlideStrip.tsx`)**: Created a millisecond-precision frame thumbnail strip inspired by ScreenToGif:
  - Multi-frame selection (`Ctrl+Click`) and continuous range selection (`Shift+Click`).
  - Frame deletion translating directly into video segment splits and trims.
  - Real-time thumbnail rendering caching with dynamic playhead tracking.
  - Adjustable frame rates (10, 15, 20, 30 FPS) and zoom level scaling (50%–150%).
- **Layout Alignment**: Positioned the `FrameSlideStrip` directly beneath the video preview in both Quick and Pro modes.

### AI Natural Language Video Editor
- **Hybrid Intent Architecture**: Implemented a 2-step AI execution pipeline in `src/lib/aiEditor/`:
  - **Deterministic Local Parser (`localParser.ts`)**: Fast regex parser for instant, zero-cost recognition of common commands (trimming, text insertion, transitions, music).
  - **Gemini 3.6 Flash Server Integration (`server.ts` & `aiService.ts`)**: Structured JSON schema proxy interpreting complex instructions with automatic fallback.
- **AI Command Execution Engine (`commandExecutor.ts`)**: Executes structured edits across video segments, text annotations, slide transitions, zoom events, and audio tracks with automatic Undo/Redo registration.

### Video Rendering & GIF Export Engine
- **High-Fidelity GIF89a Encoder (`gifEncoder.ts`)**: Implemented a pure-TypeScript GIF encoder featuring:
  - Median-Cut color quantization for crisp text and sharp UI edges.
  - Perceptual Redmean color distance calculation.
  - Floyd-Steinberg error-diffusion dithering for smooth gradients.
  - Per-frame local color tables (256 colors per frame) for optimal cross-transition fidelity.
  - LZW compression with infinite looping (Netscape 2.0 extension).
- **Composite Video Exporter (`videoExporter.ts`)**: Frame-by-frame offscreen canvas renderer compositing video frames, dynamic camera zoom/pan transformations, active click animations, and animated text callouts.
- **Audio Mixing & Synthesis**: Algorithmic Web Audio generation (Upbeat, Ambient, Lo-Fi) integrated directly into exported MP4/WebM video streams via `MediaStreamAudioDestinationNode`.
- **Export Management (`ExportModal.tsx`)**: Modal supporting custom resolution presets (720p, 1080p, 4K), format selection (MP4, WebM, GIF), bitrate controls, and persistent settings access.

### Canva Graphics Creator & Social Reformatter
- **Graphics Designer Modal (`GraphicsEditorModal.tsx`)**: Built-in multi-layer canvas editor for creating thumbnails, intro/outro slides, and social banners across 16:9, 1:1, and 9:16 aspect ratios.
- **Social Video Reformatter**: Automatically reformats 16:9 video projects into vertical (9:16) and square (1:1) clips with blurred video framing and customizable header/footer banners for TikTok, Instagram Reels, YouTube Shorts, and LinkedIn.
- **Timeline Slide Insertion**: Direct action to insert designed graphics into the video timeline as transition cards.

---

## [Initial Architecture] — Foundational Features

### Project & Asset Management
- **Home Dashboard (`HomeScreen.tsx`)**: Project listing with thumbnail previews, duration indicators, duplication, single/batch deletion, and sample project generator for SaaS, API, and E-commerce templates.
- **External Video Import**: Drag-and-drop or file picker import for `.mp4`, `.webm`, and `.mov` video files.

### Interactive Visual Effects
- **Smart Auto-Zoom Engine (`zoomSystem.ts`)**: Automatic clustering of recorded mouse clicks to generate smooth camera focal zooms with configurable easing curves (`smooth`, `ease`, `cinematic`, `subtle`).
- **Click Animations (`ClickPanel.tsx`)**: 5 customizable click animation styles (`ripple`, `highlight`, `pulse`, `spotlight`, `cursor`).
- **Text Callouts (`AnnotationPanel.tsx`)**: 5 annotation box styles with directional pointers and 5 entrance animations (`fade`, `slide`, `pop`, `typewriter`, `expand`).
- **Slide Templates (`templates.ts`)**: 8 categories of pre-built intro/outro slide cards with gradient backgrounds, logos, and profile cards.
