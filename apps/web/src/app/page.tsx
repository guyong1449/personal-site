import { siteConfig } from "@/lib/config";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-[0_16px_40px_rgba(69,47,25,0.08)]">
        <p className="mb-3 text-sm uppercase tracking-[0.2em] text-[var(--accent)]">
          Migration Phase 1
        </p>
        <h1 className="mb-4 text-5xl leading-tight">Personal Site</h1>
        <p className="max-w-3xl text-lg leading-8 text-[rgba(34,27,22,0.82)]">
          This is the Next.js bootstrap shell. Content routes are intentionally not
          connected yet. Phase 2 will add the typed adapter that reads the generated
          public snapshot under content/public.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {siteConfig.sections.map((section) => (
            <span
              key={section.href}
              className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
            >
              {section.title}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
