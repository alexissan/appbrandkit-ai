import test from "node:test";
import assert from "node:assert/strict";
import { canExportBundle, canExportIcons, canExportScreenshots } from "./export.ts";

test("canExportIcons validates source", () => {
  assert.equal(canExportIcons("").ok, false);
  assert.equal(canExportIcons("https://example.com/icon.png").ok, false);
  assert.equal(canExportIcons("data:image/png;base64,abcd").ok, true);
});

test("canExportScreenshots validates count", () => {
  assert.equal(canExportScreenshots(0).ok, false);
  assert.equal(canExportScreenshots(1).ok, true);
});

test("canExportBundle validates minimum assets", () => {
  assert.equal(canExportBundle("", 0).ok, false);
  assert.equal(canExportBundle("data:image/png;base64,abcd", 0).ok, true);
  assert.equal(canExportBundle("", 2).ok, true);
});
