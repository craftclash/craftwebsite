import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/Reveal";
import { StoreBrowser } from "@/components/site/StoreBrowser";
import { seo } from "@/lib/seo";

function CrateShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-10" aria-label="Rewards showcase">
      <div className="crate-showcase premium-showcase relative overflow-hidden rounded-[2rem] border bg-card px-6 py-8 shadow-soft">
        <div className="relative z-10 max-w-md">
          <p className="text-sm font-semibold uppercase tracking-widest text-ink">Treasure vault</p>
          <h2 className="mt-2 text-3xl">Open the unexpected</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Keys unlock a mix of cosmetic and gameplay rewards, with a new drop waiting in every chest.
          </p>
        </div>
        <div className="reward-orbits" aria-hidden>
          <div className="reward-orbit reward-orbit-common"><span /></div>
          <div className="reward-orbit reward-orbit-rare"><span /></div>
          <div className="reward-orbit reward-orbit-epic"><span /></div>
        </div>
      </div>
    </section>
  );
}

export const Route = createFileRoute("/crates")({
  head: () => seo("Crate Keys", "Unlock rare loot with Craft SMP crate keys."),
  component: () => (
    <>
      <PageHeader
        title="Crate Keys"
        sub="Unlock rare loot with a key for every adventurer."
      />
      <CrateShowcase />
      <StoreBrowser category="crates" />
    </>
  ),
});
