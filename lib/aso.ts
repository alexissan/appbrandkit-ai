import type { AsoFrame, AsoFrameId, EditableAsoFrame, StudioForm } from "@/lib/types";

const FRAME_IDS: AsoFrameId[] = ["value-promise", "feature-one", "feature-two", "trust", "outcome", "cta"];

const FRAME_LABELS: Record<AsoFrameId, string> = {
  "value-promise": "Main value promise",
  "feature-one": "Core feature #1",
  "feature-two": "Core feature #2",
  trust: "Social proof / trust line",
  outcome: "Outcome / benefit",
  cta: "CTA frame"
};

type AsoContext = {
  appName: string;
  audience: string;
  audienceLower: string;
  valueProp: string;
  valuePropLower: string;
  promiseCore: string;
  promiseShort: string;
  primaryFeature: string;
  secondaryFeature: string;
  trustFeature: string;
  promptKeywords: string[];
  strategyWord: string;
  toneWord: string;
  downloadVerb: string;
};

function sanitize(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function words(value: string) {
  return sanitize(value)
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);
}

function sentenceCase(value: string) {
  const compact = sanitize(value);
  if (!compact) return "";
  return compact.charAt(0).toUpperCase() + compact.slice(1);
}

function lowerFirst(value: string) {
  const compact = sanitize(value);
  if (!compact) return "";
  return compact.charAt(0).toLowerCase() + compact.slice(1);
}

