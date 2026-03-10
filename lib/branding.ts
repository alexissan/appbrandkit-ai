import type { BrandSuggestion, PaletteSuggestion, StudioForm } from "@/lib/types";

const paletteBank: PaletteSuggestion[] = [
  {
    name: "Calm Operator",
    colors: ["#0F766E", "#14B8A6", "#F8FAFC", "#172033"],
    rationale: "Trust-led teal system suited to utility, health, and workflow products."
  },
  {
    name: "Launch Signal",
    colors: ["#1D4ED8", "#60A5FA", "#F97316", "#FFF7ED"],
    rationale: "Bright contrast for ambitious consumer and productivity launches."
  },
  {
    name: "Quiet Wealth",
    colors: ["#14532D", "#84CC16", "#F5F5F4", "#292524"],
    rationale: "Grounded premium palette for finance, wellness, and B2B tools."
  },
  {
    name: "Night Arcade",
    colors: ["#7C3AED", "#EC4899", "#111827", "#F9FAFB"],
    rationale: "High-energy palette for entertainment, creator, and social concepts."
  }
];

function normalizeWords(form: StudioForm): string[] {
  return `${form.prompt} ${form.appName} ${form.tagline} ${form.features}`
    .toLowerCase()
    .replace(/[^a-z0-9,\s-]/g, " ")
    .split(/[\s,\n]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2);
}

function choosePalette(words: string[]): PaletteSuggestion {
  const joined = words.join(" ");

  if (/(finance|budget|money|wealth|bank|invest|tax)/.test(joined)) {
    return paletteBank[2];
  }

  if (/(game|music|social|video|creator|stream|fun)/.test(joined)) {
    return paletteBank[3];
  }

  if (/(health|habit|wellness|care|focus|mind|calm)/.test(joined)) {
    return paletteBank[0];
  }

  return paletteBank[1];
}

function makeFeatureList(form: StudioForm, words: string[]): string[] {
  const provided = form.features
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (provided.length >= 3) {
    return provided.slice(0, 4);
  }

  const inferred = [
    `Fast onboarding for ${words[0] ?? "users"}`,
    "Clean first-run experience",
    "Confidence-building product messaging",
    "App Store ready visual system"
  ];

  return [...provided, ...inferred].slice(0, 4);
}

export function deriveBrandSuggestion(form: StudioForm): BrandSuggestion {
  const words = normalizeWords(form);
  const palette = choosePalette(words);
  const featureList = makeFeatureList(form, words);
  const appName = form.appName.trim() || "Your App";
  const inferredKeywords = Array.from(new Set(words)).slice(0, 6);
  const headline = form.tagline.trim() || `${appName} makes ${words[0] ?? "work"} feel simple.`;

  return {
    palette,
    inferredKeywords,
    featureList,
    copy: {
      headline,
      subheadline: `Position ${appName} as a polished, trustworthy app from day one with a cohesive brand kit and launch-ready screenshots.`,
      bullets: [
        `Lead with ${palette.name.toLowerCase()} styling across the icon and screenshots.`,
        `Emphasize ${featureList[0]?.toLowerCase() ?? "clarity"} in app store copy.`,
        "Keep trademarked names, logos, and celebrity likenesses out of generated assets."
      ]
    }
  };
}

