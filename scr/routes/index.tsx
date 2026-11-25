import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  ArrowRight,
  Gift,
  Heart,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CopyIp,
  copyAddress,
} from "@/components/site/ServerStatus";
import { ProductGrid } from "@/components/site/ProductCard";
import { Reveal, SectionTitle } from "@/components/site/Reveal";
import { MagneticButton } from "@/components/site/MagneticButton";
import { useGsapTilt } from "@/hooks/use-gsap-tilt";
import { gsap, useGSAP } from "@/lib/gsap";
import {
  activeProducts,
  categories,
  isOnSale,
  productFromRecord,
  type Product,
} from "@/data/products";
import { faqs } from "@/data/faq";
import { seo } from "@/lib/seo";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { site } from "@/config/site";

export const Route = createFileRoute("/")({
  head: () =>
    seo(
      "Ranks, Crates & Coins",
      "Enhance your Craft SMP adventure with exclusive ranks, crate keys, coins and cosmetics.",
    ),
  component: Index,
});

const blocks = [
  { c: "bg-primary", s: "size-10", p: "left-[6%] top-[18%]" },
  { c: "bg-lilac", s: "size-6", p: "left-[42%] top-[10%]" },
  { c: "bg-blush", s: "size-8", p: "left-[12%] bottom-[14%]" },
  { c: "bg-sky", s: "size-5", p: "right-[8%] top-[12%]" },
];

