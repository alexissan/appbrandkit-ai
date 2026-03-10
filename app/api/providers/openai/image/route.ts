import { NextResponse } from "next/server";

type OpenAIResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

export async function POST(request: Request) {
  const body = (await request.json()) as {
    apiKey?: string;
    prompt?: string;
  };

  if (!body.apiKey || !body.prompt) {
    return NextResponse.json(
      { error: "Missing API key or prompt." },
      { status: 400 }
    );
  }

  const upstream = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${body.apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: body.prompt,
      size: "1024x1024"
    })
  });

  const payload = (await upstream.json()) as OpenAIResponse;

  if (!upstream.ok) {
    return NextResponse.json(
      {
        error: payload.error?.message ?? "OpenAI request failed."
      },
      { status: upstream.status }
    );
  }

  const result = payload.data?.[0];

  if (result?.b64_json) {
    return NextResponse.json({
      supported: true,
      imageDataUrl: `data:image/png;base64,${result.b64_json}`
    });
  }

  return NextResponse.json({
    supported: true,
    imageUrl: result?.url
  });
}

