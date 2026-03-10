import Image from "next/image";
import Link from "next/link";

const valueProps = [
  {
    title: "Ship polished concepts faster",
    copy: "Turn one product prompt into icon options, App Store-style screenshots, and copy direction in minutes."
  },
  {
    title: "Bring your own key (BYOK)",
    copy: "Use your OpenAI / Gemini / Anthropic provider key. You control usage and billing."
  },
  {
    title: "Export-ready assets",
    copy: "Download iOS icon bundles and high-resolution PNG mockups without opening Figma first."
  }
];

const workflow = [
  {
    step: "01",
    title: "Describe your app",
    copy: "Paste your app idea, audience, and core features in plain English."
  },
  {
    step: "02",
    title: "Generate your kit",
    copy: "Create icon concepts, color direction, messaging hooks, and screenshot layouts."
  },
  {
    step: "03",
    title: "Refine and export",
    copy: "Pick the strongest direction, tweak copy, and export launch-ready image assets."
  }
];

const examples = [
  {
    name: "TidalFlow",
    description: "Marine forecasting and route confidence for sailors planning weekend and offshore trips.",
    icon: "/examples/tidalflow/icon.png",
    shots: ["/examples/tidalflow/screen-1.png", "/examples/tidalflow/screen-2.png"]
  },
  {
    name: "PulseBoard",
    description: "A team operating rhythm app that blends check-ins, streaks, and momentum tracking.",
    icon: "/examples/pulseboard/icon.png",
    shots: ["/examples/pulseboard/screen-1.png", "/examples/pulseboard/screen-2.png"]
  },
  {
    name: "NestNote",
    description: "Family organizer with shared reminders, grocery planning, and home routines.",
    icon: "/examples/nestnote/icon.png",
    shots: ["/examples/nestnote/screen-1.png", "/examples/nestnote/screen-2.png"]
  }
];

export default function HomePage() {
  return (
    <main className="shell flex flex-col gap-10 py-8 md:gap-16 md:py-12">
      <header className="glass overflow-hidden rounded-[36px] p-6 md:p-10">
        <nav className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="pill text-sm font-medium">AppBrandKit AI</div>
          <div className="flex items-center gap-3">
            <a className="text-sm text-[color:var(--muted)]" href="#examples">
              Real examples
            </a>
            <Link
              className="rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
              href="/studio"
            >
              Open Studio
            </Link>
          </div>
        </nav>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <h1 className="section-title max-w-4xl">Launch-brand visuals for your app, without waiting on a full design sprint.</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[color:var(--muted)] md:text-lg">
              AppBrandKit AI helps founders and indie teams move from rough app idea to credible
              launch assets: icon concepts, color direction, copy hooks, and screenshot mockups.
              Bring your own model key and keep control of your provider usage.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-[color:var(--foreground)] px-6 py-3 text-sm font-semibold text-white"
                href="/studio"
              >
                Generate my brand kit
              </Link>
              <a
                className="rounded-full border border-[color:var(--line)] bg-white px-6 py-3 text-sm font-semibold"
                href="#how-it-works"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[32px] bg-[color:var(--foreground)] p-6 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Built for speed</p>
              <p className="mt-3 text-3xl font-semibold">From prompt to App Store-ready concepts</p>
              <p className="mt-4 text-sm leading-6 text-white/80">
                Prototype your visual direction quickly, then hand over stronger drafts to design and growth.
              </p>
            </div>
            <div className="rounded-[28px] bg-white p-5">
              <p className="text-sm font-semibold">Trust-first BYOK workflow</p>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                Keys are kept in local browser storage for this MVP. No managed backend key vault, no lock-in.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section id="value" className="grid gap-4 md:grid-cols-3">
        {valueProps.map((item) => (
          <article key={item.title} className="glass rounded-[30px] p-6">
            <p className="text-lg font-semibold">{item.title}</p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{item.copy}</p>
          </article>
        ))}
      </section>

      <section id="how-it-works" className="glass rounded-[36px] p-6 md:p-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="pill text-sm font-medium">How it works</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">A simple 3-step workflow for launch teams.</h2>
          </div>
          <Link className="rounded-full border border-[color:var(--line)] bg-white px-5 py-3 text-sm font-semibold" href="/studio">
            Start now
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {workflow.map((item) => (
            <article key={item.step} className="rounded-[30px] bg-white p-6">
              <p className="text-xs font-semibold tracking-[0.18em] text-[color:var(--brand)]">STEP {item.step}</p>
              <p className="mt-3 text-xl font-semibold">{item.title}</p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="examples" className="glass rounded-[36px] p-6 md:p-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="pill text-sm font-medium">Real Examples</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">See sample concepts generated as local demo assets.</h2>
          </div>
          <Link className="rounded-full border border-[color:var(--line)] bg-white px-5 py-3 text-sm font-semibold" href="/studio">
            Try your own prompt
          </Link>
        </div>

        <div className="mt-8 grid gap-6">
          {examples.map((example) => (
            <article key={example.name} className="rounded-[30px] bg-white p-5 md:p-6">
              <div className="grid gap-5 lg:grid-cols-[280px_1fr] lg:items-center">
                <div className="flex flex-col gap-4">
                  <Image src={example.icon} alt={`${example.name} icon`} width={220} height={220} className="h-40 w-40 rounded-[28px] border border-[color:var(--line)] object-cover shadow-sm" />
                  <div>
                    <p className="text-xl font-semibold">{example.name}</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{example.description}</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {example.shots.map((shot) => (
                    <Image
                      key={shot}
                      src={shot}
                      alt={`${example.name} screenshot`}
                      width={420}
                      height={910}
                      className="aspect-[3/5] w-full rounded-[24px] border border-[color:var(--line)] object-cover"
                    />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Build confidence before you spend weeks polishing.</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[color:var(--muted)]">
            This tool creates fast concept directions, not final legal or brand approval. Validate trademarks,
            store policy, and accessibility before shipping. BYOK keeps ownership and spend with your accounts.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link className="rounded-full bg-[color:var(--brand)] px-6 py-3 text-sm font-semibold text-white" href="/studio">
            Open Studio
          </Link>
          <a className="rounded-full border border-[color:var(--line)] bg-white px-6 py-3 text-center text-sm font-semibold" href="#examples">
            Browse real examples
          </a>
        </div>
      </section>
    </main>
  );
}
