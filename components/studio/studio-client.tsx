"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { deriveBrandSuggestion } from "@/lib/branding";
import { generateIconWithProvider } from "@/lib/providers";
import type {
  AIProvider,
  IconStylePreset,
  MockupVariant,
  ProviderConfig,
  ScreenshotTone,
  StudioForm
} from "@/lib/types";

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

const localStorageKey = "appbrandkit-byok";

const defaultForm: StudioForm = {
  prompt: "",
  appName: "",
  tagline: "",
  features: "",
  iconStyle: "glassy",
  screenshotTone: "vibrant"
};

const starterPrompts = [
  {
    title: "Marine planning app",
    prompt:
      "A marine weather app for sailors and kite surfers. It predicts safe launch windows, wave quality, and creates simple route confidence cards.",
    appName: "TidalFlow",
    tagline: "Sail and ride with confidence.",
    features: "Live marine conditions\nRoute confidence score\nSafety alerts"
  },
  {
    title: "Creator growth assistant",
    prompt:
      "An app for creators to plan short-form content with AI hooks, posting cadence, and weekly growth insights.",
    appName: "PulseBoard",
    tagline: "Grow with a repeatable publishing system.",
    features: "Content sprint planner\nHook library\nWeekly performance recap"
  },
  {
    title: "Family operations hub",
    prompt:
      "A shared family organizer for groceries, school tasks, routines, and reminders with a calm, premium visual style.",
    appName: "NestNote",
    tagline: "Keep family life in sync.",
    features: "Shared lists\nSmart reminders\nHome timeline"
  }
];

const iphoneSize = { width: 1290, height: 2796 };
const ipadSize = { width: 2064, height: 2752 };

const screenshotTemplates = [
  "hero-focus",
  "feature-cards",
  "split-editorial",
  "device-frame",
  "benefit-grid",
  "closing-cta"
] as const;

type ScreenshotTemplate = (typeof screenshotTemplates)[number];

function parseFeatures(features: string): string[] {
  return features
    .split(/\n|,/) 
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 4);
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

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
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
      gradientA: "#f8fafc",
      gradientB: "#e2e8f0",
      card: "rgba(255,255,255,0.94)",
      chip: "rgba(15,23,42,0.06)",
      title: "#0f172a",
      body: "#334155",
      accent: primary
    };
  }

  if (tone === "premium") {
    return {
      gradientA: "#0f172a",
      gradientB: "#312e81",
      card: "rgba(15,23,42,0.55)",
      chip: "rgba(255,255,255,0.12)",
      title: "#f8fafc",
      body: "#cbd5e1",
      accent: "#f59e0b"
    };
  }

  return {
    gradientA: primary,
    gradientB: secondary,
    card: "rgba(255,255,255,0.18)",
    chip: "rgba(255,255,255,0.2)",
    title: "#ffffff",
    body: surface,
    accent: text
  };
}

