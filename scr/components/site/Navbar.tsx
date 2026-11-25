import { Link } from "@tanstack/react-router";
import { Menu, MessageCircle, ShoppingCart, User, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/site/MagneticButton";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { gsap, useGSAP } from "@/lib/gsap";

export const navLinks = [
  { to: "/", label: "Home" },
  { to: "/store", label: "Store" },
  { to: "/ranks", label: "Ranks" },
  { to: "/crates", label: "Crates" },
  { to: "/coins", label: "Coins" },
  { to: "/chat", label: "Server Chat" },
  { to: "/community", label: "Community" },
  { to: "/vote", label: "Vote" },
  { to: "/support", label: "Support" },
] as const;

export function Logo() {
  return (
    <Link
      to="/"
      className="flex shrink-0 items-center"
      aria-label="Craft SMP home"
    >
      <img
        src="/craftlogo.webp"
        alt="Craft SMP"
        className="h-12 w-[110px] object-contain sm:w-[120px]"
      />
    </Link>
  );
}

export function Navbar() {
  const { count, setOpen } = useCart();
  const { session, loading } = useAuth();
  const [mobile, setMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!mobile || !menuRef.current) return;

      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const menu = menuRef.current;
        if (!menu) return;

        const timeline = gsap.timeline({
          defaults: { ease: "power2.out" },
        });
        timeline
          .fromTo(
            menu,
            { autoAlpha: 0, height: 0 },
            {
              autoAlpha: 1,
              height: "auto",
              duration: 0.32,
              clearProps: "height",
            },
          )
          .from(
            menu.querySelectorAll("li"),
            {
              autoAlpha: 0,
              y: -8,
              duration: 0.24,
              stagger: 0.035,
              clearProps: "transform,opacity,visibility",
            },
            "-=0.16",
          );
      });

      return () => media.revert();
    },
    { scope: menuRef, dependencies: [mobile], revertOnUpdate: true },
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/75 backdrop-blur-xl">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4"
        aria-label="Main"
      >
        <Logo />
        <ul className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                className="nav-link rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          {!loading && session && (
            <Button
              variant="glass"
              size="icon"
              className="relative"
              onClick={() => setOpen(true)}
              aria-label={`Open cart, ${count} items`}
            >
              <ShoppingCart />
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-blush px-1 text-xs font-bold">
                  {count}
                </span>
              )}
            </Button>
          )}
          <MagneticButton
            asChild
            variant="glass"
            className="hidden sm:inline-flex"
          >
            <Link to="/chat">
              <MessageCircle /> Server chat
            </Link>
          </MagneticButton>
          <MagneticButton
            asChild
            variant="hero"
            className="hidden sm:inline-flex"
          >
            <Link to="/account">
              <User /> Account
            </Link>
          </MagneticButton>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobile((m) => !m)}
            aria-label="Toggle menu"
            aria-expanded={mobile}
          >
            {mobile ? <X /> : <Menu />}
          </Button>
        </div>
      </nav>
      {mobile && (
        <div ref={menuRef} className="border-t bg-background lg:hidden">
          <ul className="mx-auto flex max-w-7xl flex-col p-3">
            {[...navLinks, { to: "/account", label: "Account" } as const].map(
              (l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    onClick={() => setMobile(false)}
                    className="block rounded-lg px-3 py-2.5 font-medium hover:bg-accent"
                  >
                    {l.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
