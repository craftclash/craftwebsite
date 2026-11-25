import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { gsap, useGSAP } from "@/lib/gsap";

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const element = ref.current;
      if (!element) return;

      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          element,
          { autoAlpha: 0, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            clearProps: "transform,opacity,visibility",
            delay: delay / 1000,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 88%",
              once: true,
            },
          },
        );
      });

      return () => media.revert();
    },
    { scope: ref, dependencies: [delay], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={cn("gsap-reveal", className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string | undefined }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      {eyebrow && <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-ink">{eyebrow}</p>}
      <h2 className="text-3xl md:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function PageHeader({ title, sub }: { title: string; sub?: string | undefined }) {
  return (
    <section className="relative overflow-hidden bg-soft pixel-grid">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-20 text-center">
        <h1 className="text-4xl md:text-5xl text-gradient">{title}</h1>
        {sub && <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{sub}</p>}
      </div>
    </section>
  );
}