async function renderTemplate(
  canvas: HTMLCanvasElement,
  options: {
    form: StudioForm;
    iconSrc: string;
    palette: string[];
    template: ScreenshotTemplate;
    device: "iphone" | "ipad";
  }
) {
  const size = options.device === "iphone" ? iphoneSize : ipadSize;
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (!context) return;

  const appName = options.form.appName.trim() || "Your App";
  const tagline =
    options.form.tagline.trim() || "Launch a polished experience from first glance.";
  const features = parseFeatures(options.form.features);
  const tone = toneColors(options.form.screenshotTone, options.palette);

  const icon = await loadImage(options.iconSrc);

  context.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, tone.gradientA);
  gradient.addColorStop(1, tone.gradientB);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const safeX = canvas.width * 0.08;
  const safeY = canvas.height * 0.08;
  const safeW = canvas.width * 0.84;
  const safeH = canvas.height * 0.84;

  context.fillStyle = tone.card;
  context.strokeStyle = "rgba(255,255,255,0.22)";
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(safeX, safeY, safeW, safeH, 48);
  context.fill();
  context.stroke();

  const badgeSize = options.device === "iphone" ? 188 : 220;
  context.drawImage(icon, safeX + 52, safeY + 50, badgeSize, badgeSize);

  context.fillStyle = tone.chip;
  context.beginPath();
  context.roundRect(safeX + 260, safeY + 88, safeW * 0.22, 66, 33);
  context.fill();
  context.fillStyle = tone.title;
  context.font = "600 40px sans-serif";
  context.fillText("App Store Ready", safeX + 292, safeY + 133);

  const titleY = safeY + 350;
  context.fillStyle = tone.title;
  context.font = options.device === "iphone" ? "700 132px sans-serif" : "700 120px sans-serif";
  wrapText(context, appName, safeX + 56, titleY, safeW * 0.72, 138, 2);
  context.font = options.device === "iphone" ? "500 58px sans-serif" : "500 54px sans-serif";
  context.fillStyle = tone.body;
  wrapText(context, tagline, safeX + 56, titleY + 170, safeW * 0.7, 72, 3);

  const chipFeatures = features.length > 0 ? features : ["Fast setup", "High-converting visuals", "Launch confidence"];

  if (options.template === "hero-focus") {
    chipFeatures.slice(0, 3).forEach((feature, index) => {
      const top = safeY + safeH - 320 + index * 92;
      context.fillStyle = tone.chip;
      context.beginPath();
      context.roundRect(safeX + 56, top, safeW * 0.62, 72, 36);
      context.fill();
      context.fillStyle = tone.title;
      context.font = "500 38px sans-serif";
      context.fillText(feature, safeX + 84, top + 47);
    });
  }

  if (options.template === "feature-cards") {
    chipFeatures.slice(0, 3).forEach((feature, index) => {
      const left = safeX + 56 + index * (safeW * 0.29);
      const top = safeY + safeH - 420;
      context.fillStyle = "rgba(255,255,255,0.22)";
      context.beginPath();
      context.roundRect(left, top, safeW * 0.26, 270, 34);
      context.fill();
      context.fillStyle = tone.accent;
      context.font = "700 46px sans-serif";
      context.fillText(`0${index + 1}`, left + 28, top + 68);
      context.fillStyle = tone.title;
      context.font = "500 38px sans-serif";
      wrapText(context, feature, left + 28, top + 132, safeW * 0.2, 46, 3);
    });
  }

  if (options.template === "split-editorial") {
    context.fillStyle = "rgba(255,255,255,0.86)";
    context.fillRect(safeX + safeW * 0.52, safeY + 30, safeW * 0.43, safeH - 60);
    context.drawImage(icon, safeX + safeW * 0.62, safeY + 150, safeW * 0.22, safeW * 0.22);
    context.fillStyle = "#0f172a";
    context.font = "700 48px sans-serif";
    context.fillText("Why users love it", safeX + safeW * 0.56, safeY + 500);
    chipFeatures.slice(0, 3).forEach((feature, index) => {
      context.font = "500 36px sans-serif";
      context.fillText(`• ${feature}`, safeX + safeW * 0.56, safeY + 590 + index * 90);
    });
  }

  if (options.template === "device-frame") {
    context.fillStyle = "rgba(15,23,42,0.22)";
    context.beginPath();
    context.roundRect(safeX + safeW * 0.57, safeY + 130, safeW * 0.34, safeH * 0.65, 64);
    context.fill();
    context.fillStyle = "rgba(255,255,255,0.95)";
    context.beginPath();
    context.roundRect(safeX + safeW * 0.6, safeY + 170, safeW * 0.28, safeH * 0.56, 52);
    context.fill();
    context.drawImage(icon, safeX + safeW * 0.655, safeY + 260, safeW * 0.16, safeW * 0.16);
  }

  if (options.template === "benefit-grid") {
    const blocks = chipFeatures.slice(0, 4);
    blocks.forEach((feature, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const cardW = safeW * 0.42;
      const cardH = 180;
      const left = safeX + 56 + col * (cardW + 30);
      const top = safeY + safeH - 450 + row * (cardH + 24);
      context.fillStyle = "rgba(255,255,255,0.2)";
      context.beginPath();
      context.roundRect(left, top, cardW, cardH, 28);
      context.fill();
      context.fillStyle = tone.title;
      context.font = "600 40px sans-serif";
      wrapText(context, feature, left + 26, top + 64, cardW - 40, 44, 2);
    });
  }

  if (options.template === "closing-cta") {
    context.fillStyle = "rgba(255,255,255,0.22)";
    context.beginPath();
    context.roundRect(safeX + 56, safeY + safeH - 340, safeW - 112, 230, 34);
    context.fill();
    context.fillStyle = tone.title;
    context.font = "700 68px sans-serif";
    context.fillText("Download now", safeX + 100, safeY + safeH - 230);
    context.font = "500 42px sans-serif";
    context.fillStyle = tone.body;
    context.fillText("Built for speed, clarity, and launch-day trust.", safeX + 100, safeY + safeH - 160);
  }
}

