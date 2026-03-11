import type { Project } from "@/lib/types";

const projectsStorageKey = "appbrandkit-projects";
const maxProjects = 8;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function sortProjects(projects: Project[]) {
  return [...projects].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}

export function loadProjects(): Project[] {
  if (!canUseStorage()) return [];

  const raw = window.localStorage.getItem(projectsStorageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      window.localStorage.removeItem(projectsStorageKey);
      return [];
    }

    return sortProjects(parsed as Project[]);
  } catch {
    window.localStorage.removeItem(projectsStorageKey);
    return [];
  }
}

export function saveProjects(projects: Project[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(projectsStorageKey, JSON.stringify(sortProjects(projects).slice(0, maxProjects)));
}

export function upsertProject(project: Project): Project[] {
  const timestamp = new Date().toISOString();
  const nextProject = {
    ...project,
    updatedAt: timestamp
  };
  const current = loadProjects().filter((entry) => entry.id !== project.id);
  const next = sortProjects([nextProject, ...current]).slice(0, maxProjects);
  saveProjects(next);
  return next;
}

export function deleteProject(id: string): Project[] {
  const next = loadProjects().filter((project) => project.id !== id);
  saveProjects(next);
  return next;
}
