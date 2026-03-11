# AppBrandKit AI – Phase 1: Projects & Persistence

## Goal
Introduce a lightweight **Project** system in the Studio so users can:
- Capture a full branding session (brief, icon, screenshots, narrative).
- Persist and reopen recent projects locally (no backend/auth yet).
- Switch, create, and duplicate projects from within the Studio UI.

This should feel like a thin layer on top of the existing Studio experience, not a redesign.

## Data Model

Add a `Project` type to `lib/types.ts`:

```ts
export type Project = {
  id: string;            // uuid or timestamp-based
  name: string;          // e.g. "My App", "Untitled project", etc.
  createdAt: string;     // ISO timestamp
  updatedAt: string;     // ISO timestamp
  form: StudioForm;      // existing studio brief fields
  iconSrc: string | null;// icon data URL or remote URL
  mockups: MockupVariant[];      // generated screenshot variants
  slideFrames: EditableAsoFrame[]; // ASO narrative frames for current run
  provider: AIProvider;  // active provider (OpenAI/Gemini/Anthropic) – no API keys
};
```

Notes:
- `brand` can be recomputed from `form` via `deriveBrandSuggestion`, so it does **not** need to be stored.
- Do **not** persist API keys; we only store the selected provider.

## Persistence Implementation

Create `lib/projects.ts` with a tiny localStorage-backed persistence layer.

- Storage key: `"appbrandkit-projects"`.
- Functions:

```ts
export function loadProjects(): Project[];
export function saveProjects(projects: Project[]): void;
export function upsertProject(project: Project, maxProjects = 8): Project[];
export function deleteProject(id: string): Project[];
```

Behaviour:
- `loadProjects`:
  - Read from localStorage.
  - On JSON parse errors or invalid data, return `[]` and clear the bad value.
- `saveProjects`:
  - Overwrite the full array in localStorage (no incremental writes).
- `upsertProject`:
  - If `project.id` exists, replace it and update `updatedAt` to now.
  - If it doesn’t exist, insert at the front with `createdAt`/`updatedAt` set if missing.
  - Truncate to `maxProjects` most recent projects by `updatedAt`.
- `deleteProject`:
  - Remove the project with the given `id` and persist the new list.

## Wiring into `StudioClient`

File: `components/studio/studio-client.tsx`.

### State additions

Add React state for:
- `projects: Project[]`
- `currentProjectId: string | null`

Derive `currentProject` via `useMemo` from these.

### Initial load

On client hydration (`useEffect`):
- Call `loadProjects()`.
- If there are existing projects:
  - Sort by `updatedAt` descending.
  - Pick the first as `currentProject`.
  - Hydrate:
    - `form` from `project.form`.
    - `iconSrc` from `project.iconSrc`.
    - `mockups` from `project.mockups`.
    - `slideFrames` from `project.slideFrames`.
    - `provider` from `project.provider`.

If there are no projects yet:
- Keep the current `defaultForm` and null-ish state until the user starts interacting.

### Creating the first project

We don’t want to create empty projects for every visitor. Instead:
- When the user:
  - Enters a non-empty prompt (`form.prompt.trim().length > 0`), or
  - Successfully generates an icon or screenshot set,
- If `currentProjectId` is `null`, create a new `Project` with:
  - `id`: generated (e.g. `crypto.randomUUID()` when available, fallback to timestamp).
  - `name`: `form.appName || "Untitled project"`.
  - `createdAt`/`updatedAt`: now.
  - Current `form`, `iconSrc`, `mockups`, `slideFrames`, `provider`.
- Save via `upsertProject` and update `projects` + `currentProjectId` in state.

### Autosave behaviour

Whenever the active project changes meaningfully, we should persist it.

Candidate triggers:
- `form` changes (debounced).
- `iconSrc` changes (after icon generation).
- `mockups` or `slideFrames` change (after screenshot generation or edits).

Implementation sketch:
- Use a `useEffect` that depends on `[currentProjectId, form, iconSrc, mockups, slideFrames, provider]`.
- Inside, if `currentProjectId` is non-null:
  - Build a `Project` object from current state.
  - Use a simple debounce (e.g. `setTimeout` + clear) to avoid writing on every keystroke.
  - Call `upsertProject` and update `projects` state with the returned array.

### Project operations

Implement helpers in `StudioClient`:

- `handleNewProject()`:
  - Reset `form` to `defaultForm`.
  - Clear `iconSrc`, `mockups`, `slideFrames`.
  - Create a new `Project` with `name = "Untitled project"` (or `"Untitled project N"`).
  - Set as current via `currentProjectId` and `projects` state.

- `handleDuplicateProject()`:
  - If no `currentProject`, return.
  - Clone current project with new `id`, `name = current.name + " Copy"`, `createdAt`/`updatedAt` = now.
  - Insert via `upsertProject` and set as current.

- `handleSelectProject(id: string)`:
  - Find the project by `id`.
  - Set `currentProjectId` and hydrate `form`, `iconSrc`, `mockups`, `slideFrames`, `provider` from it.

- (Optional later) `handleDeleteProject(id: string)`:
  - Use `deleteProject` and adjust selection if the active project is deleted.

## UI – Project Switcher

Where: in the Studio header at the top of `StudioClient` (inside the existing shell header).

Design constraints:
- Use existing utility classes: `btn-ghost`, `btn-primary`, `surface`, rounded corners.
- Keep it compact; this is a secondary control, not the main CTA.

Behaviour:
- Show current project name, e.g. a pill/button:
  - "Project: My App" (clickable).
- On click: open a simple dropdown/list overlay with:
  - A list of recent projects (sorted by `updatedAt`):
    - Each item shows `name` and a small timestamp (e.g. "Updated 2h ago").
    - Clicking switches to that project.
  - Actions:
    - "New project" → `handleNewProject()`.
    - "Duplicate current" → `handleDuplicateProject()`.

We can implement this with simple conditional rendering (no extra dependencies):
- Local `isProjectMenuOpen` state.
- A `div` with `absolute` positioning and a small card-like appearance (`surface`, `rounded-2xl`, etc.).

## README.md Update

Add a short section describing Projects:

```md
### Projects (local persistence)

The Studio now supports lightweight **Projects**:

- Your prompt, brief, icon, and generated screenshot set are stored locally as a project.
- Recent projects (up to ~8) are saved in your browser using `localStorage`.
- Use the project switcher in the Studio header to:
  - Create a new project
  - Duplicate the current project
  - Switch between recent projects

No backend or authentication is required; all project data stays in your browser.
```

This completes Phase 1: a local-only, project-centric Studio UX without introducing server complexity.