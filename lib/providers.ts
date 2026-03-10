import type {
  IconGenerationResult,
  ProviderConfig,
  StudioForm
} from "@/lib/types";

type ImageProviderAdapter = {
  generateIcon: (
    form: StudioForm,
    config: ProviderConfig
  ) => Promise<IconGenerationResult>;
};

const notSupportedMessage =
  "This provider is wired into the architecture, but image generation is not implemented yet in this MVP.";

const iconStylePromptMap: Record<StudioForm["iconStyle"], string> = {
  glassy:
    "Style preset: Glassy. Use translucent layers, luminous highlights, and soft depth while preserving a bold central symbol.",
  "flat-bold":
    "Style preset: Flat Bold. Use crisp geometric blocks, saturated colors, and sharp contrast with minimal effects.",
  "3d-soft":
    "Style preset: 3D Soft. Use rounded, tactile forms with subtle shadows and friendly dimensional lighting."
};

const buildIconPrompt = (form: StudioForm) => {
  const appName = form.appName.trim() || "app";
  const tagline = form.tagline.trim();
  const featureText = form.features.trim();

  return [
    `Create a premium 1024x1024 iOS app icon for ${appName}.`,
    `Product idea: ${form.prompt.trim()}.`,
    tagline ? `Tagline: ${tagline}.` : "",
    featureText ? `Core features: ${featureText}.` : "",
    iconStylePromptMap[form.iconStyle],
    "iOS icon constraints: one centered symbol, bold shape language, vivid gradient background, high contrast, and minimal clutter.",
    "No text, no letters, no numbers, no watermark, no device frame, no logo lockups.",
    "Output should look colorful, modern, and App Store-ready at first glance."
  ]
    .filter(Boolean)
    .join(" ");
};

const openAIAdapter: ImageProviderAdapter = {
  async generateIcon(form, config) {
    const response = await fetch("/api/providers/openai/image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        apiKey: config.apiKey,
        prompt: buildIconPrompt(form)
      })
    });

    const payload = (await response.json()) as IconGenerationResult & {
      error?: string;
    };

    if (!response.ok) {
      return {
        supported: true,
        message: payload.error ?? "OpenAI image generation failed."
      };
    }

    return payload;
  }
};

const placeholderAdapter: ImageProviderAdapter = {
  async generateIcon() {
    return {
      supported: false,
      message: notSupportedMessage
    };
  }
};

const providers: Record<ProviderConfig["provider"], ImageProviderAdapter> = {
  openai: openAIAdapter,
  gemini: placeholderAdapter,
  anthropic: placeholderAdapter
};

export async function generateIconWithProvider(
  form: StudioForm,
  config: ProviderConfig
): Promise<IconGenerationResult> {
  return providers[config.provider].generateIcon(form, config);
}
