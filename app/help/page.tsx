import Link from "next/link";

const faqs = [
  {
    q: "Where are my API keys stored?",
    a: "Server-side OPENAI_API_KEY is preferred. Optional BYOK override in Studio is stored in browser localStorage for local MVP convenience."
  },
  {
    q: "Why can't I export icon ZIP?",
    a: "Icon ZIP currently requires a data URL icon (generated in this session). If icon came from remote URL, generate again first."
  },
  {
    q: "Can I use this for production creative?",
    a: "Yes for direction and draft assets, but review trademark, copyright, legal claims, and accessibility before shipping."
  }
];

export default function HelpPage() {
  return (
    <main className="shell flex flex-col gap-6 py-8 md:py-12">
      <header className="glass rounded-[30px] p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="section-subtitle">Help & troubleshooting</h1>
          <div className="flex gap-2">
            <Link href="/" className="btn-ghost">Home</Link>
            <Link href="/studio" className="btn-primary">Open Studio</Link>
          </div>
        </div>
      </header>

      <section className="surface rounded-[28px] p-6">
        <h2 className="text-xl font-semibold">Quick start</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[color:var(--muted)]">
          <li>Open Studio and load a starter prompt or write your app brief.</li>
          <li>Set app name, audience, value proposition, and 2–4 features.</li>
          <li>Set provider and optional BYOK key (or rely on server OPENAI_API_KEY).</li>
          <li>Generate icon concept, then screenshot set (6 frames × 2 devices).</li>
          <li>Export icon ZIP, screenshots ZIP, or full bundle ZIP.</li>
        </ol>
      </section>

      <section className="surface rounded-[28px] p-6">
        <h2 className="text-xl font-semibold">BYOK trust & safety</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[color:var(--muted)]">
          <li>Use scoped/revocable keys and rotate immediately if exposed.</li>
          <li>Avoid trademarked logos, copyrighted characters, and deceptive claims.</li>
          <li>For local macOS development, prefer Keychain flow: <code>npm run dev:keychain</code>.</li>
        </ul>
      </section>

      <section className="surface rounded-[28px] p-6">
        <h2 className="text-xl font-semibold">Troubleshooting</h2>
        <div className="mt-3 grid gap-3 text-sm text-[color:var(--muted)]">
          <p><strong>&quot;Missing/invalid API key&quot;</strong>: check OPENAI_API_KEY or BYOK input and retry.</p>
          <p><strong>Buttons disabled</strong>: required inputs missing (prompt for icon; icon or screenshots for mockups).</p>
          <p><strong>Export failed</strong>: regenerate assets first, then retry export.</p>
          <p><strong>Stale cache</strong>: clear local BYOK cache in Studio and refresh.</p>
        </div>
      </section>

      <section className="surface rounded-[28px] p-6">
        <h2 className="text-xl font-semibold">FAQ</h2>
        <div className="mt-3 grid gap-3">
          {faqs.map((item) => (
            <article key={item.q} className="rounded-2xl border border-[color:var(--line)] bg-white p-4">
              <p className="font-semibold">{item.q}</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">{item.a}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
