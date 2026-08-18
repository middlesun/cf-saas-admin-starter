import { Project } from '../types';

const DB_NAME = 'AppDemoCreatorDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const META_STORAGE_KEY = 'AppDemoCreator_projects_meta';

// In-memory project cache so recordings and edits are never lost even if IndexedDB fails or lags
const inMemoryProjectsCache = new Map<string, Project>();

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    } catch (err) {
      reject(err);
    }
  });
}

function syncLocalStorageMeta() {
  try {
    const metaList: Array<Omit<Project, 'sourceVideoBlob' | 'sourceVideoBlobUrl'>> = [];
    inMemoryProjectsCache.forEach((p) => {
      const copy = { ...p };
      delete copy.sourceVideoBlob;
      delete copy.sourceVideoBlobUrl;
      metaList.push(copy);
    });
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(metaList));
  } catch {
    // Ignore localStorage quota errors
  }
}

export async function saveProject(project: Project): Promise<void> {
  // 1. Immediately cache in memory
  inMemoryProjectsCache.set(project.id, { ...project });
  syncLocalStorageMeta();

  // 2. Persist to IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);

      const projectToSave = { ...project };
      delete projectToSave.sourceVideoBlobUrl;

      const request = store.put(projectToSave);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        // If storing with Blob failed (e.g. quota or clone error), try without Blob
        try {
          delete projectToSave.sourceVideoBlob;
          const retryRequest = store.put(projectToSave);
          retryRequest.onsuccess = () => resolve();
          retryRequest.onerror = () => resolve(); // Don't throw, in-memory is safe
        } catch {
          resolve();
        }
      };
      tx.onabort = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    console.warn('IndexedDB save warning (in-memory cached):', e);
  }
}

export async function getProject(id: string): Promise<Project | null> {
  // Check in-memory cache first
  const cached = inMemoryProjectsCache.get(id);
  if (cached) {
    if (cached.sourceVideoBlob && !cached.sourceVideoBlobUrl) {
      cached.sourceVideoBlobUrl = URL.createObjectURL(cached.sourceVideoBlob);
    }
    return cached;
  }

  try {
    const db = await openDB();
    const project = await new Promise<Project | null>((resolve) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.get(id);

      request.onsuccess = () => {
        const res = (request.result as Project) || null;
        if (res && res.sourceVideoBlob) {
          res.sourceVideoBlobUrl = URL.createObjectURL(res.sourceVideoBlob);
        }
        resolve(res);
      };
      request.onerror = () => resolve(null);
    });

    if (project) {
      inMemoryProjectsCache.set(project.id, project);
      return project;
    }
  } catch (e) {
    console.warn('IndexedDB get error:', e);
  }

  return null;
}

export async function getAllProjects(): Promise<Project[]> {
  const projectMap = new Map<string, Project>();

  // Add in-memory items first
  inMemoryProjectsCache.forEach((p, id) => {
    if (p.sourceVideoBlob && !p.sourceVideoBlobUrl) {
      p.sourceVideoBlobUrl = URL.createObjectURL(p.sourceVideoBlob);
    }
    projectMap.set(id, p);
  });

  // Query IndexedDB and merge
  try {
    const db = await openDB();
    const dbProjects = await new Promise<Project[]>((resolve) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const list = (request.result as Project[]) || [];
        resolve(list);
      };
      request.onerror = () => resolve([]);
    });

    dbProjects.forEach((p) => {
      if (p.sourceVideoBlob && !p.sourceVideoBlobUrl) {
        p.sourceVideoBlobUrl = URL.createObjectURL(p.sourceVideoBlob);
      }
      // If not already in map or DB version is newer
      const existing = projectMap.get(p.id);
      if (!existing || (p.updatedAt && p.updatedAt > (existing.updatedAt || 0))) {
        projectMap.set(p.id, p);
        inMemoryProjectsCache.set(p.id, p);
      }
    });
  } catch (e) {
    console.warn('IndexedDB getAll warning:', e);
  }

  // Check localStorage meta if still empty
  if (projectMap.size === 0) {
    try {
      const raw = localStorage.getItem(META_STORAGE_KEY);
      if (raw) {
        const metaList = JSON.parse(raw) as Project[];
        metaList.forEach((m) => {
          projectMap.set(m.id, m);
          inMemoryProjectsCache.set(m.id, m);
        });
      }
    } catch {
      // Ignore
    }
  }

  const results = Array.from(projectMap.values());
  results.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return results;
}

export async function deleteProject(id: string): Promise<void> {
  inMemoryProjectsCache.delete(id);
  syncLocalStorageMeta();

  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch (e) {
    console.warn('IndexedDB delete error:', e);
  }
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
