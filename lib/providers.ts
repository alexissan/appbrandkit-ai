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

const buildIconPrompt = (form: StudioForm) => {
  const appName = form.appName.trim() || "app";
  const tagline = form.tagline.trim();
  const featureText = form.features.trim();

  return [
    `Create a clean 1024x1024 mobile app icon concept for ${appName}.`,
    `Product idea: ${form.prompt.trim()}.`,
    tagline ? `Tagline: ${tagline}.` : "",
    featureText ? `Core features: ${featureText}.` : "",
    "Style: premium, geometric, high contrast, simple silhouette, no tiny text, no device frame, no watermark, App Store friendly."
  ]
    .filter(Boolean)
    .join(" ");
};

const openAIAdapter: ImageProviderAdapter = {
  async generateIcon(form, config) {
    if (!config.apiKey.trim()) {
      return {
        supported: true,
        message: "Add an OpenAI API key to generate an icon."
      };
    }

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

