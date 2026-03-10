# AppBrandKit AI

Open-source MVP web app for turning an app idea into a starter brand kit with BYOK AI providers.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- `sharp` + `jszip` for icon export
- Canvas for screenshot mockups

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## BYOK

The studio stores the selected provider and API key in `localStorage` so the app can reuse them locally between refreshes.

This is intentionally convenient for an MVP and insecure for production. Do not ship this storage model in a real multi-user app. Use a proper server-side secret management flow instead.

## What Works Now

- Landing page at `/`
- Studio at `/studio`
- Provider abstraction with OpenAI, Gemini, and Anthropic options
- Real OpenAI image generation path for app icon concepts via BYOK
- Local brand palette and marketing copy suggestions derived heuristically from the prompt
- Screenshot mockup generation with 4 templates for both iPhone and iPad outputs
- PNG export for generated icon and screenshot mockups
- iOS icon ZIP export containing common app icon sizes
- Legal, trademark, and safety disclaimers in the UI

## Stubbed / Not Yet Implemented

- Gemini image generation
- Anthropic image generation
- Persistent project history
- Auth, teams, hosted key management, and production-safe secret handling
- Rich editing controls for template text/layout

## Roadmap

- Add support for Gemini and Anthropic image generation
- Add upload/import for user-supplied icon sources
- Add more screenshot templates and store metadata helpers
- Add downloadable brand brief JSON/PDF
- Add project saves and collaboration

## Notes

- OpenAI image generation requires a valid API key and network access from the server route.
- The icon ZIP export currently expects a generated data URL image; remote URL-only outputs are previewable but not zipped.
- Review all generated assets before commercial use.

