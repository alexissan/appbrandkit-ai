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
      `${context.promiseShort} in minutes`,
      `${takeWords(context.valuePropLower, 4, context.valuePropLower)} starts here`,
      `Skip the wait, ${context.valuePropLower}`,
      `Your shortcut to ${context.valuePropLower}`,
      `${context.promiseShort}, no hassle`
    ],
    `${seed}:headline`,
    variant
  );

  const subtext = pickVariant(
    [
      `${context.appName} brings ${context.audienceLower} exactly what they need: ${context.valuePropLower}.`,
      `Built for ${context.audienceLower} who want results, not complexity.`,
      `See instant value. No learning curve required.`,
      `${context.appName} removes friction so you can focus on outcomes.`,
      `Join ${context.audienceLower} who've simplified their workflow.`,
      `Transform how ${context.audienceLower} achieve ${context.valuePropLower}.`
    ],
    `${seed}:subtext`,
    variant
  );

  return {
    id: "value-promise",
    label: FRAME_LABELS["value-promise"],
    headline: sentenceCase(clipText(headline, 50)),
    subtext: sentenceCase(clipText(subtext, 100))
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
  const isPrimary = id === "feature-one";
  
  const headline = pickVariant(
    isPrimary
      ? [
          `${feature} in seconds`,
          `Unlock ${featureLower} instantly`,
          `${feature} without the wait`,
          `Get ${featureLower} right away`,
          `Access ${featureLower} effortlessly`,
          `${feature} at your fingertips`
        ]
      : [
          `${feature} you'll actually use`,
          `Master ${featureLower} quickly`,
          `${feature} that adapts to you`,
          `Powerful ${featureLower} made simple`,
          `${feature} built for speed`,
          `Smarter ${featureLower} workflows`
        ],
    `${seed}:headline`,
    variant
  );

  const subtext = pickVariant(
    isPrimary
      ? [
          `Save hours with ${featureLower} that works from day one.`,
          `Zero setup required. Start using ${featureLower} immediately.`,
          `${feature} designed to eliminate busywork.`,
          `Tap once and ${featureLower} handles the rest.`,
          `Watch ${context.audienceLower} accomplish more in less time.`,
          `Built to make ${featureLower} feel automatic.`
        ]
      : [
          `${feature} completes tasks ${context.audienceLower} used to dread.`,
          `Go deeper with ${featureLower} that scales alongside you.`,
          `Advanced ${featureLower} without the complexity.`,
          `Everything about ${featureLower} is intuitive and reliable.`,
          `Push further using ${featureLower} tailored for ${context.audienceLower}.`,
          `${feature} turns ambitious goals into daily wins.`
        ],
    `${seed}:subtext`,
    variant
  );

  return {
    id,
    label: FRAME_LABELS[id],
    headline: sentenceCase(clipText(headline, 50)),
    subtext: sentenceCase(clipText(subtext, 100))
  };
}

function buildTrustFrame(context: AsoContext, seed: string, variant: number): AsoFrame {
  const keyword = context.promptKeywords[0] ?? "daily";
  const headline = pickVariant(
    [
      `Trusted by ${context.audience}`,
      `Built with ${context.audience} in mind`,
      `Reliable for every ${keyword} task`,
      `${context.audience} depend on us`,
      `Privacy-first for ${context.audience}`,
      `Secure and dependable`
    ],
    `${seed}:headline`,
    variant
  );

  const subtext = pickVariant(
    [
      `${context.trustFeature} keeps data safe while delivering speed.`,
      `Thousands of ${context.audienceLower} trust ${context.appName} daily.`,
      `Bank-level security meets intuitive design.`,
      `Your information stays private. Always.`,
      `${context.appName} earns trust through transparency and performance.`,
      `Rest easy knowing ${context.trustFeature.toLowerCase()} protects you.`
    ],
    `${seed}:subtext`,
    variant
  );

  return {
    id: "trust",
    label: FRAME_LABELS.trust,
    headline: sentenceCase(clipText(headline, 50)),
    subtext: sentenceCase(clipText(subtext, 100))
  };
}

function buildOutcomeFrame(context: AsoContext, seed: string, variant: number): AsoFrame {
  const keyword = context.promptKeywords[1] ?? "progress";
  const headline = pickVariant(
    [
      `Achieve real ${keyword} faster`,
      `See tangible results today`,
      `Unlock measurable improvements`,
      `Drive outcomes, not busywork`,
      `Reach your goals quicker`,
      `Accomplish more, stress less`
    ],
    `${seed}:headline`,
    variant
  );

  const subtext = pickVariant(
    [
      `Stop wasting time on overhead and start seeing wins.`,
      `${context.appName} converts effort into clear achievements.`,
      `Measure what matters and watch ${keyword} accelerate.`,
      `Focus on impact while ${context.appName} handles details.`,
      `Turn daily tasks into meaningful milestones.`,
      `Experience the satisfaction of consistent ${keyword}.`
    ],
    `${seed}:subtext`,
    variant
  );

  return {
    id: "outcome",
    label: FRAME_LABELS.outcome,
    headline: sentenceCase(clipText(headline, 50)),
    subtext: sentenceCase(clipText(subtext, 100))
  };
}

function buildCtaFrame(context: AsoContext, seed: string, variant: number): AsoFrame {
  const headline = pickVariant(
    [
      `Download ${context.appName} free`,
      `Start your journey today`,
      `Get ${context.appName} now`,
      `Join thousands already succeeding`,
      `Try ${context.appName} risk-free`,
      `Begin in under 30 seconds`
    ],
    `${seed}:headline`,
    variant
  );

  const subtext = pickVariant(
    [
      `Tap download and experience ${context.valuePropLower} immediately.`,
      `No credit card. No commitment. Just results.`,
      `Start achieving ${context.promiseCore.toLowerCase()} today.`,
      `Free to try, built for ${context.audienceLower} who demand quality.`,
      `Install now and discover why ${context.audienceLower} love us.`,
      `Ready when you are. Download takes seconds.`
    ],
    `${seed}:subtext`,
    variant
  );

  return {
    id: "cta",
    label: FRAME_LABELS.cta,
    headline: sentenceCase(clipText(headline, 50)),
    subtext: sentenceCase(clipText(subtext, 100))
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
