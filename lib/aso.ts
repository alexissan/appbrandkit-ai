import type { AsoFrame, StudioForm } from "@/lib/types";

export function parseFeatures(features: string): string[] {
  return features
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function compactText(value: string | undefined, fallback: string, maxWords: number) {
  const words = (value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (words.length === 0) {
    return fallback;
  }

  return words.slice(0, maxWords).join(" ");
}

function featureSupport(feature: string, audience: string, valueProp: string) {
  const audienceLine = compactText(audience, "your users", 4).toLowerCase();
  const valueLine = compactText(valueProp, "every day", 8);
  return `${feature} keeps ${audienceLine} moving toward ${valueLine.toLowerCase()}.`;
}

export function generateAsoNarrative(form: StudioForm): AsoFrame[] {
  const appName = compactText(form.appName, "Your app", 3);
  const audience = compactText(form.targetAudience, "busy people", 4);
  const valueProp = compactText(
    form.valueProposition || form.tagline,
    "faster progress with less friction",
    10
  );
  const features = parseFeatures(form.features);
  const firstFeature = compactText(features[0], "Fast setup", 4);
  const secondFeature = compactText(features[1], "Clear daily flow", 4);
  const thirdFeature = compactText(features[2], "Reliable progress", 4);

  return [
    {
      id: "value-promise",
      label: "Main value promise",
      headline: compactText(valueProp, `${appName} helps you move faster`, 6),
      subtext: `${appName} is built for ${audience.toLowerCase()} who want ${valueProp.toLowerCase()}.`
    },
    {
      id: "feature-one",
      label: "Core feature #1",
      headline: firstFeature,
      subtext: featureSupport(firstFeature, audience, valueProp)
    },
    {
      id: "feature-two",
      label: "Core feature #2",
      headline: secondFeature,
      subtext: featureSupport(secondFeature, audience, valueProp)
    },
    {
      id: "trust",
      label: "Social proof / trust line",
      headline: `Designed for ${audience}`,
      subtext: `${appName} pairs ${thirdFeature.toLowerCase()} with a calm, credible experience you can trust at first glance.`
    },
    {
      id: "outcome",
      label: "Outcome / benefit",
      headline: `Get more ${compactText(valueProp, "control", 2).toLowerCase()}`,
      subtext: `Spend less time managing details and more time getting the result that matters.`
    },
    {
      id: "cta",
      label: "CTA frame",
      headline: `Choose ${appName}`,
      subtext: `Download now and give ${audience.toLowerCase()} a clearer path to ${valueProp.toLowerCase()}.`
    }
  ];
}
