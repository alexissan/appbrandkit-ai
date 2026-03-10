import Link from "next/link";

const examples = [
  {
    title: "Finance coach",
    copy: "Turn a budgeting prompt into a calmer palette, premium icon direction, and App Store screenshots."
  },
  {
    title: "Habit tracker",
    copy: "Generate launch visuals that feel cohesive before your first polished design sprint."
  },
  {
    title: "Creator utility",
    copy: "Explore multiple store-ready screenshot templates in minutes, not days."
  }
];

const valueProps = [
  "Bring your own provider key and keep the app free of platform secrets.",
  "Generate icon concepts, palette suggestions, launch copy, and screenshot mockups in one place.",
  "Export iOS icon packs and PNG marketing assets without opening a design suite."
];

export default function HomePage() {
  return (
    <main className="shell flex flex-col gap-10 py-8 md:gap-16 md:py-12">
      <header className="glass overflow-hidden rounded-[36px] p-6 md:p-10">
        <nav className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="pill text-sm font-medium">AppBrandKit AI</div>
          </div>
          <div className="flex items-center gap-3">
            <a className="text-sm text-[color:var(--muted)]" href="#examples">
              Examples
            </a>
            <Link
              className="rounded-full bg-[color:var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
              href="/studio"
            >
              Open Studio
            </Link>
          </div>
        </nav>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <h1 className="section-title max-w-4xl">
              From raw app idea to a credible App Store brand kit.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[color:var(--muted)] md:text-lg">
              AppBrandKit AI is an open-source MVP for founders and indie teams who need
              launch visuals fast. Feed it an app idea, bring your own AI key, and leave
              with icon concepts, copy direction, brand colors, and screenshot mockups.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-[color:var(--foreground)] px-6 py-3 text-sm font-semibold text-white"
                href="/studio"
              >
                Start in Studio
              </Link>
              <a
                className="rounded-full border border-[color:var(--line)] bg-white px-6 py-3 text-sm font-semibold"
                href="#value"
              >
                See what it does
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[32px] bg-[color:var(--foreground)] p-6 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">MVP stack</p>
              <p className="mt-3 text-3xl font-semibold">Next.js + TypeScript + Tailwind</p>
              <p className="mt-4 text-sm leading-6 text-white/80">
                OpenAI image generation works now with BYOK. Gemini and Anthropic are scaffolded
                as provider-ready stubs.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] bg-white p-5">
                <p className="text-sm font-semibold">Icon pipeline</p>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  Generate a 1024 icon concept and export iOS sizes as a ZIP.
                </p>
              </div>
              <div className="rounded-[28px] bg-white p-5">
                <p className="text-sm font-semibold">Screenshot builder</p>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  Four templates rendered for iPhone and iPad in-browser.
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="value" className="grid gap-4 md:grid-cols-3">
        {valueProps.map((item) => (
          <article key={item} className="glass rounded-[30px] p-6">
            <p className="text-lg font-semibold">Built for early launch speed</p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{item}</p>
          </article>
        ))}
      </section>

      <section id="examples" className="glass rounded-[36px] p-6 md:p-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="pill text-sm font-medium">Example outputs</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
              Use the same workflow across very different app concepts.
            </h2>
          </div>
          <Link
            className="rounded-full border border-[color:var(--line)] bg-white px-5 py-3 text-sm font-semibold"
            href="/studio"
          >
            Try your prompt
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {examples.map((example) => (
            <article key={example.title} className="rounded-[30px] bg-white p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                {example.title}
              </p>
              <p className="mt-4 text-lg font-semibold">{example.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Professional first-pass branding, without pretending it replaces design review.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[color:var(--muted)]">
            Generated assets are concepts. Check trademark, app store policy, legal claims,
            and accessibility before using anything commercially.
          </p>
        </div>
        <Link
          className="rounded-full bg-[color:var(--brand)] px-6 py-3 text-sm font-semibold text-white"
          href="/studio"
        >
          Launch the MVP
        </Link>
      </section>
    </main>
  );
}
