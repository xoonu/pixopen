import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createProject,
  createProjectFromTemplate,
  generateUniqueProjectName,
  normalizeProject,
  normalizeProjectName,
  type Project,
  type SavedDevice,
} from '@pixopen/core';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');

export async function ensureDataDirs() {
  await mkdir(PROJECTS_DIR, { recursive: true });
}

export async function loadDevices(): Promise<SavedDevice[]> {
  try {
    const raw = await readFile(DEVICES_FILE, 'utf8');
    return JSON.parse(raw) as SavedDevice[];
  } catch {
    return [];
  }
}

export async function saveDevices(devices: SavedDevice[]) {
  await ensureDataDirs();
  await writeFile(DEVICES_FILE, JSON.stringify(devices, null, 2));
}

export async function listProjects(): Promise<Project[]> {
  await ensureDataDirs();
  const files = await readdir(PROJECTS_DIR);
  const projects: Project[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const raw = await readFile(path.join(PROJECTS_DIR, file), 'utf8');
    projects.push(normalizeProject(JSON.parse(raw) as Project));
  }
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    const raw = await readFile(path.join(PROJECTS_DIR, `${id}.json`), 'utf8');
    return normalizeProject(JSON.parse(raw) as Project);
  } catch {
    return null;
  }
}

export async function saveProject(project: Project) {
  await ensureDataDirs();
  project.updatedAt = new Date().toISOString();
  await writeFile(path.join(PROJECTS_DIR, `${project.id}.json`), JSON.stringify(project, null, 2));
}

export async function deleteProject(id: string) {
  const { unlink } = await import('node:fs/promises');
  try {
    await unlink(path.join(PROJECTS_DIR, `${id}.json`));
  } catch {
    // ignore
  }
}

export async function duplicateProject(id: string, requestedName?: string): Promise<Project | null> {
  const source = await getProject(id);
  if (!source) return null;

  const all = await listProjects();
  const name = generateUniqueProjectName(
    all.map((p) => p.name),
    requestedName ?? `${source.name} Copy`,
  );

  const now = new Date().toISOString();
  const copy: Project = {
    ...source,
    id: crypto.randomUUID(),
    name,
    templateId: source.templateId,
    appConfig: { ...source.appConfig },
    frames: source.frames.map((frame) => ({
      ...frame,
      pixels: [...frame.pixels],
    })),
    liveAreas: source.liveAreas.map((area) => ({
      ...area,
      id: crypto.randomUUID(),
    })),
    createdAt: now,
    updatedAt: now,
  };

  await saveProject(copy);
  return copy;
}
