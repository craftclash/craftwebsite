import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

export function useGsapTilt<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useGSAP(
    () => {
      const element = ref.current;
      if (!element) return;

      const media = gsap.matchMedia();
      media.add(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap.set(element, {
            transformPerspective: 1000,
            transformStyle: "preserve-3d",
          });

          const rotateX = gsap.quickTo(element, "rotationX", {
            duration: 0.45,
            ease: "power3.out",
          });
          const rotateY = gsap.quickTo(element, "rotationY", {
            duration: 0.45,
            ease: "power3.out",
          });
          const depth = gsap.quickTo(element, "z", {
            duration: 0.45,
            ease: "power3.out",
          });
          const handleMove = (event: PointerEvent) => {
            if (event.pointerType !== "mouse") return;
            const bounds = element.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / bounds.width;
            const y = (event.clientY - bounds.top) / bounds.height;
            rotateX((0.5 - y) * 8);
            rotateY((x - 0.5) * 10);
            depth(8);
          };
          const handleLeave = () => {
            rotateX(0);
            rotateY(0);
            depth(0);
          };

          element.addEventListener("pointermove", handleMove);
          element.addEventListener("pointerleave", handleLeave);

          return () => {
            element.removeEventListener("pointermove", handleMove);
            element.removeEventListener("pointerleave", handleLeave);
          };
        },
      );

      return () => media.revert();
    },
    { scope: ref },
  );

  return ref;
}