export function StudioClient() {
  const [form, setForm] = useState<StudioForm>(defaultForm);
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [iconSrc, setIconSrc] = useState("");
  const [mockups, setMockups] = useState<MockupVariant[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const brand = useMemo(() => deriveBrandSuggestion(form), [form]);

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

  const canGenerate = form.prompt.trim().length > 0;

  const handleGenerateIcon = async () => {
    if (!canGenerate) {
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

  const handleGenerateMockups = async () => {
    if (!canvasRef.current || !iconSrc) {
      setStatusMessage("Generate or provide an icon first.");
      return;
    }

    const variants: MockupVariant[] = [];

    for (const template of screenshotTemplates) {
      for (const device of ["iphone", "ipad"] as const) {
        await renderTemplate(canvasRef.current, {
          form,
          iconSrc,
          palette: brand.palette.colors,
          template,
          device
        });

        variants.push({
          id: `${template}-${device}`,
          device,
          template,
          title: `${template.replace("-", " ")} / ${device}`,
          dataUrl: canvasRef.current.toDataURL("image/png")
        });
      }
    }

    setMockups(variants);
    setStatusMessage("App Store-style screenshot mockups generated.");
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

  return (
    <div className="shell flex flex-col gap-8 py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="pill mb-4 text-sm font-medium">AppBrandKit AI Studio</div>
          <h1 className="section-title max-w-3xl">Generate a launch-ready app brand kit with your own key.</h1>
          <p className="mt-4 max-w-2xl text-base text-[color:var(--muted)] md:text-lg">
            Create icon concepts, palette direction, copy hooks, and App Store style screenshot mockups
            for iPhone and iPad without storing platform keys on this app.
          </p>
        </div>
        <Link href="/" className="rounded-full border border-[color:var(--line)] bg-white px-5 py-3 text-sm font-medium">
          Back to landing
        </Link>
      </header>

      <section className="glass rounded-[28px] p-6 md:p-8">
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {starterPrompts.map((starter) => (
            <article key={starter.title} className="rounded-3xl bg-white p-4">
              <p className="text-sm font-semibold">{starter.title}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{starter.prompt}</p>
              <button
                className="mt-4 rounded-full border border-[color:var(--line)] px-4 py-2 text-sm font-medium"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    prompt: starter.prompt,
                    appName: starter.appName,
                    tagline: starter.tagline,
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

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass rounded-[28px] p-6 md:p-8">
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium">App idea prompt</span>
              <textarea
                className="min-h-32 rounded-3xl border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                placeholder="Example: An AI meal planner for busy parents that builds weekly shopping lists from dietary goals."
                value={form.prompt}
                onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium">App name</span>
                <input
                  className="rounded-full border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                  placeholder="Optional"
                  value={form.appName}
                  onChange={(event) => setForm((current) => ({ ...current, appName: event.target.value }))}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Tagline</span>
                <input
                  className="rounded-full border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                  placeholder="Optional"
                  value={form.tagline}
                  onChange={(event) => setForm((current) => ({ ...current, tagline: event.target.value }))}
                />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Features</span>
              <textarea
                className="min-h-28 rounded-3xl border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                placeholder="Optional. Separate with commas or new lines."
                value={form.features}
                onChange={(event) => setForm((current) => ({ ...current, features: event.target.value }))}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Icon style preset</span>
                <select
                  className="rounded-full border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                  value={form.iconStyle}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, iconStyle: event.target.value as IconStylePreset }))
                  }
                >
                  {Object.entries(iconStyleLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium">Screenshot tone</span>
                <select
                  className="rounded-full border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                  value={form.screenshotTone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, screenshotTone: event.target.value as ScreenshotTone }))
                  }
                >
                  {Object.entries(screenshotToneLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        <aside className="glass rounded-[28px] p-6 md:p-8">
          <h2 className="text-xl font-semibold">BYOK provider</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            If OPENAI_API_KEY is available on the server, it is preferred automatically. BYOK stays optional for local overrides.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium">Provider</span>
              <select
                className="rounded-full border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                value={provider}
                onChange={(event) => setProvider(event.target.value as AIProvider)}
              >
                {Object.entries(providerLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">API key (optional)</span>
              <input
                className="rounded-full border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                type="password"
                placeholder="Used only if server key is missing"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
            </label>

            <div className="rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Legal and safety notice: review generated assets before shipping. Avoid trademarked logos, brand lookalikes, copyrighted characters, or misleading claims.
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass rounded-[28px] p-6 md:p-8">
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={!canGenerate || isGeneratingIcon} onClick={handleGenerateIcon} type="button">
              {isGeneratingIcon ? "Generating icon..." : "Generate icon concept"}
            </button>
            <button className="rounded-full border border-[color:var(--line)] bg-white px-5 py-3 text-sm font-semibold disabled:opacity-50" disabled={!iconSrc} onClick={handleGenerateMockups} type="button">
              Generate screenshots
            </button>
            <button className="rounded-full border border-[color:var(--line)] bg-white px-5 py-3 text-sm font-semibold disabled:opacity-50" disabled={!iconSrc} onClick={handleExportIcons} type="button">
              Export iOS icon ZIP
            </button>
          </div>

          {statusMessage ? <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm">{statusMessage}</p> : null}

          <div className="mt-6 rounded-[28px] border border-dashed border-[color:var(--line)] bg-white/70 p-5">
            <p className="text-sm font-medium">Icon preview</p>
            {iconSrc ? (
              <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Generated app icon" className="h-52 w-52 rounded-[32px] border border-[color:var(--line)] object-cover shadow-sm" src={iconSrc} />
                <button
                  className="w-fit rounded-full border border-[color:var(--line)] px-4 py-2 text-sm font-medium"
                  onClick={() => {
                    const url = iconSrc.startsWith("data:") ? URL.createObjectURL(dataUrlToBlob(iconSrc)) : iconSrc;
                    downloadUrl(url, "appbrandkit-icon.png");
                    if (iconSrc.startsWith("data:")) URL.revokeObjectURL(url);
                  }}
                  type="button"
                >
                  Export PNG
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--muted)]">Generated icon output appears here.</p>
            )}
          </div>
        </div>

        <div className="glass rounded-[28px] p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Brand direction</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">Derived locally from your prompt and optional inputs.</p>
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
        </div>
      </section>

      <section className="glass rounded-[28px] p-6 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Screenshot listing preview</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Six App Store templates rendered for both iPhone and iPad with device-safe spacing and stronger hierarchy.
            </p>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-sm">{mockups.length} assets generated</div>
        </div>

        {mockups.length > 0 ? (
          <>
            <div className="mt-5 overflow-x-auto">
              <div className="flex min-w-max gap-3 pb-2">
                {mockups.filter((m) => m.device === "iphone").map((mockup) => (
                  <div key={`strip-${mockup.id}`} className="w-40 shrink-0 rounded-2xl border border-[color:var(--line)] bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={mockup.title} className="aspect-[3/4] w-full rounded-xl object-cover" src={mockup.dataUrl} />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {mockups.map((mockup) => (
                <article key={mockup.id} className="rounded-[28px] bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={mockup.title} className="aspect-[3/4] w-full rounded-[20px] border border-[color:var(--line)] object-cover" src={mockup.dataUrl} />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold capitalize">{mockup.template}</p>
                      <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">{mockup.device}</p>
                    </div>
                    <button className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm font-medium" onClick={() => downloadUrl(mockup.dataUrl, `${mockup.id}.png`)} type="button">
                      Export PNG
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-6 text-sm text-[color:var(--muted)]">Generate an icon, then render mockups here.</p>
        )}
      </section>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
