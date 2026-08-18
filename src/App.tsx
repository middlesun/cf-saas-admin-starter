import React, { useState, useEffect } from 'react';
import { Project, GraphicTemplate, SlideType, TransitionCard } from './types';
import { getAllProjects, saveProject, deleteProject, duplicateProject } from './lib/db';
import { createSampleDemoProject } from './lib/demoVideoGenerator';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { RecorderModal } from './components/RecorderModal';
import { EditorView } from './components/Editor/EditorView';
import { GraphicsEditorModal } from './components/Graphics/GraphicsEditorModal';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isRecorderOpen, setIsRecorderOpen] = useState<boolean>(false);
  const [isGeneratingSample, setIsGeneratingSample] = useState<boolean>(false);
  const [isGraphicsCreatorOpen, setIsGraphicsCreatorOpen] = useState<boolean>(false);

  // Load stored projects from IndexedDB on startup
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const stored = await getAllProjects();
      setProjects(stored);
    } catch (e) {
      console.error('Failed to load projects from IndexedDB:', e);
    }
  };

  const activeProject = projects.find((p) => p.id === selectedProjectId) || null;

  // Handle Add Graphic Intro/Outro directly to Project Timeline
  const handleAddGraphicToTimeline = (template: GraphicTemplate, slideType: SlideType) => {
    if (!activeProject) return;

    const mainTitle = template.elements.find((el) => el.type === 'text')?.content || template.name;
    const subTitle = template.elements.filter((el) => el.type === 'text')[1]?.content || '';

    const newSlide: TransitionCard = {
      id: `slide_graphic_${Date.now()}`,
      title: mainTitle,
      subtitle: subTitle,
      style: 'saas',
      timestamp: slideType === 'intro' ? 0 : activeProject.duration,
      duration: 3.5,
      bgColor: '#0f172a',
      textColor: '#ffffff',
      fontSize: 36,
      alignment: 'center',
      slideType,
      templateId: template.id,
      headline: mainTitle,
      description: subTitle,
      bgType: template.background.type === 'gradient' ? 'gradient' : 'solid',
    };

    const updatedProject = {
      ...activeProject,
      transitions: [...activeProject.transitions, newSlide],
      updatedAt: Date.now(),
    };

    handleUpdateProject(updatedProject);
    saveProject(updatedProject);
    setIsGraphicsCreatorOpen(false);
  };

  // Handle Finish Recording -> Save and open Editor
  const handleFinishRecording = async (newProject: Project) => {
    setIsRecorderOpen(false);
    setProjects((prev) => [newProject, ...prev.filter((p) => p.id !== newProject.id)]);
    setSelectedProjectId(newProject.id);
    try {
      await saveProject(newProject);
      await loadProjects();
    } catch (err) {
      console.error('Failed to persist new recording:', err);
    }
  };

  // Create Sample Demo Project Template
  const handleCreateSampleProject = async (template: 'saas' | 'api' | 'ecom') => {
    setIsGeneratingSample(true);
    try {
      const sample = await createSampleDemoProject(template);
      setProjects((prev) => [sample, ...prev.filter((p) => p.id !== sample.id)]);
      setSelectedProjectId(sample.id);
      await saveProject(sample);
      await loadProjects();
    } catch (e) {
      console.error('Failed to create sample demo project:', e);
    } finally {
      setIsGeneratingSample(false);
    }
  };

  // Import Video File (MP4 / WebM / MOV)
  const handleImportVideo = async (file: File) => {
    const videoUrl = URL.createObjectURL(file);
    const videoEl = document.createElement('video');
    videoEl.src = videoUrl;

    videoEl.onloadedmetadata = async () => {
      const duration = Math.max(1, Math.round(videoEl.duration || 10));

      const newProject: Project = {
        id: 'proj_import_' + Date.now(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sourceVideoBlob: file,
        sourceVideoBlobUrl: videoUrl,
        duration,
        videoSegments: [
          {
            id: 'seg_1',
            startTime: 0,
            endTime: duration,
            speed: 1.0,
          },
        ],
        clickAnimations: [],
        annotations: [],
        transitions: [],
        audioTracks: [],
        settings: {
          width: videoEl.videoWidth || 1280,
          height: videoEl.videoHeight || 720,
          fps: 30,
        },
      };

      setProjects((prev) => [newProject, ...prev.filter((p) => p.id !== newProject.id)]);
      setSelectedProjectId(newProject.id);
      try {
        await saveProject(newProject);
        await loadProjects();
      } catch (err) {
        console.error('Failed to save imported video:', err);
      }
    };
  };

  const handleDuplicate = async (id: string) => {
    const duplicated = await duplicateProject(id);
    if (duplicated) {
      await loadProjects();
    }
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    if (selectedProjectId === id) setSelectedProjectId(null);
    await loadProjects();
  };

  const handleDeleteProjects = async (ids: string[]) => {
    for (const id of ids) {
      await deleteProject(id);
      if (selectedProjectId === id) setSelectedProjectId(null);
    }
    await loadProjects();
  };

  const handleUpdateProject = (updated: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Header Bar */}
      <Header
        onNewRecording={() => setIsRecorderOpen(true)}
        onGoHome={() => setSelectedProjectId(null)}
        currentView={activeProject ? 'editor' : 'home'}
        projectName={activeProject?.name}
        onOpenGraphicsCreator={() => setIsGraphicsCreatorOpen(true)}
      />

      {/* Main Screen View */}
      <main className="flex-1">
        {activeProject ? (
          <EditorView
            key={activeProject.id}
            project={activeProject}
            onUpdateProject={handleUpdateProject}
            onGoHome={() => setSelectedProjectId(null)}
          />
        ) : (
          <HomeScreen
            projects={projects}
            onSelectProject={(id) => setSelectedProjectId(id)}
            onNewRecording={() => setIsRecorderOpen(true)}
            onImportVideo={handleImportVideo}
            onCreateSampleProject={handleCreateSampleProject}
            onDuplicateProject={handleDuplicate}
            onDeleteProject={handleDelete}
            onDeleteProjects={handleDeleteProjects}
            isGeneratingSample={isGeneratingSample}
          />
        )}
      </main>

      {/* Screen & Tab Recorder Modal */}
      <RecorderModal
        isOpen={isRecorderOpen}
        onClose={() => setIsRecorderOpen(false)}
        onFinishRecording={handleFinishRecording}
      />

      {/* Canva Graphics Creator & Social Video Reformatter */}
      <GraphicsEditorModal
        isOpen={isGraphicsCreatorOpen}
        onClose={() => setIsGraphicsCreatorOpen(false)}
        onGoHome={() => setSelectedProjectId(null)}
        activeProject={activeProject}
        onAddIntroOutroToTimeline={handleAddGraphicToTimeline}
      />
    </div>
  );
}