function titleCase(value: string) {
  return sanitize(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function takeWords(value: string | undefined, maxWords: number, fallback: string) {
  const tokens = words(value ?? "");
  if (tokens.length === 0) return fallback;
  return tokens.slice(0, maxWords).join(" ");
}

function clipText(value: string, maxLength: number) {
  const compact = sanitize(value);
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trim()}…`;
}

function compactFeature(feature: string, fallback: string) {
  const compact = takeWords(feature, 4, fallback).replace(/[.:]+$/g, "");
  return titleCase(compact);
}

export function parseFeatures(features: string): string[] {
  return features
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function pickVariant<T>(items: T[], seed: string, variant: number) {
  const index = (hashString(seed) + variant) % items.length;
  return items[index];
}

function uniqueCompact(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (!item || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferFeatures(form: StudioForm, promptKeywords: string[]) {
  const inferred = [
    `Fast setup for ${takeWords(form.targetAudience, 3, "new users")}`,
    `Clear ${promptKeywords[0] ?? "daily"} overview`,
    `Smart ${promptKeywords[1] ?? "progress"} guidance`,
    "App Store ready presentation"
  ];

  return uniqueCompact([...parseFeatures(form.features), ...inferred]).slice(0, 4);
}

function deriveStrategyWord(form: StudioForm) {
  if (form.screenshotStrategy === "premium") return "refined";
  if (form.screenshotStrategy === "playful") return "lighter";
  return "clearer";
}

function deriveToneWord(form: StudioForm) {
  if (form.screenshotTone === "premium") return "polished";
  if (form.screenshotTone === "minimal") return "focused";
  return "high-energy";
}

function extractPromptKeywords(form: StudioForm) {
  return uniqueCompact(
    `${form.prompt} ${form.tagline} ${form.valueProposition}`
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 4)
  ).slice(0, 4);
}

function buildContext(form: StudioForm): AsoContext {
  const appName = takeWords(form.appName, 3, "Your app");
  const audience = takeWords(form.targetAudience, 4, "busy teams");
  const valueProp = takeWords(
    form.valueProposition || form.tagline || form.prompt,
    10,
    "move faster with less friction"
  );
  const promptKeywords = extractPromptKeywords(form);
  const features = inferFeatures(form, promptKeywords);
  const featureHeads = features.map((feature, index) =>
    compactFeature(feature, index === 0 ? "Fast Setup" : index === 1 ? "Clear Daily Flow" : "Reliable Progress")
  );

  return {
    appName,
    audience,
    audienceLower: audience.toLowerCase(),
    valueProp,
    valuePropLower: lowerFirst(valueProp),
    promiseCore: clipText(valueProp, 58),
    promiseShort: takeWords(valueProp, 5, "Move faster daily"),
    primaryFeature: featureHeads[0] ?? "Fast Setup",
    secondaryFeature: featureHeads[1] ?? "Clear Daily Flow",
    trustFeature: featureHeads[2] ?? featureHeads[1] ?? "Reliable Progress",
    promptKeywords,
    strategyWord: deriveStrategyWord(form),
    toneWord: deriveToneWord(form),
    downloadVerb: form.screenshotStrategy === "premium" ? "Choose" : "Try"
  };
}

function buildValueFrame(context: AsoContext, seed: string, variant: number): AsoFrame {
  const headline = pickVariant(
    [
      context.promiseShort,
      `A ${context.strategyWord} way to ${takeWords(context.valuePropLower, 4, context.valuePropLower)}`,
      `${context.promiseShort}, without the drag`
    ],
    `${seed}:headline`,
    variant
  );

  const subtext = pickVariant(
    [
      `${context.appName} helps ${context.audienceLower} ${context.valuePropLower} with a ${context.toneWord} first-run story.`,
      `Built for ${context.audienceLower}, ${context.appName} turns ${context.valuePropLower} into something that feels immediate.`,
      `${context.appName} gives ${context.audienceLower} a ${context.strategyWord} path to ${context.valuePropLower}.`
    ],
    `${seed}:subtext`,
    variant
  );

  return {
    id: "value-promise",
    label: FRAME_LABELS["value-promise"],
    headline: sentenceCase(clipText(headline, 54)),
    subtext: sentenceCase(clipText(subtext, 120))
  };
}

function buildFeatureFrame(
  context: AsoContext,
  id: "feature-one" | "feature-two",
  feature: string,
  seed: string,
  variant: number
): AsoFrame {
  const featureLower = feature.toLowerCase();
  const headline = pickVariant(
    [feature, `${feature} that feels ${context.strategyWord}`, `Stay on top of ${featureLower}`],
    `${seed}:headline`,
    variant
  );

  const subtext = pickVariant(
    [
      `${feature} keeps ${context.audienceLower} moving without extra taps or second-guessing.`,
      `Use ${featureLower} to make ${context.valuePropLower} feel lighter from the first session.`,
      `${feature} turns the core job into a quicker, calmer step for ${context.audienceLower}.`
    ],
    `${seed}:subtext`,
    variant
  );

  return {
    id,
    label: FRAME_LABELS[id],
    headline: sentenceCase(clipText(headline, 54)),
    subtext: sentenceCase(clipText(subtext, 120))
  };
}

function buildTrustFrame(context: AsoContext, seed: string, variant: number): AsoFrame {
  const keyword = context.promptKeywords[0] ?? "daily";
  const headline = pickVariant(
    [`Designed for ${context.audience}`, `${context.toneWord} by design`, `Confidence in every ${keyword} check`],
    `${seed}:headline`,
    variant
  );

  const subtext = pickVariant(
    [
      `${context.appName} pairs ${context.trustFeature.toLowerCase()} with a calm interface that reads as credible at a glance.`,
      `The flow stays ${context.toneWord} and trustworthy, so ${context.audienceLower} can act faster with less doubt.`,
      `${context.trustFeature} and clean hierarchy give the product a more believable, premium feel.`
    ],
    `${seed}:subtext`,
    variant
  );

  return {
    id: "trust",
    label: FRAME_LABELS.trust,
    headline: sentenceCase(clipText(headline, 54)),
    subtext: sentenceCase(clipText(subtext, 120))
  };
}

function buildOutcomeFrame(context: AsoContext, seed: string, variant: number): AsoFrame {
  const keyword = context.promptKeywords[1] ?? "progress";
  const headline = pickVariant(
    [`More ${keyword}, less friction`, `Make space for the result`, `See results sooner`],
    `${seed}:headline`,
    variant
  );

  const subtext = pickVariant(
    [
      `Spend less time managing details and more time getting the outcome that actually matters.`,
      `${context.appName} removes drag so ${context.audienceLower} can focus on the win, not the workflow.`,
      `A tighter flow means more energy goes into results instead of setup, checking, and cleanup.`
    ],
    `${seed}:subtext`,
    variant
  );

  return {
    id: "outcome",
    label: FRAME_LABELS.outcome,
    headline: sentenceCase(clipText(headline, 54)),
    subtext: sentenceCase(clipText(subtext, 120))
  };
}

function buildCtaFrame(context: AsoContext, seed: string, variant: number): AsoFrame {
  const headline = pickVariant(
    [`${context.downloadVerb} ${context.appName}`, `${context.promiseShort}. Start now`, `Start with ${context.appName}`],
    `${seed}:headline`,
    variant
  );

  const subtext = pickVariant(
    [
      `Download now to give ${context.audienceLower} a ${context.strategyWord} route to ${context.valuePropLower}.`,
      `Bring ${context.promiseCore.toLowerCase()} into a product story that feels ready to trust from day one.`,
      `${context.appName} is ready when you want a ${context.toneWord} way to ${context.valuePropLower}.`
    ],
    `${seed}:subtext`,
    variant
  );

  return {
    id: "cta",
    label: FRAME_LABELS.cta,
    headline: sentenceCase(clipText(headline, 54)),
    subtext: sentenceCase(clipText(subtext, 120))
  };
}

function frameSeed(form: StudioForm, id: AsoFrameId) {
  return [
    id,
    form.appName,
    form.prompt,
    form.targetAudience,
    form.valueProposition,
    form.features,
    form.screenshotStrategy,
    form.screenshotTone
  ].join("|");
}

function buildFrame(form: StudioForm, id: AsoFrameId, variant: number): AsoFrame {
  const context = buildContext(form);
  const seed = frameSeed(form, id);

  switch (id) {
    case "value-promise":
      return buildValueFrame(context, seed, variant);
    case "feature-one":
      return buildFeatureFrame(context, id, context.primaryFeature, seed, variant);
    case "feature-two":
      return buildFeatureFrame(context, id, context.secondaryFeature, seed, variant);
    case "trust":
      return buildTrustFrame(context, seed, variant);
    case "outcome":
      return buildOutcomeFrame(context, seed, variant);
    case "cta":
      return buildCtaFrame(context, seed, variant);
  }
}

export function generateAsoNarrative(form: StudioForm): AsoFrame[] {
  return FRAME_IDS.map((id) => buildFrame(form, id, 0));
}

export function createEditableAsoNarrative(form: StudioForm): EditableAsoFrame[] {
  return FRAME_IDS.map((id) => ({ ...buildFrame(form, id, 0), variant: 0 }));
}

export function regenerateAsoFrame(
  form: StudioForm,
  frameId: AsoFrameId,
  currentVariant: number
): EditableAsoFrame {
  const variant = currentVariant + 1;
  return { ...buildFrame(form, frameId, variant), variant };
}
