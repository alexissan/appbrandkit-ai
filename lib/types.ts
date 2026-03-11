export type AIProvider = "openai" | "gemini" | "anthropic";

export type IconStylePreset = "glassy" | "flat-bold" | "3d-soft";

export type ScreenshotTone = "minimal" | "vibrant" | "premium";

export type ScreenshotStrategy = "conversion" | "premium" | "playful";

export type StudioForm = {
  prompt: string;
  appName: string;
  tagline: string;
  targetAudience: string;
  valueProposition: string;
  features: string;
  iconStyle: IconStylePreset;
  screenshotTone: ScreenshotTone;
  screenshotStrategy: ScreenshotStrategy;
};

export type ProviderConfig = {
  provider: AIProvider;
  apiKey: string;
};

export type IconGenerationResult = {
  imageDataUrl?: string;
  imageUrl?: string;
  message?: string;
  supported: boolean;
};

export type PaletteSuggestion = {
  name: string;
  colors: string[];
  rationale: string;
};

export type CopySuggestion = {
  headline: string;
  subheadline: string;
  bullets: string[];
};

export type AsoFrameId =
  | "value-promise"
  | "feature-one"
  | "feature-two"
  | "trust"
  | "outcome"
  | "cta";

export type AsoFrame = {
  id: AsoFrameId;
  label: string;
  headline: string;
  subtext: string;
};

export type EditableAsoFrame = AsoFrame & {
  variant: number;
};

export type BrandSuggestion = {
  palette: PaletteSuggestion;
  copy: CopySuggestion;
  inferredKeywords: string[];
  featureList: string[];
};

export type MockupVariant = {
  id: string;
  device: "iphone" | "ipad";
  template: AsoFrameId;
  title: string;
  dataUrl: string;
};

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  form: StudioForm;
  iconSrc: string | null;
  mockups: MockupVariant[];
  slideFrames: EditableAsoFrame[];
  provider: AIProvider;
};
