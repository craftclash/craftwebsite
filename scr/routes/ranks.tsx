import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/Reveal";
import { StoreBrowser } from "@/components/site/StoreBrowser";
import { seo } from "@/lib/seo";

function RankArmorStand() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-10" aria-label="Membership progression showcase">
      <div className="rank-showcase premium-showcase relative grid min-h-64 overflow-hidden rounded-[2rem] border bg-card px-6 py-8 shadow-soft md:grid-cols-[1fr_1.35fr]">
        <div className="relative z-10 flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-ink">Player progression</p>
          <h2 className="mt-2 text-3xl">Choose your legacy</h2>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Membership benefits build up from loyal player to server legend.
          </p>
        </div>
        <div className="premium-pedestals" aria-hidden>
          {[
            ["I", "stone"],
            ["II", "iron"],
            ["III", "gold"],
            ["IV", "amethyst"],
          ].map(([level, material]) => (
            <div className={`premium-pedestal premium-pedestal-${material}`} key={level}>
              <span className="premium-orb" />
              <span className="premium-ring" />
              <strong>{level}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export const Route = createFileRoute("/ranks")({
  head: () => seo("Ranks", "Permanent ranks packed with perks, homes and prestige."),
  component: () => (
    <>
      <PageHeader title="Ranks" sub="Permanent ranks packed with perks, homes and prestige." />
      <RankArmorStand />
      <StoreBrowser category="ranks" />
    </>
  ),
});
