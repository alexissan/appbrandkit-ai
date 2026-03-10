"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { generateAsoNarrative, parseFeatures } from "@/lib/aso";
import { deriveBrandSuggestion } from "@/lib/branding";
import { generateIconWithProvider } from "@/lib/providers";
import type {
  AIProvider,
  AsoFrame,
  IconStylePreset,
  MockupVariant,
  ProviderConfig,
  ScreenshotStrategy,
  ScreenshotTone,
  StudioForm
} from "@/lib/types";

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
    frame: AsoFrame;
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

  context.fillStyle = theme.accent;
  context.beginPath();
  context.roundRect(textX, safeY + safeH * 0.05, safeW * 0.24, 58, 29);
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
    const chipY = textY + 435;
    context.fillStyle = "rgba(255,255,255,0.2)";
    context.beginPath();
    context.roundRect(chipX, chipY, safeW * 0.22, 48, 24);
    context.fill();
    context.fillStyle = theme.title;
    context.font = "600 22px sans-serif";
    wrapText(context, chip, chipX + 18, chipY + 30, safeW * 0.18, 22, 1);
  });

  const stageX = safeX + safeW * 0.08;
  const stageY = safeY + safeH * 0.5;
  const stageW = safeW * 0.84;
  const stageH = safeH * 0.39;

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
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [iconSrc, setIconSrc] = useState("");
  const [mockups, setMockups] = useState<MockupVariant[]>([]);
  const [uploadedScreenshots, setUploadedScreenshots] = useState<UploadedScreenshot[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const brand = useMemo(() => deriveBrandSuggestion(form), [form]);
  const narrative = useMemo(() => generateAsoNarrative(form), [form]);
  const usingRealUi = uploadedScreenshots.length > 0;

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

  const canGenerateIcon = form.prompt.trim().length > 0;
  const canGenerateScreenshots = usingRealUi || Boolean(iconSrc);

  const handleGenerateIcon = async () => {
    if (!canGenerateIcon) {
      setStatusMessage("Enter an app idea prompt first.");
      return;
    }

    setIsGeneratingIcon(true);
    setStatusMessage("");

    try {
      const result = await generateIconWithProvider(form, { provider, apiKey });
      if (result.imageDataUrl) setIconSrc(result.imageDataUrl);
      else if (result.imageUrl) setIconSrc(result.imageUrl);
      setStatusMessage(result.message ?? "Icon generation completed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected generation error.";
      setStatusMessage(message);
    } finally {
      setIsGeneratingIcon(false);
    }
  };

  const handleUploadScreenshots = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    try {
      const items = await filesToDataUrls(files);
      setUploadedScreenshots(items);
      setStatusMessage(`Loaded ${items.length} real app screenshots for ASO composition.`);
    } catch {
      setStatusMessage("Failed to read one or more screenshots.");
    }
  };

  const handleGenerateMockups = async () => {
    if (!canvasRef.current || !canGenerateScreenshots) {
      setStatusMessage("Upload screenshots for real-UI mode, or generate an icon to use fallback mode.");
      return;
    }

    const variants: MockupVariant[] = [];

    for (const [index, frame] of narrative.entries()) {
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

        variants.push({
          id: `${frame.id}-${device}`,
          device,
          template: frame.id,
          title: `${frame.label} / ${device}`,
          dataUrl: canvasRef.current.toDataURL("image/png")
        });
      }
    }

    setMockups(variants);
    setStatusMessage(
      usingRealUi
        ? "Generated 6-frame ASO screenshot story with your uploaded UI for iPhone and iPad."
        : "Generated 6-frame ASO screenshot story in fallback mode using the icon concept."
    );
  };

  const handleExportIcons = async () => {
    if (!iconSrc.startsWith("data:image")) {
      setStatusMessage("Icon ZIP export currently requires a generated or pasted data URL image.");
      return;
    }

    const response = await fetch("/api/export-icons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageDataUrl: iconSrc })
    });

    if (!response.ok) {
      setStatusMessage("Failed to create icon ZIP.");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    downloadUrl(url, "appbrandkit-icons.zip");
    URL.revokeObjectURL(url);
    setStatusMessage("Icon ZIP exported.");
  };

  const handleExportScreenshotsZip = async () => {
    if (mockups.length === 0) {
      setStatusMessage("Generate screenshots first, then export ZIP.");
      return;
    }

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
    setStatusMessage(`Exported ${mockups.length} screenshots as ZIP.`);
  };

  const handleExportAllZip = async () => {
    if (!iconSrc && mockups.length === 0) {
      setStatusMessage("Nothing to export yet. Generate icon and/or screenshots first.");
      return;
    }

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
    setStatusMessage("Exported full bundle ZIP (icons + screenshots). ");
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
          <Link href="/" className="btn-ghost text-center">
            Back to landing
          </Link>
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
              disabled={!canGenerateScreenshots}
              onClick={handleGenerateMockups}
              type="button"
            >
              Generate screenshot set
            </button>
            <button
              className="btn-ghost disabled:opacity-50"
              disabled={!iconSrc}
              onClick={handleExportIcons}
              type="button"
            >
              Export iOS icon ZIP
            </button>
            <button
              className="btn-ghost disabled:opacity-50"
              disabled={mockups.length === 0}
              onClick={handleExportScreenshotsZip}
              type="button"
            >
              Export screenshots ZIP
            </button>
            <button
              className="btn-ghost disabled:opacity-50"
              disabled={!iconSrc && mockups.length === 0}
              onClick={handleExportAllZip}
              type="button"
            >
              Export full bundle ZIP
            </button>
          </div>

          {statusMessage ? <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm">{statusMessage}</p> : null}

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
                accept="image/*"
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
              {narrative.map((frame) => (
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

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {mockups.map((mockup) => (
                <article key={mockup.id} className="surface rounded-[26px] p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={mockup.title} className="aspect-[3/4] w-full rounded-[20px] border border-[color:var(--line)] object-cover" src={mockup.dataUrl} />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold capitalize">{mockup.title}</p>
                      <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">{mockup.device}</p>
                    </div>
                    <button
                      className="btn-ghost px-4 py-2"
                      onClick={() => downloadUrl(mockup.dataUrl, `${mockup.id}.png`)}
                      type="button"
                    >
                      Export PNG
                    </button>
                  </div>
                </article>
              ))}
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
