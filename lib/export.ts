export type ExportReadiness = {
  ok: boolean;
  reason?: string;
};

export function canExportIcons(iconSrc: string): ExportReadiness {
  if (!iconSrc) return { ok: false, reason: "Generate or paste an icon first." };
  if (!iconSrc.startsWith("data:image")) {
    return { ok: false, reason: "Icon ZIP needs a generated data URL image." };
  }
  return { ok: true };
}

export function canExportScreenshots(count: number): ExportReadiness {
  if (count <= 0) return { ok: false, reason: "Generate screenshots first, then export ZIP." };
  return { ok: true };
}

export function canExportBundle(iconSrc: string, screenshotCount: number): ExportReadiness {
  if (!iconSrc && screenshotCount <= 0) {
    return { ok: false, reason: "Nothing to export yet. Generate icon and/or screenshots first." };
  }
  return { ok: true };
}
