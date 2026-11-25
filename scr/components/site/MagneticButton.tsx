import { useRef, type PointerEvent, type ReactNode } from "react";
import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { gsap, useGSAP } from "@/lib/gsap";

export function MagneticButton({
  children,
  className,
  ...props
}: ButtonProps & { children: ReactNode }) {
  const shellRef = useRef<HTMLSpanElement>(null);
  const xTo = useRef<((value: number) => void) | null>(null);
  const yTo = useRef<((value: number) => void) | null>(null);

  useGSAP(
    () => {
      const button =
        shellRef.current?.querySelector<HTMLElement>(".magnetic-button");
      if (!button) return;

      const media = gsap.matchMedia();
      media.add(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          xTo.current = gsap.quickTo(button, "x", {
            duration: 0.35,
            ease: "power3.out",
          });
          yTo.current = gsap.quickTo(button, "y", {
            duration: 0.35,
            ease: "power3.out",
          });

          return () => {
            xTo.current = null;
            yTo.current = null;
          };
        },
      );

      return () => media.revert();
    },
    { scope: shellRef },
  );

  const handleMove = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType !== "mouse" || !xTo.current || !yTo.current) return;
    const button =
      event.currentTarget.querySelector<HTMLElement>(".magnetic-button");
    if (!button) return;

    const bounds = button.getBoundingClientRect();
    xTo.current((event.clientX - bounds.left - bounds.width / 2) * 0.18);
    yTo.current((event.clientY - bounds.top - bounds.height / 2) * 0.18);
  };

  const handleLeave = () => {
    xTo.current?.(0);
    yTo.current?.(0);
  };

  return (
    <span
      ref={shellRef}
      className="magnetic-shell"
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <Button {...props} className={cn("magnetic-button", className)}>
        {children}
      </Button>
    </span>
  );
}