function Index() {
  const heroRef = useRef<HTMLElement>(null);
  const [all, setAll] = useState<Product[]>(() =>
    isSupabaseConfigured ? [] : activeProducts(),
  );
  const [catalogLoading, setCatalogLoading] = useState(isSupabaseConfigured);
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;
    void supabase
      .from("products")
      .select("*")
      .eq("enabled", true)
      .then(
        ({ data, error }) => {
          if (!active) return;
          if (error) {
            setCatalogError(
              `Featured products could not be loaded: ${error.message}`,
            );
            setAll([]);
          } else {
            setAll((data ?? []).map((record) => productFromRecord(record)));
          }
          setCatalogLoading(false);
        },
        (error: unknown) => {
          if (!active) return;
          setCatalogError(
            error instanceof Error
              ? `Featured products could not be loaded: ${error.message}`
              : "Featured products could not be loaded.",
          );
          setAll([]);
          setCatalogLoading(false);
        },
      );
    return () => {
      active = false;
    };
  }, []);

  const featured = all.filter((p) => p.featured).slice(0, 6);
  const ranks = all.filter((p) => p.category === "ranks").slice(0, 4);
  const crates = all.filter((p) => p.category === "crates" && p.featured);
  const coins = all.filter((p) => p.category === "coins" && p.featured);
  const offers = all.filter(isOnSale).slice(0, 4);

  useGSAP(
    () => {
      const hero = heroRef.current;
      if (!hero) return;

      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const intro = gsap.timeline({
          defaults: { ease: "power3.out" },
          delay: 0.1,
        });

        intro
          .from(".hero-eyebrow", { autoAlpha: 0, y: 16, duration: 0.55 })
          .from(
            ".hero-title-line",
            { autoAlpha: 0, y: 30, stagger: 0.12, duration: 0.7 },
            "-=0.25",
          )
          .from(
            ".hero-copy-text",
            { autoAlpha: 0, y: 18, duration: 0.6 },
            "-=0.3",
          )
          .from(
            ".hero-actions",
            { autoAlpha: 0, y: 16, duration: 0.55 },
            "-=0.25",
          )
          .from(
            ".hero-ip",
            { autoAlpha: 0, y: 12, duration: 0.5 },
            "-=0.25",
          )
          .from(
            ".hero-art",
            { autoAlpha: 0, scale: 0.94, duration: 0.9 },
            "-=0.7",
          )
          .from(
            ".hero-cube",
            {
              autoAlpha: 0,
              z: -55,
              rotationX: -32,
              stagger: 0.12,
              duration: 0.7,
            },
            "-=0.65",
          );

        gsap.to(".hero-cube", {
          y: -12,
          rotationX: 10,
          rotationY: 12,
          duration: 3.4,
          stagger: 0.3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 0.9,
        });
        gsap.to(".hero-glow", {
          scale: 1.08,
          opacity: 0.7,
          duration: 4.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });

      return () => media.revert();
    },
    { scope: heroRef },
  );

  return (
    <>
      {/* Hero */}
      <section
        ref={heroRef}
        className="home-hero relative overflow-hidden bg-soft pixel-grid"
      >
        {blocks.map((b, i) => (
          <span
            key={i}
            aria-hidden
            className={`hero-cube absolute ${b.p} ${b.s} ${b.c} rounded-md opacity-70 shadow-soft`}
          />
        ))}
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2">
          <div className="hero-copy">
            <span className="hero-eyebrow glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium">
              <Sparkles className="size-4 text-ink" /> Survival · Economy ·
              Community
            </span>
            <h1 className="hero-title mt-5 text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
              <span className="hero-title-line block">YOUR ADVENTURE.</span>
              <span className="hero-title-line text-gradient">
                YOUR LEGACY.
              </span>
            </h1>
            <p className="hero-copy-text mt-6 max-w-lg text-lg text-muted-foreground">
              Enhance your journey on Craft SMP with exclusive ranks, amazing
              perks, exciting crate keys, and rewards made for true Minecraft
              adventurers.
            </p>
            <div className="hero-actions mt-8 flex flex-wrap gap-3">
              <MagneticButton asChild variant="hero" size="lg">
                <Link to="/store">
                  Explore Store <ArrowRight />
                </Link>
              </MagneticButton>
              <MagneticButton
                variant="glass"
                size="lg"
                onClick={copyAddress}
              >
                Join Craft SMP
              </MagneticButton>
            </div>
            <div className="hero-ip mt-6">
              <CopyIp />
            </div>
          </div>
          <div
            className="hero-tilt relative"
            onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
              if (event.pointerType !== "mouse") return;
              const bounds = event.currentTarget.getBoundingClientRect();
              const x = (event.clientX - bounds.left) / bounds.width - 0.5;
              const y = (event.clientY - bounds.top) / bounds.height - 0.5;
              event.currentTarget.style.setProperty("--tilt-x", `${y * -8}deg`);
              event.currentTarget.style.setProperty("--tilt-y", `${x * 10}deg`);
              event.currentTarget.style.setProperty(
                "--pointer-x",
                `${(x + 0.5) * 100}%`,
              );
              event.currentTarget.style.setProperty(
                "--pointer-y",
                `${(y + 0.5) * 100}%`,
              );
            }}
            onPointerLeave={(event: PointerEvent<HTMLDivElement>) => {
              event.currentTarget.style.setProperty("--tilt-x", "0deg");
              event.currentTarget.style.setProperty("--tilt-y", "0deg");
              event.currentTarget.style.setProperty("--pointer-x", "50%");
              event.currentTarget.style.setProperty("--pointer-y", "50%");
            }}
          >
            <div
              className="hero-glow absolute -inset-6 rounded-[2.5rem] bg-brand opacity-50 blur-3xl animate-gradient"
              aria-hidden
            />
            <img
              src="/craft-smp-emblem.png"
              alt="Craft SMP floating island emblem"
              width={1151}
              height={768}
              className="hero-art"
              decoding="async"
              fetchPriority="high"
            />
          </div>
        </div>
        <div className="h-16" />
      </section>

      {/* Stats bar */}
      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4">
          {[
            [Trophy, "Active community", "Daily players"],
            [ShieldCheck, "Fair play", "Balanced survival"],
            [Zap, "Lag-free", "Tuned performance"],
            [Gift, "Weekly events", "Drops & giveaways"],
          ].map(([Icon, t, d], i) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <Reveal key={t as string} delay={i * 60}>
                <div className="flex items-center gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand">
                    <I className="size-5" />
                  </div>
                  <div>
                    <p className="font-display text-lg">{t as string}</p>
                    <p className="text-xs text-muted-foreground">{d as string}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <SectionTitle
          eyebrow="Shop by category"
          title="Everything for your journey"
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {categories.map((category, index) => (
            <CategoryCard
              key={category.id}
              category={category}
              index={index}
            />
          ))}
        </div>
      </section>

      {(catalogLoading || catalogError) && (
        <div className="mx-auto max-w-7xl px-4 pt-10">
          {catalogLoading && (
            <p role="status" className="text-sm text-muted-foreground">
              Loading featured products…
            </p>
          )}
          {catalogError && (
            <p
              role="alert"
              className="rounded-xl border border-destructive p-4 text-sm text-destructive"
            >
              {catalogError}
            </p>
          )}
        </div>
      )}
      {featured.length > 0 && (
        <Block
          eyebrow="Hand-picked"
          title="Featured items"
          to="/store"
          products={featured}
        />
      )}
      {ranks.length > 0 && (
        <Block
          eyebrow="Prestige"
          title="Popular ranks"
          to="/ranks"
          products={ranks}
        />
      )}
      {crates.length > 0 && (
        <Block
          eyebrow="Loot"
          title="Featured crates"
          to="/crates"
          products={crates}
        />
      )}
      {coins.length > 0 && (
        <Block
          eyebrow="Economy"
          title="Coin packages"
          to="/coins"
          products={coins}
        />
      )}
      {offers.length > 0 && (
        <Block
          eyebrow="Limited time"
          title="Special offers"
          to="/offers"
          products={offers}
        />
      )}

      {/* Why */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionTitle
          eyebrow="Why Craft SMP?"
          title="A world worth building in"
        />
        <div className="grid gap-5 md:grid-cols-4">
          {[
            [
              ShieldCheck,
              "Fair play",
              "Perks that enhance — never break — survival balance.",
            ],
            [Zap, "Lag-free", "Tuned performance so your builds run smooth."],
            [
              Heart,
              "Friendly community",
              "Active staff and a welcoming player base.",
            ],
            [Gift, "Regular events", "Seasonal events, drops and giveaways."],
          ].map(([Icon, t, d], i) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <Reveal key={t as string} delay={i * 80}>
                <div className="feature-card h-full rounded-2xl border bg-card p-6 shadow-soft">
                  <div className="feature-card-icon mb-4 grid size-12 place-items-center rounded-xl bg-brand">
                    <I className="size-6" />
                  </div>
                  <h3 className="text-lg">{t as string}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {d as string}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* How */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <SectionTitle eyebrow="Simple as 1-2-3" title="How to purchase" />
        <ol className="grid gap-5 md:grid-cols-3">
          {[
            "Pick your items and add them to your cart.",
            "Enter your exact Minecraft username at checkout.",
            "Rewards are queued after the order is marked paid.",
          ].map((s, i) => (
            <Reveal key={s} delay={i * 100}>
              <li className="glass h-full rounded-2xl p-6 shadow-soft">
                <span className="font-display text-4xl text-gradient">
                  0{i + 1}
                </span>
                <p className="mt-2">{s}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Community */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <Reveal>
          <div className="community-card relative overflow-hidden rounded-[2rem] bg-brand animate-gradient p-10 text-center shadow-glow md:p-16">
            <MessageCircle className="mx-auto size-12" />
            <h2 className="mt-4 text-3xl md:text-5xl">Join the community</h2>
            <p className="mx-auto mt-3 max-w-lg">
              Chat with players, get event updates and find your next build
              buddy.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild variant="glass" size="lg">
                <Link to="/community">Community hub</Link>
              </Button>
              <Button variant="glass" size="lg" onClick={copyAddress}>
                Copy server IP
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Server chat teaser */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <Reveal>
          <div className="chat-teaser-card relative overflow-hidden rounded-[2rem] border bg-card p-10 shadow-glow md:p-14">
            <div
              className="absolute -right-20 -top-20 size-64 rounded-full bg-brand opacity-30 blur-3xl"
              aria-hidden
            />
            <div className="relative grid items-center gap-8 lg:grid-cols-2">
              <div>
                <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium">
                  <MessageCircle className="size-4 text-ink" /> Craft SMP
                  community
                </span>
                <h2 className="mt-4 text-3xl md:text-4xl">
                  Join the conversation{" "}
                  <span className="text-gradient">in-game</span>
                </h2>
                <p className="mt-3 max-w-lg text-muted-foreground">
                  Meet other players and chat while you build, explore, and play.
                  Server chat is available in Minecraft after you connect.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <MagneticButton asChild variant="hero" size="lg">
                    <Link to="/chat">
                      Server chat details <ArrowRight />
                    </Link>
                  </MagneticButton>
                  <Button variant="glass" size="lg" onClick={copyAddress}>
                    Copy server address
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div
                  className="absolute -inset-4 rounded-[2rem] bg-lilac opacity-40 blur-3xl animate-gradient"
                  aria-hidden
                />
                <div className="chat-panel relative overflow-hidden rounded-[2rem] border-4 border-card bg-card p-6 shadow-glow sm:p-8">
                  <div className="flex items-center justify-between gap-3 border-b pb-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 place-items-center rounded-xl bg-brand">
                        <MessageCircle className="size-5" />
                      </div>
                      <div>
                        <p className="font-display text-lg">Server chat</p>
                        <p className="text-xs text-muted-foreground">
                          Available in Minecraft
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                      In-game
                    </span>
                  </div>
                  <div className="mt-5 rounded-2xl bg-soft p-5">
                    <p className="text-sm font-semibold">Ready to say hello?</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Join with{" "}
                      <span className="font-mono text-foreground">
                        {site.serverAddress}
                      </span>{" "}
                      and open Minecraft chat to talk with players.
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="size-4 text-ink" />
                    Keep chat friendly and follow server rules.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <SectionTitle eyebrow="Questions?" title="Frequently asked" />
        <Accordion
          type="single"
          collapsible
          className="rounded-2xl border bg-card px-5 shadow-soft"
        >
          {faqs.slice(0, 5).map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left font-semibold">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mt-6 text-center">
          <Button asChild variant="link">
            <Link to="/faq">See all FAQs</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function CategoryCard({
  category,
  index,
}: {
  category: (typeof categories)[number];
  index: number;
}) {
  const cardRef = useGsapTilt<HTMLAnchorElement>();

  return (
    <Reveal delay={index * 70}>
      <Link
        ref={cardRef}
        to={category.path}
        className="category-card group flex flex-col items-center rounded-2xl border bg-card p-5 text-center shadow-soft hover:shadow-glow"
      >
        <img
          src={category.image}
          alt=""
          loading="lazy"
          className="category-art size-20 object-contain transition group-hover:scale-110"
        />
        <h3 className="mt-3 text-lg">{category.label}</h3>
        <p className="text-xs text-muted-foreground">{category.blurb}</p>
      </Link>
    </Reveal>
  );
}

function Block({
  eyebrow,
  title,
  to,
  products,
}: {
  eyebrow: string;
  title: string;
  to: "/store" | "/ranks" | "/crates" | "/coins" | "/offers";
  products: ReturnType<typeof activeProducts>;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-ink">
            {eyebrow}
          </p>
          <h2 className="text-3xl md:text-4xl">{title}</h2>
        </div>
        <Button asChild variant="soft">
          <Link to={to}>
            View all <ArrowRight />
          </Link>
        </Button>
      </div>
      <Reveal>
        <ProductGrid products={products} />
      </Reveal>
    </section>
  );
}
