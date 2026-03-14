import Link from "next/link";

export const metadata = {
  title: "Magic Flow · AppBrandKit AI",
};

export default function MagicFlowPage() {
  return (
    <main className="shell flex flex-col gap-8 py-8 md:gap-10 md:py-10">
      <header className="glass rounded-[32px] p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="pill text-sm font-medium">Magic Flow</div>
            <h1 className="section-title mt-3">One guided run from brief → icon → story → screenshots</h1>
            <p className="mt-3 max-w-2xl text-sm text-[color:var(--muted)]">
              This is a first stub of the Magic Flow in AppBrandKit AI. The goal is a single, opinionated
              sequence that takes a short product brief and walks you through icon concepts, ASO story, and
              screenshot generation without bouncing between tabs.
            </p>
            <p className="mt-3 max-w-2xl text-xs text-[color:var(--muted)]">
              For now this page is just a placeholder and design anchor. The actual flow will reuse the
              Studio&apos;s project model and steps, wired into one timeline.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/studio" className="btn-primary">
              Back to Studio
            </Link>
            <Link href="/projects" className="btn-ghost">
              View projects
            </Link>
          </div>
        </div>
      </header>

      <section className="surface rounded-[28px] p-6 md:p-8">
        <h2 className="text-base font-semibold tracking-tight">Coming next</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[color:var(--muted)]">
          <li>Collect a focused product brief with a few high-signal questions.</li>
          <li>Generate 2–3 icon directions tied to that brief.</li>
          <li>Draft ASO narrative and key story beats for screenshots.</li>
          <li>Lay out a screenshot storyboard using your chosen device frames.</li>
          <li>Export assets back into a regular Studio project for further tweaking.</li>
        </ul>
      </section>
    </main>
  );
}
