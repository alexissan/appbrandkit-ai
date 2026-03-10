export type AIProvider = "openai" | "gemini" | "anthropic";

export type IconStylePreset = "glassy" | "flat-bold" | "3d-soft";

export type ScreenshotTone = "minimal" | "vibrant" | "premium";

export type StudioForm = {
  prompt: string;
  appName: string;
  tagline: string;
  features: string;
  iconStyle: IconStylePreset;
  screenshotTone: ScreenshotTone;
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

export type BrandSuggestion = {
  palette: PaletteSuggestion;
  copy: CopySuggestion;
  inferredKeywords: string[];
  featureList: string[];
};

export type MockupVariant = {
  id: string;
  device: "iphone" | "ipad";
  template: string;
  title: string;
  dataUrl: string;
};

