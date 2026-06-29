/** Phase 0 tab stub — navigation works; real content lands in later phases. */
export function PagePlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-muted-foreground">{description}</p>
      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm font-medium">Coming in {phase}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The shell and navigation are live — this tab’s features are next.
        </p>
      </div>
    </section>
  );
}
