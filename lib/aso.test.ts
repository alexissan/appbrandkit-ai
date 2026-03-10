import test from "node:test";
import assert from "node:assert/strict";
import { createEditableAsoNarrative, parseFeatures, regenerateAsoFrame } from "./aso.ts";
import type { StudioForm } from "./types.ts";

const form: StudioForm = {
  prompt:
    "A planning app for creators to turn content ideas into weekly publishing sprints with clearer priorities.",
  appName: "PulseBoard",
  tagline: "Ship stronger content every week.",
  targetAudience: "Short-form creators",
  valueProposition: "Plan and publish stronger content in less time",
  features: "Weekly sprint planner\nHook library\nPerformance recap",
  iconStyle: "glassy",
  screenshotTone: "premium",
  screenshotStrategy: "conversion"
};

test("parseFeatures trims entries and caps the list", () => {
  assert.deepEqual(parseFeatures(" One,\nTwo\nThree, Four, Five, Six, Seven "), [
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six"
  ]);
});

test("createEditableAsoNarrative returns six concise, unique frames", () => {
  const frames = createEditableAsoNarrative(form);

  assert.equal(frames.length, 6);
  assert.equal(new Set(frames.map((frame) => frame.id)).size, 6);
  assert.equal(new Set(frames.map((frame) => frame.headline)).size, 6);
  assert.ok(frames.every((frame) => frame.variant === 0));
  assert.ok(frames.every((frame) => frame.headline.split(/\s+/).length <= 8));
  assert.ok(frames.every((frame) => frame.subtext.length <= 120));
});

test("regenerateAsoFrame only changes the selected frame variant deterministically", () => {
  const base = createEditableAsoNarrative(form);
  const featureOne = base.find((frame) => frame.id === "feature-one");

  assert.ok(featureOne);

  const regenerated = regenerateAsoFrame(form, "feature-one", featureOne.variant);

  assert.equal(regenerated.id, "feature-one");
  assert.equal(regenerated.variant, 1);
  assert.notEqual(`${regenerated.headline} ${regenerated.subtext}`, `${featureOne.headline} ${featureOne.subtext}`);
  assert.equal(regenerateAsoFrame(form, "feature-one", featureOne.variant).headline, regenerated.headline);
  assert.equal(regenerateAsoFrame(form, "feature-one", featureOne.variant).subtext, regenerated.subtext);
});
