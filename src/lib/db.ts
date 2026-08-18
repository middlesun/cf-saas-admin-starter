import { Project } from '../types';

const DB_NAME = 'AppDemoCreatorDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProject(project: Project): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);

    // Prepare object for storage (Blobs can be stored in IndexedDB)
    const projectToSave = { ...project };
    // We don't store transient object URLs in DB
    delete projectToSave.sourceVideoBlobUrl;

    const request = store.put(projectToSave);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const request = store.get(id);

    request.onsuccess = () => {
      const project = request.result as Project | undefined;
      if (!project) {
        resolve(null);
        return;
      }
      // Re-create Blob URL if Blob exists
      if (project.sourceVideoBlob) {
        project.sourceVideoBlobUrl = URL.createObjectURL(project.sourceVideoBlob);
      }
      resolve(project);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAllProjects(): Promise<Project[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const request = store.getAll();

    request.onsuccess = () => {
      const projects = (request.result as Project[]) || [];
      projects.forEach((p) => {
        if (p.sourceVideoBlob) {
          p.sourceVideoBlobUrl = URL.createObjectURL(p.sourceVideoBlob);
        }
      });
      // Sort newest first
      projects.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(projects);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function duplicateProject(id: string): Promise<Project | null> {
  const existing = await getProject(id);
  if (!existing) return null;

  const newId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const duplicated: Project = {
    ...existing,
    id: newId,
    name: `${existing.name} (Copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await saveProject(duplicated);
  return getProject(newId);
}
