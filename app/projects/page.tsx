"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteProject, loadProjects, upsertProject } from "@/lib/projects";
import type { Project } from "@/lib/types";

function formatUpdatedAt(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const minutes = Math.round((now - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    setProjects(loadProjects());
  }, []);

  const handleOpen = (projectId: string) => {
    router.push(`/studio?project=${encodeURIComponent(projectId)}`);
  };

  const handleDelete = (projectId: string) => {
    const next = deleteProject(projectId);
    setProjects(next);
  };

  const startRename = (project: Project) => {
    setEditingId(project.id);
    setEditingName(project.name);
  };

  const commitRename = () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const target = projects.find((project) => project.id === editingId);
    if (!target) {
      setEditingId(null);
      return;
    }
    const updatedProject: Project = { ...target, name: trimmed };
    const next = upsertProject(updatedProject);
    setProjects(next);
    setEditingId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName("");
  };

  return (
    <main className="shell flex flex-col gap-8 py-8 md:gap-10 md:py-10">
      <header className="glass rounded-[32px] p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="pill text-sm font-medium">Projects</div>
            <h1 className="section-title mt-3">Your recent AppBrandKit AI projects</h1>
            <p className="mt-3 max-w-2xl text-sm text-[color:var(--muted)]">
              Each project captures your brief, provider settings, icon, ASO frames, and generated screenshots.
              Open a project to continue where you left off, or tidy up older explorations.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/studio" className="btn-primary">
              Open Studio
            </Link>
            <Link href="/" className="btn-ghost">
              Back to landing
            </Link>
          </div>
        </div>
      </header>

      {projects.length === 0 ? (
        <section className="glass rounded-[28px] p-6 md:p-8">
          <h2 className="text-lg font-semibold tracking-tight">No projects yet</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Projects are created automatically as you work in the Studio. Start a new concept and it will appear here
            once you generate or refine anything meaningful.
          </p>
          <div className="mt-4">
            <Link href="/studio" className="btn-primary">
              Start in Studio
            </Link>
          </div>
        </section>
      ) : (
        <section className="grid gap-4">
          {projects.map((project) => (
            <article
              key={project.id}
              className="surface flex flex-col gap-4 rounded-[24px] p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex-1">
                {editingId === project.id ? (
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitRename();
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelRename();
                        }
                      }}
                      className="input-shell w-full rounded-full md:max-w-md"
                    />
                    <div className="flex gap-2 md:ml-3">
                      <button className="btn-primary px-3 py-1 text-xs" type="button" onMouseDown={commitRename}>
                        Save
                      </button>
                      <button className="btn-ghost px-3 py-1 text-xs" type="button" onMouseDown={cancelRename}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-base font-semibold tracking-tight">{project.name}</h2>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">
                      Updated {formatUpdatedAt(project.updatedAt)}
                    </p>
                  </>
                )}
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  {project.form.appName || project.form.prompt || "Untitled concept"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-primary px-4 py-2 text-sm"
                  onClick={() => handleOpen(project.id)}
                >
                  Open in Studio
                </button>
                <button
                  type="button"
                  className="btn-ghost px-4 py-2 text-sm"
                  onClick={() => startRename(project)}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="btn-ghost px-4 py-2 text-sm text-red-700"
                  onClick={() => handleDelete(project.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
