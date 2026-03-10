"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { deriveBrandSuggestion } from "@/lib/branding";
import { generateIconWithProvider } from "@/lib/providers";
import type {
  AIProvider,
  MockupVariant,
  ProviderConfig,
  StudioForm
} from "@/lib/types";

const providerLabels: Record<AIProvider, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  anthropic: "Anthropic"
};

const localStorageKey = "appbrandkit-byok";

const defaultForm: StudioForm = {
  prompt: "",
  appName: "",
  tagline: "",
  features: ""
};

const iphoneSize = { width: 1290, height: 2796 };
const ipadSize = { width: 2064, height: 2752 };

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
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let offsetY = 0;

  words.forEach((word) => {
    const testLine = `${line}${word} `;
    const width = context.measureText(testLine).width;

    if (width > maxWidth && line) {
      context.fillText(line.trim(), x, y + offsetY);
      line = `${word} `;
      offsetY += lineHeight;
      return;
    }

    line = testLine;
  });

  if (line) {
    context.fillText(line.trim(), x, y + offsetY);
  }
}

function renderTemplate(
  canvas: HTMLCanvasElement,
  options: {
    form: StudioForm;
    iconSrc: string;
    palette: string[];
    template: string;
    device: "iphone" | "ipad";
  }
) {
  const size = options.device === "iphone" ? iphoneSize : ipadSize;
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const [primary, secondary, surface, text] = options.palette;
  const features = parseFeatures(options.form.features);
  const appName = options.form.appName.trim() || "Your App";
  const tagline = options.form.tagline.trim() || "Launch with a coherent brand system.";

  const draw = async () => {
    const icon = await loadImage(options.iconSrc);
    context.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, primary);
    gradient.addColorStop(1, secondary);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (options.template === "spotlight") {
      context.fillStyle = "rgba(255,255,255,0.12)";
      context.beginPath();
      context.arc(canvas.width * 0.2, canvas.height * 0.16, canvas.width * 0.18, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = surface;
      context.fillRect(canvas.width * 0.08, canvas.height * 0.1, canvas.width * 0.84, canvas.height * 0.8);
      context.drawImage(icon, canvas.width * 0.15, canvas.height * 0.16, 320, 320);
      context.fillStyle = text;
      context.font = "bold 144px sans-serif";
      context.fillText(appName, canvas.width * 0.15, canvas.height * 0.38);
      context.font = "56px sans-serif";
      wrapText(context, tagline, canvas.width * 0.15, canvas.height * 0.45, canvas.width * 0.68, 72);
    }

    if (options.template === "feature-stack") {
      context.fillStyle = "rgba(255,255,255,0.18)";
      context.fillRect(canvas.width * 0.08, canvas.height * 0.08, canvas.width * 0.84, canvas.height * 0.84);
      context.drawImage(icon, canvas.width * 0.64, canvas.height * 0.14, 340, 340);
      context.fillStyle = "#ffffff";
      context.font = "bold 148px sans-serif";
      wrapText(context, appName, canvas.width * 0.12, canvas.height * 0.2, canvas.width * 0.46, 154);
      context.font = "58px sans-serif";
      wrapText(context, tagline, canvas.width * 0.12, canvas.height * 0.34, canvas.width * 0.4, 74);
      features.forEach((feature, index) => {
        const top = canvas.height * 0.56 + index * 170;
        context.fillStyle = "rgba(23,32,51,0.1)";
        context.fillRect(canvas.width * 0.12, top, canvas.width * 0.7, 120);
        context.fillStyle = text;
        context.font = "52px sans-serif";
        context.fillText(feature, canvas.width * 0.15, top + 74);
      });
    }

    if (options.template === "editorial") {
      context.fillStyle = "rgba(255,255,255,0.88)";
      context.fillRect(0, 0, canvas.width * 0.56, canvas.height);
      context.drawImage(icon, canvas.width * 0.62, canvas.height * 0.18, 520, 520);
      context.fillStyle = text;
      context.font = "bold 132px sans-serif";
      wrapText(context, appName, canvas.width * 0.08, canvas.height * 0.18, canvas.width * 0.34, 138);
      context.font = "58px sans-serif";
      wrapText(context, tagline, canvas.width * 0.08, canvas.height * 0.34, canvas.width * 0.34, 72);
      context.font = "44px sans-serif";
      features.slice(0, 3).forEach((feature, index) => {
        context.fillText(`0${index + 1}  ${feature}`, canvas.width * 0.08, canvas.height * 0.58 + index * 110);
      });
    }

    if (options.template === "bold-frame") {
      context.fillStyle = "rgba(255,255,255,0.12)";
      context.fillRect(canvas.width * 0.06, canvas.height * 0.06, canvas.width * 0.88, canvas.height * 0.88);
      context.strokeStyle = "#ffffff";
      context.lineWidth = 8;
      context.strokeRect(canvas.width * 0.08, canvas.height * 0.08, canvas.width * 0.84, canvas.height * 0.84);
      context.drawImage(icon, canvas.width * 0.12, canvas.height * 0.16, 360, 360);
      context.fillStyle = "#ffffff";
      context.font = "bold 152px sans-serif";
      wrapText(context, appName, canvas.width * 0.12, canvas.height * 0.42, canvas.width * 0.72, 158);
      context.font = "58px sans-serif";
      wrapText(context, tagline, canvas.width * 0.12, canvas.height * 0.62, canvas.width * 0.68, 74);
      context.fillStyle = surface;
      context.fillRect(canvas.width * 0.12, canvas.height * 0.76, canvas.width * 0.5, 120);
      context.fillStyle = text;
      context.font = "44px sans-serif";
      context.fillText(features[0] ?? "Built for launch-day clarity", canvas.width * 0.15, canvas.height * 0.84);
    }
  };

  return draw();
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

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as ProviderConfig;
      setProvider(parsed.provider);
      setApiKey(parsed.apiKey);
    } catch {
      window.localStorage.removeItem(localStorageKey);
    }
  }, []);

  useEffect(() => {
    const payload: ProviderConfig = {
      provider,
      apiKey
    };

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

      if (result.imageDataUrl) {
        setIconSrc(result.imageDataUrl);
      } else if (result.imageUrl) {
        setIconSrc(result.imageUrl);
      }

      setStatusMessage(result.message ?? "Icon generation completed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected generation error.";
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

    const templates = ["spotlight", "feature-stack", "editorial", "bold-frame"];
    const variants: MockupVariant[] = [];

    for (const template of templates) {
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
    setStatusMessage("Screenshot mockups generated.");
  };

  const handleExportIcons = async () => {
    if (!iconSrc.startsWith("data:image")) {
      setStatusMessage(
        "Icon ZIP export currently requires a generated or pasted data URL image."
      );
      return;
    }

    const response = await fetch("/api/export-icons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        imageDataUrl: iconSrc
      })
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
            Create icon concepts, palette direction, copy hooks, and screenshot mockups
            for iPhone and iPad without storing platform keys on this app.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-[color:var(--line)] bg-white px-5 py-3 text-sm font-medium"
        >
          Back to landing
        </Link>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass rounded-[28px] p-6 md:p-8">
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium">App idea prompt</span>
              <textarea
                className="min-h-32 rounded-3xl border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                placeholder="Example: An AI meal planner for busy parents that builds weekly shopping lists from dietary goals."
                value={form.prompt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, prompt: event.target.value }))
                }
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium">App name</span>
                <input
                  className="rounded-full border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                  placeholder="Optional"
                  value={form.appName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, appName: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Tagline</span>
                <input
                  className="rounded-full border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                  placeholder="Optional"
                  value={form.tagline}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, tagline: event.target.value }))
                  }
                />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Features</span>
              <textarea
                className="min-h-28 rounded-3xl border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                placeholder="Optional. Separate with commas or new lines."
                value={form.features}
                onChange={(event) =>
                  setForm((current) => ({ ...current, features: event.target.value }))
                }
              />
            </label>
          </div>
        </div>

        <aside className="glass rounded-[28px] p-6 md:p-8">
          <h2 className="text-xl font-semibold">BYOK provider</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            API keys are stored in your browser&apos;s localStorage for convenience.
            This is insecure for production and should not be used for shared or deployed apps.
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
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">API key</span>
              <input
                className="rounded-full border border-[color:var(--line)] bg-white px-4 py-3 outline-none"
                type="password"
                placeholder="Paste provider key"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
            </label>

            <div className="rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Legal and safety notice: review generated assets before shipping. Avoid
              trademarked logos, brand lookalikes, copyrighted characters, or misleading claims.
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass rounded-[28px] p-6 md:p-8">
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!canGenerate || isGeneratingIcon}
              onClick={handleGenerateIcon}
              type="button"
            >
              {isGeneratingIcon ? "Generating icon..." : "Generate icon concept"}
            </button>
            <button
              className="rounded-full border border-[color:var(--line)] bg-white px-5 py-3 text-sm font-semibold disabled:opacity-50"
              disabled={!iconSrc}
              onClick={handleGenerateMockups}
              type="button"
            >
              Generate screenshots
            </button>
            <button
              className="rounded-full border border-[color:var(--line)] bg-white px-5 py-3 text-sm font-semibold disabled:opacity-50"
              disabled={!iconSrc}
              onClick={handleExportIcons}
              type="button"
            >
              Export iOS icon ZIP
            </button>
          </div>

          <p className="mt-4 text-sm text-[color:var(--muted)]">
            OpenAI image generation is wired now. Gemini and Anthropic are UI-ready but stubbed.
          </p>

          {statusMessage ? (
            <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm">{statusMessage}</p>
          ) : null}

          <div className="mt-6 rounded-[28px] border border-dashed border-[color:var(--line)] bg-white/70 p-5">
            <p className="text-sm font-medium">Icon preview</p>
            {iconSrc ? (
              <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Generated app icon"
                  className="h-52 w-52 rounded-[32px] border border-[color:var(--line)] object-cover shadow-sm"
                  src={iconSrc}
                />
                <button
                  className="w-fit rounded-full border border-[color:var(--line)] px-4 py-2 text-sm font-medium"
                  onClick={() => {
                    const url = iconSrc.startsWith("data:")
                      ? URL.createObjectURL(dataUrlToBlob(iconSrc))
                      : iconSrc;

                    downloadUrl(url, "appbrandkit-icon.png");

                    if (iconSrc.startsWith("data:")) {
                      URL.revokeObjectURL(url);
                    }
                  }}
                  type="button"
                >
                  Export PNG
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--muted)]">
                Generated icon output appears here.
              </p>
            )}
          </div>
        </div>

        <div className="glass rounded-[28px] p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Brand direction</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                Derived locally from your prompt and optional inputs.
              </p>
            </div>
            <div className="rounded-full bg-white px-4 py-2 text-sm font-medium">
              {brand.palette.name}
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            {brand.palette.colors.map((color) => (
              <div key={color} className="flex flex-col items-center gap-2">
                <div
                  className="h-14 w-14 rounded-2xl border border-black/5"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-[color:var(--muted)]">{color}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm text-[color:var(--muted)]">{brand.palette.rationale}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
                Suggested headline
              </p>
              <p className="mt-2 text-lg font-semibold">{brand.copy.headline}</p>
              <p className="mt-3 text-sm text-[color:var(--muted)]">
                {brand.copy.subheadline}
              </p>
            </div>
            <div className="rounded-3xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
                Positioning bullets
              </p>
              <ul className="mt-3 grid gap-3 text-sm text-[color:var(--foreground)]">
                {brand.copy.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="glass rounded-[28px] p-6 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Screenshot mockups</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Four templates rendered for both iPhone and iPad dimensions using canvas.
            </p>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-sm">
            {mockups.length} assets generated
          </div>
        </div>

        {mockups.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {mockups.map((mockup) => (
              <article key={mockup.id} className="rounded-[28px] bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={mockup.title}
                  className="aspect-[3/4] w-full rounded-[20px] border border-[color:var(--line)] object-cover"
                  src={mockup.dataUrl}
                />
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold capitalize">{mockup.template}</p>
                    <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">
                      {mockup.device}
                    </p>
                  </div>
                  <button
                    className="rounded-full border border-[color:var(--line)] px-4 py-2 text-sm font-medium"
                    onClick={() => downloadUrl(mockup.dataUrl, `${mockup.id}.png`)}
                    type="button"
                  >
                    Export PNG
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-[color:var(--muted)]">
            Generate an icon, then render mockups here.
          </p>
        )}
      </section>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
