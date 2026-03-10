import Image from "next/image";
import Link from "next/link";

const valueProps = [
  {
    title: "AI-led direction, not random outputs",
    copy: "Get narrative-led icon and screenshot concepts designed around ASO sequencing, not one-off image prompts."
  },
  {
    title: "BYOK with full control",
    copy: "Use your OpenAI, Gemini, or Anthropic key. Costs and usage stay in your own accounts."
  },
  {
    title: "Open-source and editable",
    copy: "You own the workflow, can inspect every prompt path, and can adapt templates for your team."
  }
];

const workflow = [
  {
    step: "01",
    title: "Define your app narrative",
    copy: "Start from your audience, category, and core value proposition."
  },
  {
    step: "02",
    title: "Generate icon + ASO storyboard",
    copy: "Create six screenshot frames with conversion-aware copy hierarchy."
  },
  {
    step: "03",
    title: "Refine, export, and ship",
    copy: "Export iPhone/iPad visual assets and continue polish in your existing flow."
  }
];

const examples = [
  {
    name: "TidalFlow",
    category: "Marine Forecasting",
    description: "Safety-first marine planning with route confidence and launch windows.",
    icon: "/examples/tidalflow/icon.png",
    shots: ["/examples/tidalflow/screen-1.png", "/examples/tidalflow/screen-2.png"]
  },
  {
    name: "PulseBoard",
    category: "Creator OS",
    description: "Weekly growth planning, publishing rhythm, and repeatable content loops.",
    icon: "/examples/pulseboard/icon.png",
    shots: ["/examples/pulseboard/screen-1.png", "/examples/pulseboard/screen-2.png"]
  },
  {
    name: "NestNote",
    category: "Family Planner",
    description: "Shared household operations with reminders, groceries, and routines.",
    icon: "/examples/nestnote/icon.png",
    shots: ["/examples/nestnote/screen-1.png", "/examples/nestnote/screen-2.png"]
  }
];

const socialProof = [
  { label: "Teams testing weekly", value: "120+" },
  { label: "Assets generated", value: "35k+" },
  { label: "Avg. setup time", value: "< 10 min" }
];

export default function HomePage() {
  return (
    <main className="shell flex flex-col gap-8 py-8 md:gap-14 md:py-12">
      <header className="glass overflow-hidden rounded-[36px] p-6 md:p-10">
        <nav className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="pill text-sm font-medium">AppBrandKit AI</div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <a className="text-[color:var(--muted)]" href="#examples">Examples</a>
            <a className="text-[color:var(--muted)]" href="#how-it-works">Workflow</a>
            <Link className="text-[color:var(--muted)]" href="/help">Help</Link>
            <Link className="btn-primary" href="/studio">Open Studio</Link>
          </div>
        </nav>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">AI + BYOK + Open Source</p>
            <h1 className="section-title mt-4 max-w-4xl">Turn app ideas into premium, App Store-ready screenshot stories.</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[color:var(--muted)] md:text-lg">
              AppBrandKit AI helps founders and product teams move from rough concept to credible launch visuals.
              Generate icon directions, ASO narrative copy, and polished screenshot templates without handing over provider control.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="btn-primary" href="/studio">Generate my brand kit</Link>
              <a className="btn-ghost" href="#examples">See visual examples</a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {socialProof.map((item) => (
                <div key={item.label} className="surface rounded-2xl p-4">
                  <p className="text-2xl font-semibold tracking-tight">{item.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="surface rounded-[30px] p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--brand-strong)]">Product narrative</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight">Design intent first. Visual output second.</p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                Start with audience and value prop, then map six screenshot frames that mirror real App Store storytelling.
              </p>
            </div>
            <div className="surface rounded-[30px] p-6">
              <p className="text-sm font-semibold">Trust-first architecture</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                Bring your own provider key. This MVP stores BYOK preferences locally and keeps workflow transparent.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {valueProps.map((item) => (
          <article key={item.title} className="surface rounded-[28px] p-6">
            <p className="text-lg font-semibold tracking-tight">{item.title}</p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{item.copy}</p>
          </article>
        ))}
      </section>

      <section id="how-it-works" className="glass rounded-[36px] p-6 md:p-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="pill text-sm font-medium">How it works</div>
            <h2 className="section-subtitle mt-4 max-w-4xl">A clearer path from prompt to conversion-ready screenshots.</h2>
          </div>
          <Link className="btn-ghost" href="/studio">Start in studio</Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {workflow.map((item) => (
            <article key={item.step} className="surface rounded-[28px] p-6">
              <p className="text-xs font-semibold tracking-[0.18em] text-[color:var(--brand)]">STEP {item.step}</p>
              <p className="mt-3 text-xl font-semibold tracking-tight">{item.title}</p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="examples" className="glass rounded-[36px] p-6 md:p-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="pill text-sm font-medium">Showcase</div>
            <h2 className="section-subtitle mt-4 max-w-4xl">Template-driven examples with stronger framing and hierarchy.</h2>
          </div>
          <Link className="btn-ghost" href="/studio">Try your own prompt</Link>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {examples.map((example) => (
            <article key={example.name} className="surface rounded-[28px] p-5">
              <div className="flex items-center gap-4">
                <Image src={example.icon} alt={`${example.name} icon`} width={88} height={88} className="h-20 w-20 rounded-[22px] border border-[color:var(--line)] object-cover" />
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">{example.category}</p>
                  <p className="mt-1 text-xl font-semibold tracking-tight">{example.name}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{example.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {example.shots.map((shot) => (
                  <Image key={shot} src={shot} alt={`${example.name} screenshot`} width={420} height={910} className="aspect-[3/5] w-full rounded-[18px] border border-[color:var(--line)] object-cover" />
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="surface grid gap-5 rounded-[32px] p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
        <div>
          <h2 className="section-subtitle max-w-3xl">Build confidence before investing in final brand execution.</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[color:var(--muted)]">
            AppBrandKit AI is designed for concept velocity and narrative direction. Validate legal, trademark,
            and accessibility standards before launch.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link className="btn-primary text-center" href="/studio">Open Studio</Link>
          <a className="btn-ghost text-center" href="#examples">Browse examples</a>
        </div>
      </section>
    </main>
  );
}
