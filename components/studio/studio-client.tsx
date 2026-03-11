"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createEditableAsoNarrative, parseFeatures, regenerateAsoFrame } from "@/lib/aso";
import { deriveBrandSuggestion } from "@/lib/branding";
import { canExportBundle, canExportIcons, canExportScreenshots } from "@/lib/export";
import { loadProjects, upsertProject } from "@/lib/projects";
import { generateIconWithProvider } from "@/lib/providers";
import type {
  AIProvider,
  AsoFrame,
  EditableAsoFrame,
  IconStylePreset,
  MockupVariant,
  Project,
  ProviderConfig,
  ScreenshotStrategy,
  ScreenshotTone,
  StudioForm
} from "@/lib/types";

type StatusTone = "info" | "success" | "error";

type UploadedScreenshot = {
  id: string;
  name: string;
  dataUrl: string;
};

type StrategyTheme = {
  backgroundA: string;
  backgroundB: string;
  shell: string;
  shellStroke: string;
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
  glow: string;
};

const providerLabels: Record<AIProvider, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  anthropic: "Anthropic"
};

const iconStyleLabels: Record<IconStylePreset, string> = {
  glassy: "Glassy",
  "flat-bold": "Flat Bold",
  "3d-soft": "3D Soft"
};

const screenshotToneLabels: Record<ScreenshotTone, string> = {
  minimal: "Minimal",
  vibrant: "Vibrant",
  premium: "Premium"
};

const screenshotStrategyLabels: Record<ScreenshotStrategy, string> = {
  conversion: "Conversion",
  premium: "Premium",
  playful: "Playful"
};

const localStorageKey = "appbrandkit-byok";
const projectSaveDelayMs = 500;
const untitledProjectName = "Untitled project";

const defaultForm: StudioForm = {
  prompt: "",
  appName: "",
  tagline: "",
  targetAudience: "",
  valueProposition: "",
  features: "",
  iconStyle: "glassy",
  screenshotTone: "vibrant",
  screenshotStrategy: "conversion"
};

const starterPrompts = [
  {
    title: "Marine planning app",
    prompt:
      "A marine weather app for sailors and kite surfers. It predicts safe launch windows, wave quality, and creates simple route confidence cards.",
    appName: "TidalFlow",
    tagline: "Sail and ride with confidence.",
    targetAudience: "Sailors and kite surfers",
    valueProposition: "See the safest launch windows before you leave shore",
    features: "Live marine conditions\nRoute confidence score\nSafety alerts"
  },
  {
    title: "Creator growth assistant",
    prompt:
      "An app for creators to plan short-form content with AI hooks, posting cadence, and weekly growth insights.",
    appName: "PulseBoard",
    tagline: "Grow with a repeatable publishing system.",
    targetAudience: "Short-form creators",
    valueProposition: "Turn content chaos into a clear weekly publishing plan",
    features: "Content sprint planner\nHook library\nWeekly performance recap"
  },
  {
    title: "Family operations hub",
    prompt:
      "A shared family organizer for groceries, school tasks, routines, and reminders with a calm, premium visual style.",
    appName: "NestNote",
    tagline: "Keep family life in sync.",
    targetAudience: "Busy families",
    valueProposition: "Keep household planning calm, shared, and visible",
    features: "Shared lists\nSmart reminders\nHome timeline"
  }
];

const iphoneSize = { width: 1290, height: 2796 };
const ipadSize = { width: 2064, height: 2752 };

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

function createProjectId() {
  return globalThis.crypto?.randomUUID?.() ?? `project-${Date.now()}`;
}

