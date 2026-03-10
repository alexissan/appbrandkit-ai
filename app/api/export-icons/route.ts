import JSZip from "jszip";
import { NextResponse } from "next/server";
import sharp from "sharp";

const sizes = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];

export async function POST(request: Request) {
  const body = (await request.json()) as { imageDataUrl?: string };

  if (!body.imageDataUrl) {
    return NextResponse.json({ error: "Missing image data." }, { status: 400 });
  }

  const base64 = body.imageDataUrl.split(",")[1];

  if (!base64) {
    return NextResponse.json({ error: "Invalid image payload." }, { status: 400 });
  }

  const inputBuffer = Buffer.from(base64, "base64");
  const zip = new JSZip();

  await Promise.all(
    sizes.map(async (size) => {
      const resized = await sharp(inputBuffer)
        .resize(size, size, {
          fit: "cover"
        })
        .png()
        .toBuffer();

      zip.file(`AppIcon-${size}x${size}.png`, resized);
    })
  );

  const archive = await zip.generateAsync({ type: "nodebuffer" });
  const payload = new Uint8Array(archive);

  return new NextResponse(payload, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="appbrandkit-icons.zip"'
    }
  });
}