function compactProjectName(value: string, maxLength = 36) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return untitledProjectName;
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trim()}…`;
}

function deriveProjectName(form: StudioForm, fallback = untitledProjectName) {
  if (form.appName.trim()) return compactProjectName(form.appName);
  if (form.prompt.trim()) return compactProjectName(form.prompt);
  return fallback;
}

function serializeProjectState(project: Pick<Project, "form" | "iconSrc" | "mockups" | "slideFrames" | "provider" | "name">) {
  return JSON.stringify(project);
}

function createProject(options: {
  provider: AIProvider;
  form?: StudioForm;
  iconSrc?: string | null;
  mockups?: MockupVariant[];
  slideFrames?: EditableAsoFrame[];
  name?: string;
}): Project {
  const now = new Date().toISOString();
  const form = options.form ?? defaultForm;

  return {
    id: createProjectId(),
    name: options.name ?? deriveProjectName(form),
    createdAt: now,
    updatedAt: now,
    form,
    iconSrc: options.iconSrc ?? null,
    mockups: options.mockups ?? [],
    slideFrames: options.slideFrames ?? [],
    provider: options.provider
  };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch?.[1] ?? "image/png";
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

function downloadUrl(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
}

async function srcToBlob(src: string): Promise<Blob> {
  if (src.startsWith("data:")) return dataUrlToBlob(src);
  const res = await fetch(src);
  if (!res.ok) throw new Error("Failed to fetch image source for export.");
  return await res.blob();
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function filesToDataUrls(files: FileList): Promise<UploadedScreenshot[]> {
  const readers = Array.from(files).map(
    (file, index) =>
      new Promise<UploadedScreenshot>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve({
            id: `${file.name}-${file.lastModified}-${index}`,
            name: file.name,
            dataUrl: typeof reader.result === "string" ? reader.result : ""
          });
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      })
  );

  return Promise.all(readers);
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3
) {
  const words = text.split(" ");
  let line = "";
  let offsetY = 0;
  let lineCount = 0;

  words.forEach((word) => {
    if (lineCount >= maxLines) {
      return;
    }

    const testLine = `${line}${word} `;
    const width = context.measureText(testLine).width;

    if (width > maxWidth && line) {
      context.fillText(line.trim(), x, y + offsetY);
      line = `${word} `;
      offsetY += lineHeight;
      lineCount += 1;
      return;
    }

    line = testLine;
  });

  if (line && lineCount < maxLines) {
    context.fillText(line.trim(), x, y + offsetY);
  }
}

function toneColors(tone: ScreenshotTone, palette: string[]) {
  const [primary, secondary, surface, text] = palette;

  if (tone === "minimal") {
    return {
      softA: "#f8fafc",
      softB: "#e2e8f0",
      overlay: "rgba(255,255,255,0.92)",
      text: "#0f172a",
      secondaryText: "#334155",
      accent: primary,
      stroke: "rgba(15,23,42,0.08)"
    };
  }

  if (tone === "premium") {
    return {
      softA: "#0f172a",
      softB: "#312e81",
      overlay: "rgba(15,23,42,0.72)",
      text: "#f8fafc",
      secondaryText: "#cbd5e1",
      accent: "#f59e0b",
      stroke: "rgba(255,255,255,0.12)"
    };
  }

  return {
    softA: primary,
    softB: secondary,
    overlay: "rgba(255,255,255,0.14)",
    text: "#ffffff",
    secondaryText: surface,
    accent: text,
    stroke: "rgba(255,255,255,0.12)"
  };
}

function buildStrategyTheme(
  strategy: ScreenshotStrategy,
  tone: ScreenshotTone,
  palette: string[]
): StrategyTheme {
  const colors = toneColors(tone, palette);

  if (strategy === "premium") {
    return {
      backgroundA: colors.softA,
      backgroundB: "#111827",
      shell: colors.overlay,
      shellStroke: colors.stroke,
      eyebrow: "Luxury flow",
      title: colors.text,
      body: colors.secondaryText,
      accent: "#f59e0b",
      glow: "rgba(245,158,11,0.22)"
    };
  }

  if (strategy === "playful") {
    return {
      backgroundA: palette[1] ?? "#60a5fa",
      backgroundB: palette[0] ?? "#1d4ed8",
      shell: "rgba(255,255,255,0.18)",
      shellStroke: "rgba(255,255,255,0.18)",
      eyebrow: "Joyful momentum",
      title: "#ffffff",
      body: "#dbeafe",
      accent: palette[2] ?? "#f97316",
      glow: "rgba(249,115,22,0.2)"
    };
  }

  return {
    backgroundA: colors.softA,
    backgroundB: colors.softB,
    shell: colors.overlay,
    shellStroke: colors.stroke,
    eyebrow: "Conversion narrative",
    title: colors.text,
    body: colors.secondaryText,
    accent: palette[2] ?? "#f97316",
    glow: "rgba(15,118,110,0.18)"
  };
}

function frameBadgeLabel(frame: AsoFrame) {
  switch (frame.id) {
    case "value-promise":
      return "VALUE";
    case "feature-one":
      return "FEATURE 1";
    case "feature-two":
      return "FEATURE 2";
    case "trust":
      return "TRUST";
    case "outcome":
      return "OUTCOME";
    case "cta":
      return "CTA";
  }
}

function frameLayoutVariant(frame: AsoFrame | EditableAsoFrame) {
  return "variant" in frame ? frame.variant % 3 : 0;
}

function mergeMockups(current: MockupVariant[], updates: MockupVariant[]) {
  const next = new Map(current.map((mockup) => [mockup.id, mockup]));

  updates.forEach((mockup) => {
    next.set(mockup.id, mockup);
  });

  return Array.from(next.values());
}

function sortMockups(mockups: MockupVariant[]) {
  const frameOrder = ["value-promise", "feature-one", "feature-two", "trust", "outcome", "cta"];
  const deviceOrder = { iphone: 0, ipad: 1 };

  return [...mockups].sort((left, right) => {
    const leftFrame = frameOrder.indexOf(left.template);
    const rightFrame = frameOrder.indexOf(right.template);

    if (leftFrame !== rightFrame) {
      return leftFrame - rightFrame;
    }

    return deviceOrder[left.device] - deviceOrder[right.device];
  });
}

function drawRoundedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.save();
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.clip();

  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  context.restore();
}

function drawFallbackScreen(
  context: CanvasRenderingContext2D,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
    theme: StrategyTheme;
    icon: HTMLImageElement | null;
    features: string[];
  }
) {
  const { x, y, width, height, radius, theme, icon, features } = options;

  context.save();
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.clip();

  const gradient = context.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, "rgba(255,255,255,0.94)");
  gradient.addColorStop(1, "rgba(255,255,255,0.72)");
  context.fillStyle = gradient;
  context.fillRect(x, y, width, height);

  context.fillStyle = "rgba(15,23,42,0.06)";
  context.beginPath();
  context.roundRect(x + width * 0.07, y + height * 0.08, width * 0.86, height * 0.2, 28);
  context.fill();

  if (icon) {
    const iconSize = Math.min(width * 0.24, 220);
    context.drawImage(icon, x + width * 0.07, y + height * 0.14, iconSize, iconSize);
  }

  context.fillStyle = "#0f172a";
  context.font = `700 ${Math.max(28, width * 0.048)}px sans-serif`;
  context.fillText("Fallback concept mode", x + width * 0.07, y + height * 0.4);

  context.font = `500 ${Math.max(20, width * 0.03)}px sans-serif`;
  context.fillStyle = "#475569";
  features.slice(0, 3).forEach((feature, index) => {
    const top = y + height * 0.5 + index * (height * 0.12);
    context.fillStyle = "rgba(15,23,42,0.07)";
    context.beginPath();
    context.roundRect(x + width * 0.07, top, width * 0.8, height * 0.085, 24);
    context.fill();
    context.fillStyle = "#334155";
    context.fillText(feature, x + width * 0.11, top + height * 0.055);
  });

  context.strokeStyle = theme.shellStroke;
  context.strokeRect(x + width * 0.68, y + height * 0.13, width * 0.18, height * 0.54);
  context.restore();
}

async function renderAsoFrame(
  canvas: HTMLCanvasElement,
  options: {
    form: StudioForm;
    frame: AsoFrame | EditableAsoFrame;
    iconSrc?: string;
    palette: string[];
    screenshotSrc?: string;
    device: "iphone" | "ipad";
  }
) {
  const size = options.device === "iphone" ? iphoneSize : ipadSize;
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (!context) return;

  const theme = buildStrategyTheme(
    options.form.screenshotStrategy,
    options.form.screenshotTone,
    options.palette
  );
  const layoutVariant = frameLayoutVariant(options.frame);
  const features = parseFeatures(options.form.features);
  const appName = options.form.appName.trim() || "Your App";
  const screenshotImage = options.screenshotSrc ? await loadImage(options.screenshotSrc) : null;
  const icon = options.iconSrc ? await loadImage(options.iconSrc) : null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, theme.backgroundA);
  gradient.addColorStop(1, theme.backgroundB);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = theme.glow;
  context.beginPath();
  context.ellipse(canvas.width * 0.8, canvas.height * 0.14, canvas.width * 0.18, canvas.height * 0.09, 0, 0, Math.PI * 2);
  context.fill();

  const safeX = canvas.width * 0.07;
  const safeY = canvas.height * 0.055;
  const safeW = canvas.width * 0.86;
  const safeH = canvas.height * 0.89;

  context.fillStyle = theme.shell;
  context.strokeStyle = theme.shellStroke;
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(safeX, safeY, safeW, safeH, 56);
  context.fill();
  context.stroke();

  const textX = safeX + safeW * 0.08;
  const textY = safeY + safeH * 0.12;
  const headlineSize = options.device === "iphone" ? 102 : 112;
  const subtextSize = options.device === "iphone" ? 42 : 46;
  const frameWidth = safeW * 0.8;
  const chipY = textY + 435 + layoutVariant * 12;
  const stageYOffset = layoutVariant * 14;
  const stageScale = layoutVariant === 2 ? 0.97 : 1;

  context.fillStyle = theme.accent;
  context.beginPath();
  context.roundRect(textX, safeY + safeH * 0.05, safeW * (layoutVariant === 1 ? 0.28 : 0.24), 58, 29);
  context.fill();

  context.fillStyle = "#ffffff";
  context.font = "700 28px sans-serif";
  context.fillText(frameBadgeLabel(options.frame), textX + 24, safeY + safeH * 0.05 + 38);

  context.fillStyle = "rgba(255,255,255,0.22)";
  context.beginPath();
  context.roundRect(textX, textY - 58, safeW * 0.42, 58, 28);
  context.fill();

  context.fillStyle = theme.body;
  context.font = "600 30px sans-serif";
  context.fillText(`${appName} • ${theme.eyebrow}`, textX + 20, textY - 22);

  context.fillStyle = theme.title;
  context.font = `700 ${headlineSize}px sans-serif`;
  wrapText(context, options.frame.headline, textX, textY + 96, frameWidth, headlineSize * 0.94, 2);

  context.font = `500 ${subtextSize}px sans-serif`;
  context.fillStyle = theme.body;
  wrapText(context, options.frame.subtext, textX, textY + 270, frameWidth, subtextSize * 1.25, 3);

  const chips = [
    parseFeatures(options.form.features)[0] ?? "Fast setup",
    parseFeatures(options.form.features)[1] ?? "Clear hierarchy",
    parseFeatures(options.form.features)[2] ?? "Export-ready"
  ];

  chips.forEach((chip, index) => {
    const chipX = textX + index * (safeW * 0.24);
    context.fillStyle = "rgba(255,255,255,0.2)";
    context.beginPath();
    context.roundRect(chipX, chipY, safeW * 0.22, 48, 24);
    context.fill();
    context.fillStyle = theme.title;
    context.font = "600 22px sans-serif";
    wrapText(context, chip, chipX + 18, chipY + 30, safeW * 0.18, 22, 1);
  });

  const stageX = safeX + safeW * 0.08;
  const stageY = safeY + safeH * 0.5 + stageYOffset;
  const stageW = safeW * 0.84 * stageScale;
  const stageH = safeH * 0.39 * stageScale;

  context.fillStyle = "rgba(15,23,42,0.14)";
  context.beginPath();
  context.roundRect(stageX, stageY + 24, stageW, stageH, 48);
  context.fill();

  context.fillStyle = "rgba(255,255,255,0.94)";
  context.beginPath();
  context.roundRect(stageX, stageY, stageW, stageH, 48);
  context.fill();

  if (screenshotImage) {
    drawRoundedImage(context, screenshotImage, stageX + 24, stageY + 24, stageW - 48, stageH - 48, 32);
  } else {
    drawFallbackScreen(context, {
      x: stageX + 24,
      y: stageY + 24,
      width: stageW - 48,
      height: stageH - 48,
      radius: 32,
      theme,
      icon,
      features
    });
  }

  context.strokeStyle = "rgba(255,255,255,0.34)";
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(stageX, stageY, stageW, stageH, 48);
  context.stroke();

  context.fillStyle = "rgba(15,23,42,0.08)";
  context.beginPath();
  context.roundRect(stageX + 30, stageY + 26, stageW * 0.22, 52, 26);
  context.fill();
  context.fillStyle = "#0f172a";
  context.font = "600 24px sans-serif";
  context.fillText(screenshotImage ? "REAL UI MODE" : "FALLBACK MODE", stageX + 56, stageY + 60);

  context.fillStyle = theme.title;
  context.font = "600 30px sans-serif";
  context.fillText(appName, safeX + safeW * 0.74, safeY + safeH * 0.08);
}

export function StudioClient() {
  const [form, setForm] = useState<StudioForm>(defaultForm);
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);
  const [isRenderingSet, setIsRenderingSet] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("info");
  const [isExporting, setIsExporting] = useState(false);
  const [iconSrc, setIconSrc] = useState("");
  const [mockups, setMockups] = useState<MockupVariant[]>([]);
  const [slideFrames, setSlideFrames] = useState<EditableAsoFrame[]>([]);
  const [editingFrameId, setEditingFrameId] = useState<string | null>(null);
  const [regeneratingFrameId, setRegeneratingFrameId] = useState<string | null>(null);
  const [uploadedScreenshots, setUploadedScreenshots] = useState<UploadedScreenshot[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderSequenceRef = useRef(0);
  const hasHydratedProjectsRef = useRef(false);
  const lastSavedProjectStateRef = useRef("");

  const brand = useMemo(() => deriveBrandSuggestion(form), [form]);
  const recommendedFrames = useMemo(() => createEditableAsoNarrative(form), [form]);
  const activeFrames = slideFrames.length > 0 ? slideFrames : recommendedFrames;
  const usingRealUi = uploadedScreenshots.length > 0;
  const currentProject = useMemo(
    () => projects.find((project) => project.id === currentProjectId) ?? null,
    [currentProjectId, projects]
  );
  const hasMeaningfulProjectState =
    form.prompt.trim().length > 0 || Boolean(iconSrc) || mockups.length > 0 || slideFrames.length > 0;

  useEffect(() => {
    const raw = window.localStorage.getItem(localStorageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as ProviderConfig;
      setProvider(parsed.provider);
      setApiKey(parsed.apiKey);
    } catch {
      window.localStorage.removeItem(localStorageKey);
    }
  }, []);

  useEffect(() => {
    const payload: ProviderConfig = { provider, apiKey };
    window.localStorage.setItem(localStorageKey, JSON.stringify(payload));
  }, [provider, apiKey]);

  useEffect(() => {
    const storedProjects = loadProjects();
    setProjects(storedProjects);

    const mostRecentProject = storedProjects[0];
    if (mostRecentProject) {
      setCurrentProjectId(mostRecentProject.id);
      setForm(mostRecentProject.form);
      setIconSrc(mostRecentProject.iconSrc ?? "");
      setMockups(mostRecentProject.mockups);
      setSlideFrames(mostRecentProject.slideFrames);
      setProvider(mostRecentProject.provider);
      lastSavedProjectStateRef.current = serializeProjectState(mostRecentProject);
    }

    hasHydratedProjectsRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydratedProjectsRef.current || currentProjectId || !hasMeaningfulProjectState) {
      return;
    }

    const nextProject = createProject({
      provider,
      form,
      iconSrc: iconSrc || null,
      mockups,
      slideFrames,
      name: deriveProjectName(form)
    });

    setProjects(upsertProject(nextProject));
    setCurrentProjectId(nextProject.id);
    lastSavedProjectStateRef.current = serializeProjectState(nextProject);
  }, [currentProjectId, form, hasMeaningfulProjectState, iconSrc, mockups, provider, slideFrames]);

  useEffect(() => {
    if (!hasHydratedProjectsRef.current || !currentProjectId || !currentProject) {
      return;
    }

    const nextProject: Project = {
      id: currentProject.id,
      name: currentProject.name,
      createdAt: currentProject.createdAt,
      updatedAt: currentProject.updatedAt,
      form,
      iconSrc: iconSrc || null,
      mockups,
      slideFrames,
      provider
    };
    const serializedProjectState = serializeProjectState(nextProject);
    if (serializedProjectState === lastSavedProjectStateRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const updatedProjects = upsertProject(nextProject);
      const savedProject = updatedProjects.find((project) => project.id === nextProject.id) ?? nextProject;
      setProjects(updatedProjects);
      lastSavedProjectStateRef.current = serializeProjectState(savedProject);
    }, projectSaveDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [currentProject, currentProjectId, form, iconSrc, mockups, provider, slideFrames]);

  const canGenerateIcon = form.prompt.trim().length > 0;
  const canGenerateScreenshots = usingRealUi || Boolean(iconSrc);

  const updateStatus = (tone: StatusTone, message: string) => {
    setStatusTone(tone);
    setStatusMessage(message);
  };

  const applyProject = (project: Project) => {
    setCurrentProjectId(project.id);
    setForm(project.form);
    setIconSrc(project.iconSrc ?? "");
    setMockups(project.mockups);
    setSlideFrames(project.slideFrames);
    setProvider(project.provider);
    setEditingFrameId(null);
    setRegeneratingFrameId(null);
    setUploadedScreenshots([]);
    lastSavedProjectStateRef.current = serializeProjectState(project);
  };

  const handleSelectProject = (projectId: string) => {
    const nextProject = projects.find((project) => project.id === projectId);
    if (!nextProject) return;
    applyProject(nextProject);
    updateStatus("success", `Opened ${nextProject.name}.`);
  };

  const handleCreateNewProject = () => {
    const nextProject = createProject({
      provider,
      form: defaultForm,
      iconSrc: null,
      mockups: [],
      slideFrames: [],
      name: untitledProjectName
    });

    setProjects(upsertProject(nextProject));
    applyProject(nextProject);
    updateStatus("success", "Started a new project.");
  };

  const handleDuplicateProject = () => {
    if (!currentProject) return;

    const nextProject = createProject({
      provider,
      form,
      iconSrc: iconSrc || null,
      mockups,
      slideFrames,
      name: `${currentProject.name} Copy`
    });

    setProjects(upsertProject(nextProject));
    applyProject(nextProject);
    updateStatus("success", `Duplicated ${currentProject.name}.`);
  };

  const renderFrameSet = async (frames: EditableAsoFrame[], indices?: number[]) => {
    if (!canvasRef.current) {
      throw new Error("Canvas not ready for screenshot rendering.");
    }

    const sequence = ++renderSequenceRef.current;
    const rendered: MockupVariant[] = [];
    const targets = indices ?? frames.map((_, index) => index);

    for (const index of targets) {
      const frame = frames[index];
      if (!frame) continue;

      const source = uploadedScreenshots[index % Math.max(uploadedScreenshots.length, 1)]?.dataUrl;

      for (const device of ["iphone", "ipad"] as const) {
        await renderAsoFrame(canvasRef.current, {
          form,
          frame,
          iconSrc: iconSrc || undefined,
          palette: brand.palette.colors,
          screenshotSrc: source,
          device
        });

        rendered.push({
          id: `${frame.id}-${device}`,
          device,
          template: frame.id,
          title: `${frame.label} / ${device}`,
          dataUrl: canvasRef.current.toDataURL("image/png")
        });
      }
    }

    if (sequence !== renderSequenceRef.current) {
      return;
    }

    setMockups((current) =>
      sortMockups(indices ? mergeMockups(current, rendered) : rendered)
    );
  };

  const handleGenerateIcon = async () => {
    if (!canGenerateIcon) {
      updateStatus("error", "Enter an app idea prompt first.");
      return;
    }

    setIsGeneratingIcon(true);
    updateStatus("info", "Working…");

    try {
      const result = await generateIconWithProvider(form, { provider, apiKey });
      if (result.imageDataUrl) setIconSrc(result.imageDataUrl);
      else if (result.imageUrl) setIconSrc(result.imageUrl);
      updateStatus("success", result.message ?? "Icon generation completed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected generation error.";
      updateStatus("error", message);
    } finally {
      setIsGeneratingIcon(false);
    }
  };

  const handleUploadScreenshots = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const allowed = ["image/png", "image/jpeg", "image/webp"];
    const list = Array.from(files);
    const invalid = list.find((file) => !allowed.includes(file.type));
    if (invalid) {
      updateStatus("error", `Unsupported file type: ${invalid.name}. Use PNG, JPEG, or WEBP.`);
      return;
    }

    const oversized = list.find((file) => file.size > 8 * 1024 * 1024);
    if (oversized) {
      updateStatus("error", `File too large: ${oversized.name}. Keep each screenshot under 8MB.`);
      return;
    }

    try {
      const items = await filesToDataUrls(files);
      setUploadedScreenshots(items);
      updateStatus("success", `Loaded ${items.length} real app screenshots for ASO composition.`);
    } catch {
      updateStatus("error", "Failed to read one or more screenshots.");
    }
  };

  const handleGenerateMockups = async () => {
    if (!canvasRef.current || !canGenerateScreenshots) {
      setStatusMessage("Upload screenshots for real-UI mode, or generate an icon to use fallback mode.");
      return;
    }

    const nextFrames = createEditableAsoNarrative(form);
    setIsRenderingSet(true);
    setSlideFrames(nextFrames);

    try {
      await renderFrameSet(nextFrames);
      setStatusMessage(
        usingRealUi
          ? "Generated 6-frame ASO screenshot story with your uploaded UI for iPhone and iPad."
          : "Generated 6-frame ASO screenshot story in fallback mode using the icon concept."
      );
    } finally {
      setIsRenderingSet(false);
    }
  };

  const handleUpdateFrameCopy = async (
    frameId: EditableAsoFrame["id"],
    field: "headline" | "subtext",
    value: string
  ) => {
    const index = slideFrames.findIndex((frame) => frame.id === frameId);
    if (index === -1) {
      return;
    }

    const nextFrames = slideFrames.map((frame) =>
      frame.id === frameId ? { ...frame, [field]: value } : frame
    );

    setSlideFrames(nextFrames);
    await renderFrameSet(nextFrames, [index]);
  };

  const handleRegenerateFrame = async (frameId: EditableAsoFrame["id"]) => {
    const index = slideFrames.findIndex((frame) => frame.id === frameId);
    if (index === -1) {
      return;
    }

    setRegeneratingFrameId(frameId);

    try {
      const nextFrame = regenerateAsoFrame(form, frameId, slideFrames[index].variant);
      const nextFrames = slideFrames.map((frame) => (frame.id === frameId ? nextFrame : frame));
      setSlideFrames(nextFrames);
      await renderFrameSet(nextFrames, [index]);
      setStatusMessage(`Regenerated ${nextFrame.label} using the current brief, tone, and strategy.`);
    } finally {
      setRegeneratingFrameId(null);
    }
  };

  const handleExportIcons = async () => {
    const readiness = canExportIcons(iconSrc);
    if (!readiness.ok) {
      updateStatus("error", readiness.reason ?? "Icon export is not ready yet.");
      return;
    }

    setIsExporting(true);
    updateStatus("info", "Preparing icon ZIP…");
    try {
      const response = await fetch("/api/export-icons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: iconSrc })
      });

      if (!response.ok) throw new Error("Failed to create icon ZIP.");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      downloadUrl(url, "appbrandkit-icons.zip");
      URL.revokeObjectURL(url);
      updateStatus("success", "Icon ZIP exported.");
    } catch (error) {
      updateStatus("error", error instanceof Error ? error.message : "Failed to create icon ZIP.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportScreenshotsZip = async () => {
    const readiness = canExportScreenshots(mockups.length);
    if (!readiness.ok) {
      updateStatus("error", readiness.reason ?? "Screenshot export is not ready yet.");
      return;
    }

    setIsExporting(true);
    updateStatus("info", "Preparing screenshots ZIP…");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const shot of mockups) {
        const blob = dataUrlToBlob(shot.dataUrl);
        zip.file(`screenshots/${shot.device}/${shot.id}.png`, blob);
      }

      const archive = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(archive);
      downloadUrl(url, "appbrandkit-screenshots.zip");
      URL.revokeObjectURL(url);
      updateStatus("success", `Exported ${mockups.length} screenshots as ZIP.`);
    } catch {
      updateStatus("error", "Failed to export screenshots ZIP.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAllZip = async () => {
    const readiness = canExportBundle(iconSrc, mockups.length);
    if (!readiness.ok) {
      updateStatus("error", readiness.reason ?? "Bundle export is not ready yet.");
      return;
    }

    setIsExporting(true);
    updateStatus("info", "Preparing full bundle ZIP…");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      if (iconSrc) {
        try {
          const iconBlob = await srcToBlob(iconSrc);
          zip.file("preview/icon.png", iconBlob);
        } catch {
          // ignore icon preview fetch failures
        }

        if (iconSrc.startsWith("data:image")) {
          const response = await fetch("/api/export-icons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageDataUrl: iconSrc })
          });
          if (response.ok) {
            const iconZipBlob = await response.blob();
            zip.file("ios-icon-set/appbrandkit-icons.zip", iconZipBlob);
          }
        }
      }

      for (const shot of mockups) {
        zip.file(`screenshots/${shot.device}/${shot.id}.png`, dataUrlToBlob(shot.dataUrl));
      }

      const readme = [
        "AppBrandKit export bundle",
        "",
        `Generated at: ${new Date().toISOString()}`,
        `Screenshots: ${mockups.length}`,
        `Icon included: ${iconSrc ? "yes" : "no"}`,
        "",
        "Contents:",
        "- preview/icon.png (if available)",
        "- ios-icon-set/appbrandkit-icons.zip (if icon was data-url generated)",
        "- screenshots/iphone/*.png",
        "- screenshots/ipad/*.png"
      ].join("\n");

      zip.file("README.txt", readme);

      const archive = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(archive);
      downloadUrl(url, "appbrandkit-export-bundle.zip");
      URL.revokeObjectURL(url);
      updateStatus("success", "Exported full bundle ZIP (icons + screenshots).");
    } catch {
      updateStatus("error", "Failed to export full bundle ZIP.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="shell flex flex-col gap-8 py-10 md:gap-10">
      <header className="glass rounded-[34px] p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="pill mb-4 text-sm font-medium">AppBrandKit AI Studio</div>
            <h1 className="section-title max-w-3xl">Template-first screenshot and icon studio for faster App Store positioning.</h1>
            <p className="mt-4 max-w-2xl text-base text-[color:var(--muted)] md:text-lg">
              Generate premium concept directions with your own provider key. Keep your BYOK setup,
              control costs, and export iPhone/iPad visuals in one flow.
            </p>
          </div>
          <div className="flex w-full max-w-md flex-col gap-3 md:w-auto">
            <div className="surface rounded-[28px] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">Project</p>
              <div className="mt-2 rounded-full bg-white px-4 py-2 text-sm font-semibold">
                {currentProject?.name ?? "No project yet"}
              </div>

              <div className="mt-3 max-h-48 overflow-auto rounded-2xl border border-[color:var(--line)] bg-white/80">
                {projects.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-[color:var(--muted)]">
                    Projects are created automatically as you work. Start typing a brief or generating assets.
                  </div>
                ) : (
                  <ul className="divide-y divide-[color:var(--line)] text-sm">
                    {projects.map((project) => (
                      <li key={project.id}>
                        <button
                          className={`flex w-full items-center justify-between px-4 py-2 text-left hover:bg-slate-50 ${
                            project.id === currentProjectId ? "bg-slate-50" : ""
                          }`}
                          onClick={() => handleSelectProject(project.id)}
                          type="button"
                        >
                          <div className="flex flex-col">
                            <span className="truncate font-medium">{project.name}</span>
                            <span className="text-xs text-[color:var(--muted)]">
                              Updated {formatUpdatedAt(project.updatedAt)}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <button className="btn-primary px-4 py-2 text-sm" onClick={handleCreateNewProject} type="button">
                  New project
                </button>
                <button
                  className="btn-ghost px-4 py-2 text-sm disabled:opacity-50"
                  disabled={!currentProject}
                  onClick={handleDuplicateProject}
                  type="button"
                >
                  Duplicate
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <Link href="/help" className="btn-ghost flex-1 text-center">Help</Link>
              <Link href="/" className="btn-ghost flex-1 text-center">Back to landing</Link>
            </div>
          </div>
        </div>
      </header>

      <section className="glass rounded-[30px] p-6 md:p-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Start from a proven prompt base</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">Load one and customize fields before generation.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {starterPrompts.map((starter) => (
            <article key={starter.title} className="surface rounded-3xl p-4">
              <p className="text-sm font-semibold">{starter.title}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{starter.prompt}</p>
              <button
                className="btn-ghost mt-4 px-4 py-2"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    prompt: starter.prompt,
                    appName: starter.appName,
                    tagline: starter.tagline,
                    targetAudience: starter.targetAudience,
                    valueProposition: starter.valueProposition,
                    features: starter.features
                  }))
                }
                type="button"
              >
                Use this prompt
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="glass rounded-[30px] p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Project brief</h2>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">Step 1</span>
          </div>

          <div className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-medium">App idea prompt</span>
              <textarea
                className="input-shell min-h-36 rounded-3xl"
                placeholder="Example: An AI meal planner for busy parents that builds weekly shopping lists from dietary goals."
                value={form.prompt}
                onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
              />
              <span className="text-xs text-[color:var(--muted)]">Tip: include audience + outcome for stronger ASO frames.</span>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium">App name</span>
                <input
                  className="input-shell rounded-full"
                  placeholder="Optional"
                  value={form.appName}
                  onChange={(event) => setForm((current) => ({ ...current, appName: event.target.value }))}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Tagline</span>
                <input
                  className="input-shell rounded-full"
                  placeholder="Optional"
                  value={form.tagline}
                  onChange={(event) => setForm((current) => ({ ...current, tagline: event.target.value }))}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Target audience</span>
                <input
                  className="input-shell rounded-full"
                  placeholder="Example: Busy parents"
                  value={form.targetAudience}
                  onChange={(event) => setForm((current) => ({ ...current, targetAudience: event.target.value }))}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Value proposition</span>
                <input
                  className="input-shell rounded-full"
                  placeholder="Example: Plan meals in minutes with less waste"
                  value={form.valueProposition}
                  onChange={(event) => setForm((current) => ({ ...current, valueProposition: event.target.value }))}
                />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Feature list</span>
              <textarea
                className="input-shell min-h-28 rounded-3xl"
                placeholder="Separate with commas or new lines."
                value={form.features}
                onChange={(event) => setForm((current) => ({ ...current, features: event.target.value }))}
              />
            </label>

            <div className="surface rounded-3xl p-4">
              <p className="text-sm font-semibold">Template style controls</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Icon style preset</span>
                  <select
                    className="input-shell rounded-full"
                    value={form.iconStyle}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, iconStyle: event.target.value as IconStylePreset }))
                    }
                  >
                    {Object.entries(iconStyleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">Screenshot tone</span>
                  <select
                    className="input-shell rounded-full"
                    value={form.screenshotTone}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, screenshotTone: event.target.value as ScreenshotTone }))
                    }
                  >
                    {Object.entries(screenshotToneLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">Screenshot strategy</span>
                  <select
                    className="input-shell rounded-full"
                    value={form.screenshotStrategy}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        screenshotStrategy: event.target.value as ScreenshotStrategy
                      }))
                    }
                  >
                    {Object.entries(screenshotStrategyLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>

        <aside className="glass rounded-[30px] p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Provider + safety</h2>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">Step 2</span>
          </div>

          <p className="text-sm text-[color:var(--muted)]">
            If `OPENAI_API_KEY` exists server-side, it is used automatically. BYOK here remains optional for local overrides.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium">Provider</span>
              <select
                className="input-shell rounded-full"
                value={provider}
                onChange={(event) => setProvider(event.target.value as AIProvider)}
              >
                {Object.entries(providerLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">API key (optional)</span>
              <input
                className="input-shell rounded-full"
                type="password"
                placeholder="Used only if server key is missing"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
            </label>

            <button
              className="btn-ghost mt-2 px-4 py-2"
              onClick={() => {
                window.localStorage.removeItem(localStorageKey);
                setApiKey("");
                updateStatus("success", "Cleared local BYOK cache.");
              }}
              type="button"
            >
              Clear local BYOK cache
            </button>

            <div className="rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Legal notice: review generated outputs before shipping. Avoid trademarked logos, copyrighted characters,
              brand lookalikes, or misleading performance claims.
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="glass rounded-[30px] p-6 md:p-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Generate and refine</h2>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">Step 3</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="btn-primary disabled:opacity-50"
              disabled={!canGenerateIcon || isGeneratingIcon}
              onClick={handleGenerateIcon}
              type="button"
            >
              {isGeneratingIcon ? "Generating icon..." : "Generate icon concept"}
            </button>
            <button
              className="btn-ghost disabled:opacity-50"
              disabled={!canGenerateScreenshots || isRenderingSet}
              onClick={handleGenerateMockups}
              type="button"
            >
              {isRenderingSet ? "Rendering screenshot set..." : "Generate screenshot set"}
            </button>
            <button
              className="btn-ghost disabled:opacity-50"
              disabled={!iconSrc || isExporting}
              onClick={handleExportIcons}
              type="button"
            >
              Export iOS icon ZIP
            </button>
            <button
              className="btn-ghost disabled:opacity-50"
              disabled={mockups.length === 0 || isExporting}
              onClick={handleExportScreenshotsZip}
              type="button"
            >
              Export screenshots ZIP
            </button>
            <button
              className="btn-ghost disabled:opacity-50"
              disabled={(!iconSrc && mockups.length === 0) || isExporting}
              onClick={handleExportAllZip}
              type="button"
            >
              Export full bundle ZIP
            </button>
          </div>

          {statusMessage ? (
            <p
              aria-live="polite"
              className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                statusTone === "error"
                  ? "bg-red-50 text-red-800 border border-red-200"
                  : statusTone === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-white"
              }`}
            >
              {statusMessage}
            </p>
          ) : null}

          <div className="mt-6 surface rounded-[26px] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Real UI screenshot inputs</p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Upload real product screenshots to switch templates into real-UI mode.
                </p>
              </div>
              <div className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${usingRealUi ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-700"}`}>
                {usingRealUi ? "Real UI Mode" : "Fallback Mode"}
              </div>
            </div>

            <label className="mt-4 grid gap-2">
              <span className="text-sm font-medium">Upload screenshots</span>
              <input
                accept="image/png,image/jpeg,image/webp"
                className="input-shell rounded-2xl"
                multiple
                onChange={handleUploadScreenshots}
                type="file"
              />
            </label>

            {uploadedScreenshots.length > 0 ? (
              <>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {uploadedScreenshots.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-[color:var(--line)] bg-white p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt={item.name} className="aspect-[9/19] w-full rounded-2xl object-cover" src={item.dataUrl} />
                      <p className="mt-2 truncate text-xs text-[color:var(--muted)]">{item.name}</p>
                    </div>
                  ))}
                </div>
                <button
                  className="btn-ghost mt-4 px-4 py-2"
                  onClick={() => setUploadedScreenshots([])}
                  type="button"
                >
                  Clear uploaded screenshots
                </button>
              </>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--muted)]">
                No screenshots uploaded yet. You can still generate template previews after creating an icon.
              </p>
            )}
          </div>

          <div className="mt-6 surface rounded-[26px] p-5">
            <p className="text-sm font-medium">Icon preview</p>
            {iconSrc ? (
              <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Generated app icon" className="h-52 w-52 rounded-[32px] border border-[color:var(--line)] object-cover shadow-sm" src={iconSrc} />
                <button
                  className="btn-ghost w-fit px-4 py-2"
                  onClick={() => {
                    const url = iconSrc.startsWith("data:") ? URL.createObjectURL(dataUrlToBlob(iconSrc)) : iconSrc;
                    downloadUrl(url, "appbrandkit-icon.png");
                    if (iconSrc.startsWith("data:")) URL.revokeObjectURL(url);
                  }}
                  type="button"
                >
                  Export icon PNG
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--muted)]">No icon yet. Generate one to unlock fallback screenshot rendering.</p>
            )}
          </div>
        </div>

        <div className="glass rounded-[30px] p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Template direction</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">Palette and ASO narrative are derived from your brief.</p>
            </div>
            <div className="rounded-full bg-white px-4 py-2 text-sm font-medium">{brand.palette.name}</div>
          </div>

          <div className="mt-5 flex gap-3">
            {brand.palette.colors.map((color) => (
              <div key={color} className="flex flex-col items-center gap-2">
                <div className="h-14 w-14 rounded-2xl border border-black/5" style={{ backgroundColor: color }} />
                <span className="text-xs text-[color:var(--muted)]">{color}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm text-[color:var(--muted)]">{brand.palette.rationale}</p>

          <div className="mt-7">
            <h3 className="text-lg font-semibold tracking-tight">ASO narrative flow (6 frames)</h3>
            <div className="mt-4 grid gap-3">
              {activeFrames.map((frame) => (
                <article key={frame.id} className="surface rounded-3xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--brand)]">{frame.label}</p>
                  <p className="mt-2 text-lg font-semibold tracking-tight">{frame.headline}</p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{frame.subtext}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="glass rounded-[30px] p-6 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Screenshot output gallery</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Each run generates six narrative templates across iPhone and iPad. Export individual PNGs or download ZIP bundles in one click.
            </p>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-sm">{mockups.length} assets generated</div>
        </div>

        {mockups.length > 0 ? (
          <>
            <div className="mt-5 overflow-x-auto">
              <div className="flex min-w-max gap-3 pb-2">
                {mockups
                  .filter((mockup) => mockup.device === "iphone")
                  .map((mockup) => (
                    <div key={`strip-${mockup.id}`} className="surface w-40 shrink-0 rounded-2xl p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt={mockup.title} className="aspect-[3/4] w-full rounded-xl object-cover" src={mockup.dataUrl} />
                    </div>
                  ))}
              </div>
            </div>

            <div className="mt-6 grid gap-5">
              {slideFrames.map((frame) => {
                const iphoneMockup = mockups.find((mockup) => mockup.id === `${frame.id}-iphone`);
                const ipadMockup = mockups.find((mockup) => mockup.id === `${frame.id}-ipad`);
                const isEditing = editingFrameId === frame.id;
                const isRegenerating = regeneratingFrameId === frame.id;

                return (
                  <article key={frame.id} className="surface rounded-[28px] p-4 md:p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--brand)]">
                          {frame.label}
                        </p>
                        <p className="mt-2 text-lg font-semibold tracking-tight">{frame.headline}</p>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">{frame.subtext}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn-ghost px-4 py-2"
                          onClick={() => setEditingFrameId(isEditing ? null : frame.id)}
                          type="button"
                        >
                          {isEditing ? "Close edit mode" : "Edit copy"}
                        </button>
                        <button
                          className="btn-ghost px-4 py-2 disabled:opacity-50"
                          disabled={isRegenerating}
                          onClick={() => void handleRegenerateFrame(frame.id)}
                          type="button"
                        >
                          {isRegenerating ? "Regenerating..." : "Regenerate slide"}
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-4 grid gap-4 rounded-[24px] border border-[color:var(--line)] bg-white/80 p-4 md:grid-cols-2">
                        <label className="grid gap-2">
                          <span className="text-sm font-medium">Headline</span>
                          <input
                            className="input-shell rounded-full"
                            value={frame.headline}
                            onChange={(event) => void handleUpdateFrameCopy(frame.id, "headline", event.target.value)}
                          />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-sm font-medium">Subtext</span>
                          <textarea
                            className="input-shell min-h-28 rounded-3xl"
                            value={frame.subtext}
                            onChange={(event) => void handleUpdateFrameCopy(frame.id, "subtext", event.target.value)}
                          />
                        </label>
                      </div>
                    ) : null}

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {[iphoneMockup, ipadMockup]
                        .filter((mockup): mockup is MockupVariant => Boolean(mockup))
                        .map((mockup) => (
                        <div key={mockup.id} className="rounded-[24px] border border-[color:var(--line)] bg-white p-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt={mockup.title}
                            className="aspect-[3/4] w-full rounded-[20px] object-cover"
                            src={mockup.dataUrl}
                          />
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold capitalize">{mockup.title}</p>
                              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">
                                {mockup.device}
                              </p>
                            </div>
                            <button
                              className="btn-ghost px-4 py-2"
                              onClick={() => downloadUrl(mockup.dataUrl, `${mockup.id}.png`)}
                              type="button"
                            >
                              Export PNG
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">
                      Variant {frame.variant + 1} • edits update previews and exports immediately
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-6 surface rounded-3xl p-5">
            <p className="text-sm font-medium">No screenshots generated yet</p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Generate an icon, then run screenshot generation. Uploading real product UI will switch output to real-UI composition mode automatically.
            </p>
          </div>
        )}
      </section>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
